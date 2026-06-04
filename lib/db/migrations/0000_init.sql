CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'director' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_code" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"location" text,
	"status" text DEFAULT 'New' NOT NULL,
	"notes" text,
	"first_visit_date" text,
	"created_by" text,
	"last_edited_by" text,
	"last_edited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_client_code_unique" UNIQUE("client_code")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"client_name" text NOT NULL,
	"date" text NOT NULL,
	"service_type" text NOT NULL,
	"description" text,
	"location" text,
	"items" jsonb,
	"amount" numeric(12, 2) NOT NULL,
	"team_members" integer DEFAULT 1 NOT NULL,
	"wages" numeric(12, 2) NOT NULL,
	"net_income" numeric(12, 2) NOT NULL,
	"notes" text,
	"created_by" text,
	"last_edited_by" text,
	"last_edited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"created_by" text,
	"last_edited_by" text,
	"last_edited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_number" text NOT NULL,
	"job_id" integer,
	"client_name" text NOT NULL,
	"service_type" text NOT NULL,
	"description" text,
	"items" jsonb,
	"amount" numeric(12, 2) NOT NULL,
	"date" text NOT NULL,
	"payment_status" text DEFAULT 'Pending' NOT NULL,
	"notes" text,
	"created_by" text,
	"last_edited_by" text,
	"last_edited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"username" text NOT NULL,
	"action" text NOT NULL,
	"record_type" text NOT NULL,
	"record_id" integer,
	"details" text NOT NULL
);
