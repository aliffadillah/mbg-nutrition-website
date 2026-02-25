import { pgTable, serial, text, varchar, numeric, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: text('password').notNull(), // bcrypt hash
  fullName: varchar('full_name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('staff'), // admin | staff
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Food Nutrition Master ────────────────────────────────────────────────────
export const foodNutrition = pgTable('food_nutrition', {
  id: serial('id').primaryKey(),
  foodName: varchar('food_name', { length: 100 }).notNull().unique(),
  // Per 100 gram
  calories: numeric('calories', { precision: 8, scale: 2 }).notNull().default('0'),
  protein: numeric('protein', { precision: 8, scale: 2 }).notNull().default('0'),
  carbohydrates: numeric('carbohydrates', { precision: 8, scale: 2 }).notNull().default('0'),
  fat: numeric('fat', { precision: 8, scale: 2 }).notNull().default('0'),
  fiber: numeric('fiber', { precision: 8, scale: 2 }).notNull().default('0'),
  sugar: numeric('sugar', { precision: 8, scale: 2 }).notNull().default('0'),
  sodium: numeric('sodium', { precision: 8, scale: 2 }).notNull().default('0'),
  referenceWeightGram: numeric('reference_weight_gram', { precision: 8, scale: 2 }).notNull().default('100'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Detections ───────────────────────────────────────────────────────────────
export const detections = pgTable('detections', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url'),
  annotatedImageUrl: text('annotated_image_url'),
  foodtrayCount: integer('foodtray_count').notNull().default(0),
  menuCount: integer('menu_count').notNull().default(0),
  totalCalories: numeric('total_calories', { precision: 10, scale: 2 }).notNull().default('0'),
  totalProtein: numeric('total_protein', { precision: 10, scale: 2 }).notNull().default('0'),
  totalCarbohydrates: numeric('total_carbohydrates', { precision: 10, scale: 2 }).notNull().default('0'),
  totalFat: numeric('total_fat', { precision: 10, scale: 2 }).notNull().default('0'),
  totalFiber: numeric('total_fiber', { precision: 10, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  detectedAt: timestamp('detected_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Detection Items ──────────────────────────────────────────────────────────
export const detectionItems = pgTable('detection_items', {
  id: serial('id').primaryKey(),
  detectionId: integer('detection_id').notNull().references(() => detections.id, { onDelete: 'cascade' }),
  foodNutritionId: integer('food_nutrition_id').references(() => foodNutrition.id, { onDelete: 'set null' }),
  foodName: varchar('food_name', { length: 100 }).notNull(),
  confidence: numeric('confidence', { precision: 5, scale: 4 }).notNull().default('0'),
  estimatedWeightGram: numeric('estimated_weight_gram', { precision: 8, scale: 2 }).notNull().default('100'),
  // Calculated nutrition (per estimated weight)
  calories: numeric('calories', { precision: 8, scale: 2 }).notNull().default('0'),
  protein: numeric('protein', { precision: 8, scale: 2 }).notNull().default('0'),
  carbohydrates: numeric('carbohydrates', { precision: 8, scale: 2 }).notNull().default('0'),
  fat: numeric('fat', { precision: 8, scale: 2 }).notNull().default('0'),
  fiber: numeric('fiber', { precision: 8, scale: 2 }).notNull().default('0'),
  bboxX1: numeric('bbox_x1', { precision: 8, scale: 2 }),
  bboxY1: numeric('bbox_y1', { precision: 8, scale: 2 }),
  bboxX2: numeric('bbox_x2', { precision: 8, scale: 2 }),
  bboxY2: numeric('bbox_y2', { precision: 8, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  detections: many(detections),
}));

export const detectionsRelations = relations(detections, ({ one, many }) => ({
  user: one(users, { fields: [detections.userId], references: [users.id] }),
  items: many(detectionItems),
}));

export const detectionItemsRelations = relations(detectionItems, ({ one }) => ({
  detection: one(detections, { fields: [detectionItems.detectionId], references: [detections.id] }),
  foodNutrition: one(foodNutrition, { fields: [detectionItems.foodNutritionId], references: [foodNutrition.id] }),
}));

export const foodNutritionRelations = relations(foodNutrition, ({ many }) => ({
  detectionItems: many(detectionItems),
}));

// ─── Types ────────────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type FoodNutrition = typeof foodNutrition.$inferSelect;
export type NewFoodNutrition = typeof foodNutrition.$inferInsert;
export type Detection = typeof detections.$inferSelect;
export type NewDetection = typeof detections.$inferInsert;
export type DetectionItem = typeof detectionItems.$inferSelect;
export type NewDetectionItem = typeof detectionItems.$inferInsert;
