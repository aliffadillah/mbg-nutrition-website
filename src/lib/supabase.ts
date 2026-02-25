import { createClient } from '@supabase/supabase-js';

const BUCKET = 'detection_menu';

// Baca env vars — coba import.meta.env (Vite/Astro dev) lalu process.env (node production)
function getEnv(key: string): string {
  return (import.meta.env as Record<string, string | undefined>)[key]
    ?? process.env[key]
    ?? '';
}

// Public client — untuk akses data umum (anon)
export const supabase = createClient(
  getEnv('SUPABASE_URL'),
  getEnv('SUPABASE_ANON_KEY')
);

/**
 * Buat admin client on-demand menggunakan service_role key.
 * Lazy init agar env vars sudah tersedia saat runtime.
 */
function getAdminClient() {
  const url = getEnv('SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceKey) {
    console.error(
      '[supabase] SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diset di .env'
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Upload file (Blob) ke bucket detection_menu menggunakan service_role key (bypass RLS).
 * Returns public URL, atau null jika gagal.
 */
export async function uploadToStorage(
  path: string,
  file: Blob,
  contentType = 'image/jpeg'
): Promise<string | null> {
  const admin = getAdminClient();

  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  const { data, error } = await admin.storage.from(BUCKET).upload(path, uint8, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.error('Supabase storage upload error:', error.message);
    return null;
  }

  const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(data.path);
  return publicData.publicUrl;
}

/**
 * Hapus file dari bucket detection_menu.
 */
export async function deleteFromStorage(paths: string[]): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.storage.from(BUCKET).remove(paths);
  if (error) {
    console.error('Supabase storage delete error:', error.message);
  }
}
