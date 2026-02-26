CREATE TABLE IF NOT EXISTS "daily_menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_name" varchar(50) NOT NULL,
	"portion_size" varchar(20) NOT NULL,
	"calories" numeric(8, 2) DEFAULT '0' NOT NULL,
	"protein" numeric(8, 2) DEFAULT '0' NOT NULL,
	"carbohydrates" numeric(8, 2) DEFAULT '0' NOT NULL,
	"fat" numeric(8, 2) DEFAULT '0' NOT NULL,
	"fiber" numeric(8, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "detection_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"detection_id" integer NOT NULL,
	"food_nutrition_id" integer,
	"food_name" varchar(100) NOT NULL,
	"confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"estimated_weight_gram" numeric(8, 2) DEFAULT '100' NOT NULL,
	"calories" numeric(8, 2) DEFAULT '0' NOT NULL,
	"protein" numeric(8, 2) DEFAULT '0' NOT NULL,
	"carbohydrates" numeric(8, 2) DEFAULT '0' NOT NULL,
	"fat" numeric(8, 2) DEFAULT '0' NOT NULL,
	"fiber" numeric(8, 2) DEFAULT '0' NOT NULL,
	"bbox_x1" numeric(8, 2),
	"bbox_y1" numeric(8, 2),
	"bbox_x2" numeric(8, 2),
	"bbox_y2" numeric(8, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "detections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"image_url" text,
	"annotated_image_url" text,
	"foodtray_count" integer DEFAULT 0 NOT NULL,
	"menu_count" integer DEFAULT 0 NOT NULL,
	"total_calories" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_protein" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_carbohydrates" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_fat" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_fiber" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "food_nutrition" (
	"id" serial PRIMARY KEY NOT NULL,
	"food_name" varchar(100) NOT NULL,
	"calories" numeric(8, 2) DEFAULT '0' NOT NULL,
	"protein" numeric(8, 2) DEFAULT '0' NOT NULL,
	"carbohydrates" numeric(8, 2) DEFAULT '0' NOT NULL,
	"fat" numeric(8, 2) DEFAULT '0' NOT NULL,
	"fiber" numeric(8, 2) DEFAULT '0' NOT NULL,
	"sugar" numeric(8, 2) DEFAULT '0' NOT NULL,
	"sodium" numeric(8, 2) DEFAULT '0' NOT NULL,
	"reference_weight_gram" numeric(8, 2) DEFAULT '100' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "food_nutrition_food_name_unique" UNIQUE("food_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"password" text NOT NULL,
	"full_name" varchar(100) NOT NULL,
	"role" varchar(20) DEFAULT 'staff' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "detection_items" ADD CONSTRAINT "detection_items_detection_id_detections_id_fk" FOREIGN KEY ("detection_id") REFERENCES "public"."detections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "detection_items" ADD CONSTRAINT "detection_items_food_nutrition_id_food_nutrition_id_fk" FOREIGN KEY ("food_nutrition_id") REFERENCES "public"."food_nutrition"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "detections" ADD CONSTRAINT "detections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
