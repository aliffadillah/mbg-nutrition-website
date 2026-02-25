import type { APIRoute } from 'astro';
import { getSessionFromRequest } from '../../../lib/auth';
import { db } from '../../../db/db';
import { foodNutrition } from '../../../db/schema';
import { asc, ilike, sql } from 'drizzle-orm';

/**
 * GET /api/nutrition — list all food nutrition records
 */
export const GET: APIRoute = async ({ request }) => {
  const session = getSessionFromRequest(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get('search') ?? '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '50'));
  const offset = (page - 1) * limit;

  const whereClause = search ? ilike(foodNutrition.foodName, `%${search}%`) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(foodNutrition)
      .where(whereClause)
      .orderBy(asc(foodNutrition.foodName))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(foodNutrition)
      .where(whereClause),
  ]);

  return new Response(
    JSON.stringify({
      data: rows,
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.count ?? 0),
        totalPages: Math.ceil(Number(countResult[0]?.count ?? 0) / limit),
      },
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};

/**
 * POST /api/nutrition — create a new food nutrition record
 */
export const POST: APIRoute = async ({ request }) => {
  const session = getSessionFromRequest(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await request.json();
    const {
      foodName,
      calories = 0,
      protein = 0,
      carbohydrates = 0,
      fat = 0,
      fiber = 0,
      sugar = 0,
      sodium = 0,
      referenceWeightGram = 100,
    } = body;

    if (!foodName) {
      return new Response(JSON.stringify({ error: 'foodName is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const [created] = await db
      .insert(foodNutrition)
      .values({
        foodName,
        calories: String(calories),
        protein: String(protein),
        carbohydrates: String(carbohydrates),
        fat: String(fat),
        fiber: String(fiber),
        sugar: String(sugar),
        sodium: String(sodium),
        referenceWeightGram: String(referenceWeightGram),
      })
      .returning();

    return new Response(JSON.stringify({ success: true, data: created }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Nutrition POST error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
