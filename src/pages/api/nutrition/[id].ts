import type { APIRoute } from 'astro';
import { getSessionFromRequest } from '../../../lib/auth';
import { db } from '../../../db/db';
import { foodNutrition } from '../../../db/schema';
import { eq } from 'drizzle-orm';

/** GET /api/nutrition/[id] */
export const GET: APIRoute = async ({ request, params }) => {
  const session = getSessionFromRequest(request);
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const id = parseInt(params.id ?? '0');
  const [row] = await db.select().from(foodNutrition).where(eq(foodNutrition.id, id)).limit(1);

  if (!row) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  return new Response(JSON.stringify(row), { headers: { 'Content-Type': 'application/json' } });
};

/** PUT /api/nutrition/[id] */
export const PUT: APIRoute = async ({ request, params }) => {
  const session = getSessionFromRequest(request);
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const id = parseInt(params.id ?? '0');

  try {
    const body = await request.json();
    const {
      foodName,
      calories,
      protein,
      carbohydrates,
      fat,
      fiber,
      sugar,
      sodium,
      referenceWeightGram,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (foodName !== undefined) updateData.foodName = foodName;
    if (calories !== undefined) updateData.calories = String(calories);
    if (protein !== undefined) updateData.protein = String(protein);
    if (carbohydrates !== undefined) updateData.carbohydrates = String(carbohydrates);
    if (fat !== undefined) updateData.fat = String(fat);
    if (fiber !== undefined) updateData.fiber = String(fiber);
    if (sugar !== undefined) updateData.sugar = String(sugar);
    if (sodium !== undefined) updateData.sodium = String(sodium);
    if (referenceWeightGram !== undefined) updateData.referenceWeightGram = String(referenceWeightGram);
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(foodNutrition)
      .set(updateData)
      .where(eq(foodNutrition.id, id))
      .returning();

    if (!updated) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

    return new Response(JSON.stringify({ success: true, data: updated }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

/** DELETE /api/nutrition/[id] */
export const DELETE: APIRoute = async ({ request, params }) => {
  const session = getSessionFromRequest(request);
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const id = parseInt(params.id ?? '0');
  await db.delete(foodNutrition).where(eq(foodNutrition.id, id));

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
