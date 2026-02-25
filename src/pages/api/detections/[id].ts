import type { APIRoute } from 'astro';
import { getSessionFromRequest } from '../../../lib/auth';
import { db } from '../../../db/db';
import { detections, detectionItems } from '../../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/detections/[id]
 */
export const GET: APIRoute = async ({ request, params }) => {
  const session = getSessionFromRequest(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const id = parseInt(params.id ?? '0');
  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const [detection] = await db
    .select()
    .from(detections)
    .where(eq(detections.id, id))
    .limit(1);

  if (!detection) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const items = await db
    .select()
    .from(detectionItems)
    .where(eq(detectionItems.detectionId, id));

  return new Response(JSON.stringify({ detection, items }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

/**
 * DELETE /api/detections/[id]
 */
export const DELETE: APIRoute = async ({ request, params }) => {
  const session = getSessionFromRequest(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const id = parseInt(params.id ?? '0');
  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  await db.delete(detections).where(eq(detections.id, id));

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
