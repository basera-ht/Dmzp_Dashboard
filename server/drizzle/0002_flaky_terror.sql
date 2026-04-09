CREATE TABLE "membership_card_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
