CREATE TABLE "event_email_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_posters" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"poster_url" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_posters_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "hidden_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hidden_members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "institution" varchar(255);--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "course" varchar(255);--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "blood_group" varchar(20);--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "fees" varchar(20) DEFAULT 'no';--> statement-breakpoint
ALTER TABLE "event_email_logs" ADD CONSTRAINT "event_email_logs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_posters" ADD CONSTRAINT "event_posters_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;