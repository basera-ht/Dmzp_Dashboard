CREATE TYPE "public"."event_status" AS ENUM('Upcoming', 'Ongoing', 'Completed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('Active', 'Pending', 'Inactive');--> statement-breakpoint
CREATE TYPE "public"."member_type" AS ENUM('Student', 'Professional', 'Organization');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('Ready', 'Processing', 'Failed');--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"region" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"date" timestamp NOT NULL,
	"time" varchar(50) NOT NULL,
	"location" varchar(255) NOT NULL,
	"chapter_id" integer,
	"attendees" integer DEFAULT 0 NOT NULL,
	"event_status" "event_status" DEFAULT 'Upcoming' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"chapter_id" integer,
	"join_date" timestamp DEFAULT now() NOT NULL,
	"member_type" "member_type" NOT NULL,
	"member_status" "member_status" DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"report_type" varchar(255) NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"report_status" "report_status" DEFAULT 'Processing' NOT NULL,
	"file_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"email_notifications" integer DEFAULT 1,
	"new_member_alerts" integer DEFAULT 1,
	"weekly_reports" integer DEFAULT 0,
	"chapter_activity_updates" integer DEFAULT 1,
	"language" varchar(50) DEFAULT 'English',
	"timezone" varchar(50) DEFAULT 'IST',
	"date_format" varchar(50) DEFAULT 'DD/MM/YYYY',
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'Admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;