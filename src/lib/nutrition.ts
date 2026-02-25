import { db } from '../db/db';
import { foodNutrition } from '../db/schema';
import { eq, ilike } from 'drizzle-orm';
import type { FoodNutrition } from '../db/schema';
import type { DetectionResult } from './api';

export interface NutritionCalculation {
  foodName: string;
  matchedFoodName: string | null;
  foodNutritionId: number | null;
  estimatedWeightGram: number;
  confidence: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
}

export interface TotalNutrition {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
}

/**
 * Estimate weight of a detected food item based on bounding box area.
 * Uses a simple proportional formula: larger bbox → more weight.
 * Reference: a typical food item with area ~40000px² weighs ~150g.
 */
export function estimateWeightFromBbox(bbox: DetectionResult['bbox']): number {
  const area = (bbox.width ?? bbox.x2 - bbox.x1) * (bbox.height ?? bbox.y2 - bbox.y1);
  // Calibration: 40000 px² ≈ 150g
  const BASE_AREA = 40000;
  const BASE_WEIGHT_G = 150;
  const estimatedWeight = (area / BASE_AREA) * BASE_WEIGHT_G;
  return Math.max(10, Math.min(estimatedWeight, 500)); // clamp between 10g and 500g
}

/**
 * Calculate nutrition values proportionally from per-100g values.
 */
export function calcNutrition(
  nutrientPer100g: number,
  estimatedWeightGram: number
): number {
  return parseFloat(((nutrientPer100g * estimatedWeightGram) / 100).toFixed(2));
}

/**
 * Find matching food nutrition record by name (case-insensitive prefix match).
 */
export async function findNutritionByFoodName(
  foodName: string
): Promise<FoodNutrition | null> {
  // Exact match first
  const exact = await db
    .select()
    .from(foodNutrition)
    .where(ilike(foodNutrition.foodName, foodName))
    .limit(1);

  if (exact[0]) return exact[0];

  // Partial match — try normalized class name (replace underscores/dashes)
  const normalized = foodName.replace(/[_-]/g, ' ');
  const partial = await db
    .select()
    .from(foodNutrition)
    .where(ilike(foodNutrition.foodName, `%${normalized}%`))
    .limit(1);

  return partial[0] ?? null;
}

/**
 * Map RT-DETR detection results to nutrition calculations.
 */
export async function mapDetectionsToNutrition(
  detections: DetectionResult[]
): Promise<NutritionCalculation[]> {
  const results: NutritionCalculation[] = [];

  for (const det of detections) {
    const nutritionRecord = await findNutritionByFoodName(det.class);
    const estimatedWeight = estimateWeightFromBbox(det.bbox);

    if (nutritionRecord) {
      const n = nutritionRecord;
      results.push({
        foodName: det.class,
        matchedFoodName: n.foodName,
        foodNutritionId: n.id,
        estimatedWeightGram: Math.round(estimatedWeight),
        confidence: det.confidence,
        calories: calcNutrition(parseFloat(String(n.calories)), estimatedWeight),
        protein: calcNutrition(parseFloat(String(n.protein)), estimatedWeight),
        carbohydrates: calcNutrition(parseFloat(String(n.carbohydrates)), estimatedWeight),
        fat: calcNutrition(parseFloat(String(n.fat)), estimatedWeight),
        fiber: calcNutrition(parseFloat(String(n.fiber)), estimatedWeight),
        bbox: {
          x1: det.bbox.x1,
          y1: det.bbox.y1,
          x2: det.bbox.x2,
          y2: det.bbox.y2,
        },
      });
    } else {
      // No match — include with zeros
      results.push({
        foodName: det.class,
        matchedFoodName: null,
        foodNutritionId: null,
        estimatedWeightGram: Math.round(estimatedWeight),
        confidence: det.confidence,
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        fiber: 0,
        bbox: {
          x1: det.bbox.x1,
          y1: det.bbox.y1,
          x2: det.bbox.x2,
          y2: det.bbox.y2,
        },
      });
    }
  }

  return results;
}

/**
 * Sum nutrition across all calculated items.
 */
export function sumNutrition(items: NutritionCalculation[]): TotalNutrition {
  return items.reduce(
    (acc, item) => ({
      calories: parseFloat((acc.calories + item.calories).toFixed(2)),
      protein: parseFloat((acc.protein + item.protein).toFixed(2)),
      carbohydrates: parseFloat((acc.carbohydrates + item.carbohydrates).toFixed(2)),
      fat: parseFloat((acc.fat + item.fat).toFixed(2)),
      fiber: parseFloat((acc.fiber + item.fiber).toFixed(2)),
    }),
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 }
  );
}
