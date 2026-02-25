import type { APIRoute } from 'astro';
import { getSessionFromRequest } from '../../../lib/auth';
import { db } from '../../../db/db';
import { detections, detectionItems, users } from '../../../db/schema';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';

/**
 * GET /api/detections
 * Query params: page, limit, from (date), to (date)
 */
export const GET: APIRoute = async ({ request }) => {
  const session = getSessionFromRequest(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
  const offset = (page - 1) * limit;
  const fromDate = url.searchParams.get('from');
  const toDate = url.searchParams.get('to');

  const conditions = [];
  if (fromDate) conditions.push(gte(detections.detectedAt, new Date(fromDate)));
  if (toDate) conditions.push(lte(detections.detectedAt, new Date(toDate + 'T23:59:59')));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: detections.id,
        userId: detections.userId,
        username: users.username,
        fullName: users.fullName,
        foodtrayCount: detections.foodtrayCount,
        menuCount: detections.menuCount,
        totalCalories: detections.totalCalories,
        totalProtein: detections.totalProtein,
        totalCarbohydrates: detections.totalCarbohydrates,
        totalFat: detections.totalFat,
        totalFiber: detections.totalFiber,
        notes: detections.notes,
        detectedAt: detections.detectedAt,
      })
      .from(detections)
      .leftJoin(users, eq(detections.userId, users.id))
      .where(whereClause)
      .orderBy(desc(detections.detectedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(detections)
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
