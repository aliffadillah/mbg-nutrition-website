import type { APIRoute } from 'astro';
import { getSessionFromRequest } from '../../../lib/auth';
import { db } from '../../../db/db';
import { detections, detectionItems, foodNutrition, users } from '../../../db/schema';
import { sql, desc } from 'drizzle-orm';

/**
 * GET /api/dashboard/stats
 * Returns summary stats for the dashboard.
 */
export const GET: APIRoute = async ({ request }) => {
  const session = getSessionFromRequest(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const [totalDetections] = await db.select({ count: sql<number>`count(*)` }).from(detections);
  const [totalNutritionRecords] = await db.select({ count: sql<number>`count(*)` }).from(foodNutrition);
  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);

  // Avg daily calories (last 30 days)
  const avgNutrition = await db.execute(sql`
    SELECT 
      ROUND(AVG(total_calories::numeric), 2) as avg_calories,
      ROUND(AVG(total_protein::numeric), 2) as avg_protein,
      ROUND(AVG(total_carbohydrates::numeric), 2) as avg_carbohydrates,
      ROUND(AVG(total_fat::numeric), 2) as avg_fat
    FROM detections
    WHERE detected_at >= NOW() - INTERVAL '30 days'
  `);

  // Daily nutrition chart (last 14 days)
  const dailyChart = await db.execute(sql`
    SELECT 
      DATE(detected_at) as date,
      ROUND(SUM(total_calories::numeric), 2) as total_calories,
      ROUND(SUM(total_protein::numeric), 2) as total_protein,
      ROUND(SUM(total_carbohydrates::numeric), 2) as total_carbohydrates,
      ROUND(SUM(total_fat::numeric), 2) as total_fat,
      COUNT(*) as detection_count
    FROM detections
    WHERE detected_at >= NOW() - INTERVAL '14 days'
    GROUP BY DATE(detected_at)
    ORDER BY date ASC
  `);

  // Recent 5 detections
  const recentDetections = await db
    .select({
      id: detections.id,
      menuCount: detections.menuCount,
      totalCalories: detections.totalCalories,
      detectedAt: detections.detectedAt,
      username: users.username,
    })
    .from(detections)
    .leftJoin(users, sql`detections.user_id = users.id`)
    .orderBy(desc(detections.detectedAt))
    .limit(5);

  return new Response(
    JSON.stringify({
      summary: {
        totalDetections: Number(totalDetections.count),
        totalNutritionRecords: Number(totalNutritionRecords.count),
        totalUsers: Number(totalUsers.count),
        avgCalories: (avgNutrition[0] as Record<string, unknown>)?.avg_calories ?? '0',
        avgProtein: (avgNutrition[0] as Record<string, unknown>)?.avg_protein ?? '0',
      },
      dailyChart: Array.from(dailyChart),
      recentDetections,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
