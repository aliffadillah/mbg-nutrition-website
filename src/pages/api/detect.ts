import type { APIRoute } from 'astro';
import { detectFood, detectFoodPreview } from '../../lib/api';
import { mapDetectionsToNutrition, sumNutrition } from '../../lib/nutrition';
import { getSessionFromRequest } from '../../lib/auth';
import { db } from '../../db/db';
import { detections, detectionItems } from '../../db/schema';
import { uploadToStorage } from '../../lib/supabase';

/**
 * POST /api/detect
 * Accepts multipart/form-data with 'image' field.
 * All detection requests upload images to Supabase and save to DB.
 * Auth is optional: authenticated requests link to user, public ones save with null userId.
 * Query: ?preview=true to return annotated image only (no upload/save).
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const wantPreview = url.searchParams.get('preview') === 'true';

    const formData = await request.formData();
    const imageFile = formData.get('image');

    if (!imageFile || !(imageFile instanceof Blob)) {
      return new Response(JSON.stringify({ success: false, error: 'No image provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return annotated image preview
    if (wantPreview) {
      const previewBlob = await detectFoodPreview(imageFile, 'image.jpg');
      return new Response(previewBlob, {
        headers: { 'Content-Type': 'image/jpeg' },
      });
    }

    // Run detection
    const result = await detectFood(imageFile, 'image.jpg');

    if (!result.success) {
      return new Response(JSON.stringify({ success: false, error: result.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Map to nutrition
    const nutritionItems = await mapDetectionsToNutrition(result.menu.detections);
    const totals = sumNutrition(nutritionItems);

    // Always upload images to Supabase and save to DB (auth optional)
    let savedDetectionId: number | null = null;
    let imageUrl: string | null = null;
    let annotatedImageUrl: string | null = null;

    // Get userId from session if authenticated (null for public / guest)
    const session = getSessionFromRequest(request);
    const userId = session?.userId ?? null;

    // Upload images to Supabase Storage (detection_menu bucket)
    const timestamp = Date.now();
    const folder = userId ? String(userId) : 'public';
    const basePath = `${folder}/${timestamp}`;

    // Upload original image
    try {
      imageUrl = await uploadToStorage(`${basePath}/original.jpg`, imageFile, 'image/jpeg');
    } catch (e) {
      console.error('Failed to upload original image:', e);
    }

    // Get annotated image from Flask API and upload it
    try {
      const annotatedBlob = await detectFoodPreview(imageFile, 'image.jpg');
      annotatedImageUrl = await uploadToStorage(`${basePath}/annotated.jpg`, annotatedBlob, 'image/jpeg');
    } catch (e) {
      console.error('Failed to upload annotated image:', e);
    }

    // Save detection to DB
    const [detection] = await db
      .insert(detections)
      .values({
        userId,
        imageUrl,
        annotatedImageUrl,
        foodtrayCount: result.foodtray.count,
        menuCount: result.menu.count,
        totalCalories: String(totals.calories),
        totalProtein: String(totals.protein),
        totalCarbohydrates: String(totals.carbohydrates),
        totalFat: String(totals.fat),
        totalFiber: String(totals.fiber),
      })
      .returning({ id: detections.id });

    savedDetectionId = detection.id;

    // Insert nutrition items
    if (nutritionItems.length > 0) {
      await db.insert(detectionItems).values(
        nutritionItems.map((item) => ({
          detectionId: detection.id,
          foodNutritionId: item.foodNutritionId,
          foodName: item.foodName,
          confidence: String(item.confidence),
          estimatedWeightGram: String(item.estimatedWeightGram),
          calories: String(item.calories),
          protein: String(item.protein),
          carbohydrates: String(item.carbohydrates),
          fat: String(item.fat),
          fiber: String(item.fiber),
          bboxX1: String(item.bbox.x1),
          bboxY1: String(item.bbox.y1),
          bboxX2: String(item.bbox.x2),
          bboxY2: String(item.bbox.y2),
        }))
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        detection_id: savedDetectionId,
        image_url: imageUrl ?? null,
        annotated_image_url: annotatedImageUrl ?? null,
        image_info: result.image_info,
        foodtray: result.foodtray,
        menu: result.menu,
        summary: result.summary,
        nutrition_items: nutritionItems.map((item) => ({
          food_name: item.foodName,
          matched_food_name: item.matchedFoodName,
          confidence: item.confidence,
          estimated_weight_gram: item.estimatedWeightGram,
          calories: item.calories,
          protein: item.protein,
          carbohydrates: item.carbohydrates,
          fat: item.fat,
          fiber: item.fiber,
        })),
        nutrition_totals: totals,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Detect API error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * GET /api/detect/preview — proxy preview endpoint
 * Use POST /api/detect?preview=true instead.
 */
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ error: 'Use POST /api/detect?preview=true' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
};
