CREATE TABLE "approval_audit_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" varchar NOT NULL,
	"timesheet_id" varchar,
	"action" varchar(50) NOT NULL,
	"performed_by" text,
	"ip_address" varchar,
	"user_agent" text,
	"notes" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_batches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar,
	"client_name" text NOT NULL,
	"week_start_date" text NOT NULL,
	"approval_token" varchar NOT NULL,
	"approval_token_expiry" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sent_to_email" varchar,
	"sent_at" timestamp,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "approval_batches_approval_token_unique" UNIQUE("approval_token")
);
--> statement-breakpoint
CREATE TABLE "batch_timesheets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" varchar NOT NULL,
	"timesheet_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"name" text NOT NULL,
	"email" varchar NOT NULL,
	"phone" varchar,
	"is_primary" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" varchar NOT NULL,
	"phone" varchar,
	"notes" text,
	"minimum_billable_hours" real DEFAULT 8 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"deleted_by" varchar
);
--> statement-breakpoint
CREATE TABLE "roster_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roster_id" varchar NOT NULL,
	"driver_name" text NOT NULL,
	"driver_email" varchar,
	"driver_phone" varchar,
	"expected_client" text,
	"notes" text,
	"user_id" varchar
);
--> statement-breakpoint
CREATE TABLE "rosters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_start_date" text NOT NULL,
	"file_name" text NOT NULL,
	"uploaded_by" varchar NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"total_entries" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"deleted_at" timestamp,
	"deleted_by" varchar
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_audit_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"user_email" varchar,
	"user_name" text,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar,
	"entity_name" text,
	"changes" jsonb,
	"ip_address" varchar,
	"user_agent" text,
	"notes" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timesheets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"driver_name" text NOT NULL,
	"week_start_date" text NOT NULL,
	"batch_id" varchar,
	"approval_status" varchar(20) DEFAULT 'draft' NOT NULL,
	"client_approved_at" timestamp,
	"client_approved_by" text,
	"client_rating" integer,
	"client_comments" text,
	"client_modifications" jsonb,
	"driver_rating" integer,
	"driver_comments" text,
	"monday_client" text DEFAULT '' NOT NULL,
	"monday_start" text DEFAULT '' NOT NULL,
	"monday_end" text DEFAULT '' NOT NULL,
	"monday_break" text DEFAULT '' NOT NULL,
	"monday_poa" text DEFAULT '0' NOT NULL,
	"monday_other_work" text DEFAULT '0' NOT NULL,
	"monday_total" text DEFAULT '0' NOT NULL,
	"monday_review" text DEFAULT '' NOT NULL,
	"monday_night_out" text DEFAULT 'false' NOT NULL,
	"monday_expense_amount" text DEFAULT '0' NOT NULL,
	"monday_expense_receipt" text DEFAULT '' NOT NULL,
	"monday_driver_rating" integer,
	"monday_driver_comments" text,
	"tuesday_client" text DEFAULT '' NOT NULL,
	"tuesday_start" text DEFAULT '' NOT NULL,
	"tuesday_end" text DEFAULT '' NOT NULL,
	"tuesday_break" text DEFAULT '' NOT NULL,
	"tuesday_poa" text DEFAULT '0' NOT NULL,
	"tuesday_other_work" text DEFAULT '0' NOT NULL,
	"tuesday_total" text DEFAULT '0' NOT NULL,
	"tuesday_review" text DEFAULT '' NOT NULL,
	"tuesday_night_out" text DEFAULT 'false' NOT NULL,
	"tuesday_expense_amount" text DEFAULT '0' NOT NULL,
	"tuesday_expense_receipt" text DEFAULT '' NOT NULL,
	"tuesday_driver_rating" integer,
	"tuesday_driver_comments" text,
	"wednesday_client" text DEFAULT '' NOT NULL,
	"wednesday_start" text DEFAULT '' NOT NULL,
	"wednesday_end" text DEFAULT '' NOT NULL,
	"wednesday_break" text DEFAULT '' NOT NULL,
	"wednesday_poa" text DEFAULT '0' NOT NULL,
	"wednesday_other_work" text DEFAULT '0' NOT NULL,
	"wednesday_total" text DEFAULT '0' NOT NULL,
	"wednesday_review" text DEFAULT '' NOT NULL,
	"wednesday_night_out" text DEFAULT 'false' NOT NULL,
	"wednesday_expense_amount" text DEFAULT '0' NOT NULL,
	"wednesday_expense_receipt" text DEFAULT '' NOT NULL,
	"wednesday_driver_rating" integer,
	"wednesday_driver_comments" text,
	"thursday_client" text DEFAULT '' NOT NULL,
	"thursday_start" text DEFAULT '' NOT NULL,
	"thursday_end" text DEFAULT '' NOT NULL,
	"thursday_break" text DEFAULT '' NOT NULL,
	"thursday_poa" text DEFAULT '0' NOT NULL,
	"thursday_other_work" text DEFAULT '0' NOT NULL,
	"thursday_total" text DEFAULT '0' NOT NULL,
	"thursday_review" text DEFAULT '' NOT NULL,
	"thursday_night_out" text DEFAULT 'false' NOT NULL,
	"thursday_expense_amount" text DEFAULT '0' NOT NULL,
	"thursday_expense_receipt" text DEFAULT '' NOT NULL,
	"thursday_driver_rating" integer,
	"thursday_driver_comments" text,
	"friday_client" text DEFAULT '' NOT NULL,
	"friday_start" text DEFAULT '' NOT NULL,
	"friday_end" text DEFAULT '' NOT NULL,
	"friday_break" text DEFAULT '' NOT NULL,
	"friday_poa" text DEFAULT '0' NOT NULL,
	"friday_other_work" text DEFAULT '0' NOT NULL,
	"friday_total" text DEFAULT '0' NOT NULL,
	"friday_review" text DEFAULT '' NOT NULL,
	"friday_night_out" text DEFAULT 'false' NOT NULL,
	"friday_expense_amount" text DEFAULT '0' NOT NULL,
	"friday_expense_receipt" text DEFAULT '' NOT NULL,
	"friday_driver_rating" integer,
	"friday_driver_comments" text,
	"saturday_client" text DEFAULT '' NOT NULL,
	"saturday_start" text DEFAULT '' NOT NULL,
	"saturday_end" text DEFAULT '' NOT NULL,
	"saturday_break" text DEFAULT '' NOT NULL,
	"saturday_poa" text DEFAULT '0' NOT NULL,
	"saturday_other_work" text DEFAULT '0' NOT NULL,
	"saturday_total" text DEFAULT '0' NOT NULL,
	"saturday_review" text DEFAULT '' NOT NULL,
	"saturday_night_out" text DEFAULT 'false' NOT NULL,
	"saturday_expense_amount" text DEFAULT '0' NOT NULL,
	"saturday_expense_receipt" text DEFAULT '' NOT NULL,
	"saturday_driver_rating" integer,
	"saturday_driver_comments" text,
	"sunday_client" text DEFAULT '' NOT NULL,
	"sunday_start" text DEFAULT '' NOT NULL,
	"sunday_end" text DEFAULT '' NOT NULL,
	"sunday_break" text DEFAULT '' NOT NULL,
	"sunday_poa" text DEFAULT '0' NOT NULL,
	"sunday_other_work" text DEFAULT '0' NOT NULL,
	"sunday_total" text DEFAULT '0' NOT NULL,
	"sunday_review" text DEFAULT '' NOT NULL,
	"sunday_night_out" text DEFAULT 'false' NOT NULL,
	"sunday_expense_amount" text DEFAULT '0' NOT NULL,
	"sunday_expense_receipt" text DEFAULT '' NOT NULL,
	"sunday_driver_rating" integer,
	"sunday_driver_comments" text,
	"created_by_client" text,
	"billable_hours_by_day" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"deleted_by" varchar
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"phone" varchar,
	"role" varchar(20) DEFAULT 'driver' NOT NULL,
	"client_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"deleted_by" varchar,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "approval_audit_log" ADD CONSTRAINT "approval_audit_log_batch_id_approval_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."approval_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_audit_log" ADD CONSTRAINT "approval_audit_log_timesheet_id_timesheets_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_batches" ADD CONSTRAINT "approval_batches_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_batches" ADD CONSTRAINT "approval_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_timesheets" ADD CONSTRAINT "batch_timesheets_batch_id_approval_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."approval_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_timesheets" ADD CONSTRAINT "batch_timesheets_timesheet_id_timesheets_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_roster_id_rosters_id_fk" FOREIGN KEY ("roster_id") REFERENCES "public"."rosters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_batch_id_approval_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."approval_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_batch_timesheet" ON "batch_timesheets" USING btree ("batch_id","timesheet_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");