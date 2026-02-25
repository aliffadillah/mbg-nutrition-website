import type { APIRoute } from 'astro';
import { detectFoodPreview } from '../../../lib/api';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image');

    if (!imageFile || !(imageFile instanceof Blob)) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const previewBlob = await detectFoodPreview(imageFile, 'image.jpg');

    return new Response(previewBlob, {
      headers: { 'Content-Type': 'image/jpeg' },
    });
  } catch (err) {
    console.error('Preview API error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
