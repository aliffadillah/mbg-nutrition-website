/**
 * Database seed script
 * Run: npx tsx scripts/seed.ts
 *
 * Creates:
 * - Default admin user (admin / Password123!)
 * - Food nutrition data from components.json (39 items, per 100g)
 * - Daily menu data from daily_menu.json (10 menus × 2 portions)
 */

import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { users, foodNutrition, dailyMenus } from '../src/db/schema';

const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs') as typeof import('bcryptjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set in .env');
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

// ─── Load JSON data ──────────────────────────────────────────────────────────
function loadJson<T>(relativePath: string): T {
  const filePath = resolve(__dirname, '..', relativePath);
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

interface ComponentNutrition {
  energi: number;
  lemak: number;
  protein: number;
  karbohidrat: number;
  serat: number;
}

interface DailyMenuEntry {
  daftar_menu: string[];
  porsi_besar: ComponentNutrition;
  porsi_kecil: ComponentNutrition;
}

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // ─── 1. Create admin user ─────────────────────────────────────────────────
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash('Password123!', 12);

  await db
    .insert(users)
    .values({
      username: 'admin',
      password: hashedPassword,
      fullName: 'Administrator MBG',
      role: 'admin',
    } as typeof users.$inferInsert)
    .onConflictDoNothing();

  console.log('   ✅ Admin user created\n');

  // ─── 2. Seed food nutrition (components.json) ─────────────────────────────
  console.log('🍽️  Seeding food nutrition data (components.json)...');
  const components = loadJson<Record<string, ComponentNutrition>>('gizi/components.json');

  let nutritionCount = 0;
  for (const [foodName, n] of Object.entries(components)) {
    await db
      .insert(foodNutrition)
      .values({
        foodName,
        calories: String(n.energi),
        protein: String(n.protein),
        carbohydrates: String(n.karbohidrat),
        fat: String(n.lemak),
        fiber: String(n.serat),
        sugar: '0',
        sodium: '0',
        referenceWeightGram: '100',
      } as typeof foodNutrition.$inferInsert)
      .onConflictDoNothing();
    nutritionCount++;
  }

  console.log(`   ✅ ${nutritionCount} food items seeded\n`);

  // ─── 3. Seed daily menus (daily_menu.json) ─────────────────────────────────
  console.log('📋 Seeding daily menu data (daily_menu.json)...');

  // Clear existing daily_menus first
  await db.delete(dailyMenus);
  console.log('   🗑️  Cleared existing daily_menus data');

  const menus = loadJson<Record<string, DailyMenuEntry>>('gizi/daily_menu.json');

  let menuCount = 0;
  for (const [menuName, entry] of Object.entries(menus)) {
    const menuItemsJson = JSON.stringify(entry.daftar_menu);

    for (const portionKey of ['porsi_besar', 'porsi_kecil'] as const) {
      const n = entry[portionKey];
      await db
        .insert(dailyMenus)
        .values({
          menuName,
          menuItems: menuItemsJson,
          portionSize: portionKey,
          calories: String(n.energi),
          protein: String(n.protein),
          carbohydrates: String(n.karbohidrat),
          fat: String(n.lemak),
          fiber: String(n.serat),
        } as typeof dailyMenus.$inferInsert);
      menuCount++;
    }
  }

  console.log(`   ✅ ${menuCount} menu portions seeded\n`);

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('✨ Seed completed successfully!');
  console.log('\nCredentials:');
  console.log('  Username: admin');
  console.log('  Password: Password123!');
  console.log(`\n📊 Data summary:`);
  console.log(`  Food nutrition items: ${nutritionCount}`);
  console.log(`  Daily menu portions:  ${menuCount}`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
