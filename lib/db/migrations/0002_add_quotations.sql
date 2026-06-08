CREATE TABLE "quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_number" text NOT NULL,
	"client_name" text NOT NULL,
	"location" text,
	"date" text NOT NULL,
	"expiry_date" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"items" jsonb NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotations_quotation_number_unique" UNIQUE("quotation_number")
);
