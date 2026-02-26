/**
 * Verify that model class names match food_nutrition in DB.
 * Run: npx tsx scripts/verify.ts
 */
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

// RT-DETR menu.pt class names (from model)
const modelClasses = [
  'Acar Timun Wortel', 'Anggur', 'Apel', 'Ayam Goreng', 'Ayam Serundeng',
  'Bakso Saus BBQ', 'Capcay', 'Chiken Katsu', 'Fla Susu', 'Gudeg',
  'Jagung', 'Jeruk', 'Kacang Merah', 'Keju', 'Kelengkeng',
  'Ketimun dan Selada', 'Kwetiaw', 'Lele Crispy', 'Lontong', 'Mie',
  'Nasi', 'Nasi Daun Jeruk', 'Pepes Tahu', 'Pisang', 'Pisang Lampung',
  'Rolade Asam Manis', 'Roti', 'Salad Buah', 'Sawi', 'Sayur Isi Pepaya',
  'Semur Ayam Kecap', 'Tahu', 'Tahu Crispy', 'Telur', 'Telur Semur',
  'Tempe Goreng', 'Tempe Sagu', 'Tumis Keciwis', 'Tumis Koll Wortel',
];

async function verify() {
  // 1. Check food_nutrition table
  const rows = await db.execute(sql`SELECT food_name, calories, protein, carbohydrates, fat, fiber FROM food_nutrition ORDER BY food_name`);
  const dbNames = new Set((rows as any[]).map((r: any) => r.food_name));

  console.log('═══════════════════════════════════════════════════════');
  console.log('  MODEL ↔ DATABASE MATCHING REPORT');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`Model classes:    ${modelClasses.length}`);
  console.log(`DB food_nutrition: ${dbNames.size}\n`);

  // Check model → DB
  const missingInDb: string[] = [];
  const matched: string[] = [];
  for (const cls of modelClasses) {
    if (dbNames.has(cls)) {
      matched.push(cls);
    } else {
      missingInDb.push(cls);
    }
  }

  // Check DB → model
  const extraInDb: string[] = [];
  for (const name of dbNames) {
    if (!modelClasses.includes(name as string)) {
      extraInDb.push(name as string);
    }
  }

  console.log(`✅ Matched (${matched.length}/${modelClasses.length}):`);
  matched.forEach(n => console.log(`   ✔ ${n}`));

  if (missingInDb.length > 0) {
    console.log(`\n❌ In MODEL but NOT in DB (${missingInDb.length}):`);
    missingInDb.forEach(n => console.log(`   ✘ ${n}`));
  }

  if (extraInDb.length > 0) {
    console.log(`\n⚠️  In DB but NOT in MODEL (${extraInDb.length}):`);
    extraInDb.forEach(n => console.log(`   ⚠ ${n}`));
  }

  // 2. Check daily_menus table
  console.log('\n───────────────────────────────────────────────────────');
  const menus = await db.execute(sql`SELECT menu_name, portion_size, menu_items, calories, protein, carbohydrates, fat, fiber FROM daily_menus ORDER BY menu_name, portion_size`);
  console.log(`\n📋 Daily menus: ${(menus as any[]).length} rows`);
  for (const m of menus as any[]) {
    const items = JSON.parse(m.menu_items);
    console.log(`   ${m.menu_name} (${m.portion_size}): ${m.calories} kkal | Items: ${items.join(', ')}`);
  }

  // 3. Overall result
  console.log('\n═══════════════════════════════════════════════════════');
  if (missingInDb.length === 0 && extraInDb.length === 0) {
    console.log('🎉 RESULT: 100% match — all model classes have nutrition data!');
  } else {
    console.log(`⚠️  RESULT: ${matched.length}/${modelClasses.length} matched`);
  }
  console.log('═══════════════════════════════════════════════════════');

  await client.end();
  process.exit(0);
}

verify().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
