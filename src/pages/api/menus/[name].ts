import type { APIRoute } from 'astro';
import { db } from '../../../db/db';
import { dailyMenus } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { uploadToStorage } from '../../../lib/supabase';

/**
 * PUT /api/menus/:name
 * Updates menu items, nutrition values, and optionally uploads a menu image.
 * Accepts multipart/form-data with:
 *   - menuItems: JSON string array of food names
 *   - porsiBesar: JSON object { calories, protein, carbohydrates, fat, fiber }
 *   - porsiKecil: JSON object { calories, protein, carbohydrates, fat, fiber }
 *   - image: (optional) file upload
 */
export const PUT: APIRoute = async ({ params, request }) => {
  const menuName = decodeURIComponent(params.name ?? '');
  if (!menuName) {
    return new Response(JSON.stringify({ error: 'Menu name is required' }), { status: 400 });
  }

  try {
    const formData = await request.formData();
    const menuItemsRaw = formData.get('menuItems') as string | null;
    const porsiBesarRaw = formData.get('porsiBesar') as string | null;
    const porsiKecilRaw = formData.get('porsiKecil') as string | null;
    const imageFile = formData.get('image') as File | null;

    // Shared updates (menuItems, imageUrl) applied to both rows
    const sharedUpdates: Record<string, unknown> = {};

    // Parse menu items
    if (menuItemsRaw) {
      try {
        const items = JSON.parse(menuItemsRaw);
        if (!Array.isArray(items)) throw new Error('menuItems must be an array');
        sharedUpdates.menuItems = JSON.stringify(items);
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid menuItems format' }), { status: 400 });
      }
    }

    // Upload image if provided
    if (imageFile && imageFile.size > 0) {
      const ext = imageFile.name.split('.').pop() || 'jpg';
      const path = `menus/${menuName.replace(/\s+/g, '_').toLowerCase()}.${ext}`;
      const imageUrl = await uploadToStorage(path, imageFile, imageFile.type || 'image/jpeg');
      if (imageUrl) {
        sharedUpdates.imageUrl = imageUrl;
      }
    }

    // Parse nutrition for porsi_besar
    const nutrientKeys = ['calories', 'protein', 'carbohydrates', 'fat', 'fiber'] as const;

    if (porsiBesarRaw) {
      try {
        const pb = JSON.parse(porsiBesarRaw);
        const besarUpdates: Record<string, unknown> = { ...sharedUpdates };
        for (const k of nutrientKeys) {
          if (pb[k] !== undefined) besarUpdates[k] = String(pb[k]);
        }
        await db
          .update(dailyMenus)
          .set(besarUpdates)
          .where(and(eq(dailyMenus.menuName, menuName), eq(dailyMenus.portionSize, 'porsi_besar')));
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid porsiBesar format' }), { status: 400 });
      }
    }

    // Parse nutrition for porsi_kecil
    if (porsiKecilRaw) {
      try {
        const pk = JSON.parse(porsiKecilRaw);
        const kecilUpdates: Record<string, unknown> = { ...sharedUpdates };
        for (const k of nutrientKeys) {
          if (pk[k] !== undefined) kecilUpdates[k] = String(pk[k]);
        }
        await db
          .update(dailyMenus)
          .set(kecilUpdates)
          .where(and(eq(dailyMenus.menuName, menuName), eq(dailyMenus.portionSize, 'porsi_kecil')));
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid porsiKecil format' }), { status: 400 });
      }
    }

    // If no per-portion data, apply shared updates to all rows
    if (!porsiBesarRaw && !porsiKecilRaw && Object.keys(sharedUpdates).length > 0) {
      await db
        .update(dailyMenus)
        .set(sharedUpdates)
        .where(eq(dailyMenus.menuName, menuName));
    }

    // Fetch updated rows
    const updated = await db
      .select()
      .from(dailyMenus)
      .where(eq(dailyMenus.menuName, menuName));

    return new Response(JSON.stringify({ success: true, updated }), { status: 200 });
  } catch (e) {
    console.error('Menu update error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
