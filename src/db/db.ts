import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL ?? import.meta.env?.DATABASE_URL ?? '';

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Supabase Transaction Pooler: max 1 koneksi per request (mode serverless)
// Session Pooler / Direct: bisa max lebih tinggi
const queryClient = postgres(connectionString, {
  max: 1,
  idle_timeout: 20,         // tutup koneksi idle setelah 20 detik
  connect_timeout: 10,      // gagalkan jika koneksi tidak terbentuk dalam 10 detik
  ssl: connectionString.includes('supabase.com') ? 'require' : false,
  prepare: false, // wajib untuk Supabase Transaction Pooler
});

export const db = drizzle(queryClient, { schema });

export type DB = typeof db;
