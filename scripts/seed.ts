/**
 * Database seed script
 * Run: npx tsx scripts/seed.ts
 *
 * Creates:
 * - Default admin user (admin / Password123!)
 */

import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { createRequire } from 'module';
import { users } from '../src/db/schema';

const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs') as typeof import('bcryptjs');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set in .env');
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // Create admin user
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
  console.log('✨ Seed completed successfully!');
  console.log('\nCredentials:');
  console.log('  Username: admin');
  console.log('  Password: Password123!');
  console.log('\n📝 Data nutrisi dapat ditambahkan melalui dashboard → Data Nutrisi');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
