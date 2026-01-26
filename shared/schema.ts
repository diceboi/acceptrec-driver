// Referenced from Replit Auth and PostgreSQL database blueprints
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, index, uniqueIndex, jsonb, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with roles (based on Replit Auth blueprint)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"), // Phone number for SMS reminders
  role: varchar("role", { length: 20 }).notNull().default("driver"), // 'driver', 'admin', 'super_admin', or 'client'
  clientId: varchar("client_id"), // For client role: links user to their company (references clients.id)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Soft delete fields
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by"), // User ID who deleted this record
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Clients table - stores client contact information
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  notes: text("notes"),
  minimumBillableHours: real("minimum_billable_hours").notNull().default(8), // Guaranteed minimum hours per shift (default: 8)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Soft delete fields
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by"), // User ID who deleted this record
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedBy: true,
}).extend({
  email: z.string().email("Invalid email address"),
  minimumBillableHours: z.number().min(0, "Minimum hours must be at least 0").max(24, "Minimum hours cannot exceed 24"),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

// Client contacts table - stores multiple contact persons per client
export const clientContacts = pgTable("client_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  isPrimary: integer("is_primary").notNull().default(0), // 1 = primary contact, 0 = secondary
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientContactSchema = createInsertSchema(clientContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Contact name is required"),
});

export type ClientContact = typeof clientContacts.$inferSelect;
export type InsertClientContact = z.infer<typeof insertClientContactSchema>;

// Client approval batches - groups multiple driver timesheets for one client
export const approvalBatches = pgTable("approval_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: 'set null' }), // Reference to client contact
  clientName: text("client_name").notNull(), // Keep for backward compatibility and display
  weekStartDate: text("week_start_date").notNull(), // Monday of the week
  approvalToken: varchar("approval_token").notNull().unique(),
  approvalTokenExpiry: timestamp("approval_token_expiry").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, partial, rejected
  sentToEmail: varchar("sent_to_email"), // Email where approval link was sent
  sentAt: timestamp("sent_at"), // When the email was sent
  createdBy: varchar("created_by").notNull().references(() => users.id), // Admin who created the batch
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ApprovalBatch = typeof approvalBatches.$inferSelect;
export type InsertApprovalBatch = typeof approvalBatches.$inferInsert;

// Junction table for many-to-many relationship between batches and timesheets
export const batchTimesheets = pgTable("batch_timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => approvalBatches.id, { onDelete: 'cascade' }),
  timesheetId: varchar("timesheet_id").notNull().references(() => timesheets.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate batch-timesheet links
  uniqueBatchTimesheet: uniqueIndex("unique_batch_timesheet").on(table.batchId, table.timesheetId),
}));

export type BatchTimesheet = typeof batchTimesheets.$inferSelect;
export type InsertBatchTimesheet = typeof batchTimesheets.$inferInsert;

// Approval audit log - tracks all actions related to approval batches
export const approvalAuditLog = pgTable("approval_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => approvalBatches.id, { onDelete: 'cascade' }),
  timesheetId: varchar("timesheet_id").references(() => timesheets.id, { onDelete: 'cascade' }), // null for batch-level events
  action: varchar("action", { length: 50 }).notNull(), // link_sent, link_opened, approved, rejected
  performedBy: text("performed_by"), // Name of person who performed the action
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  notes: text("notes"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type ApprovalAuditLog = typeof approvalAuditLog.$inferSelect;
export type InsertApprovalAuditLog = typeof approvalAuditLog.$inferInsert;

// System audit log - tracks all important actions in the system
export const systemAuditLog = pgTable("system_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Who performed the action
  userEmail: varchar("user_email"), // For reference if user is deleted
  userName: text("user_name"), // For display
  action: varchar("action", { length: 50 }).notNull(), // create, update, delete, restore, role_change
  entityType: varchar("entity_type", { length: 50 }).notNull(), // user, timesheet, client, roster, approval_batch
  entityId: varchar("entity_id"), // ID of the affected entity
  entityName: text("entity_name"), // Friendly name of entity (e.g., driver name, client name)
  changes: jsonb("changes"), // Before/after values for updates
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  notes: text("notes"), // Additional context
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type SystemAuditLog = typeof systemAuditLog.$inferSelect;
export type InsertSystemAuditLog = typeof systemAuditLog.$inferInsert;

// Timesheets table with user relationship and batch approval fields
export const timesheets = pgTable("timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  driverName: text("driver_name").notNull(), // Denormalized for display
  weekStartDate: text("week_start_date").notNull(),
  
  // Batch approval fields
  batchId: varchar("batch_id").references(() => approvalBatches.id, { onDelete: 'set null' }), // Linked to approval batch
  approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("draft"), // draft, pending_approval, approved, rejected
  clientApprovedAt: timestamp("client_approved_at"),
  clientApprovedBy: text("client_approved_by"),
  clientRating: integer("client_rating"), // Client rating 1-10 (client rates driver)
  clientComments: text("client_comments"), // Client's comments about driver
  clientModifications: jsonb("client_modifications"), // Tracks what client changed during approval
  
  // Driver feedback about clients (admin-only, clients never see this)
  driverRating: integer("driver_rating"), // Driver rating 1-10 (driver rates client experience)
  driverComments: text("driver_comments"), // Driver's feedback about working with client
  
  // Monday
  mondayClient: text("monday_client").notNull().default(""),
  mondayStart: text("monday_start").notNull().default(""),
  mondayEnd: text("monday_end").notNull().default(""),
  mondayBreak: text("monday_break").notNull().default(""),
  mondayPoa: text("monday_poa").notNull().default("0"),
  mondayOtherWork: text("monday_other_work").notNull().default("0"),
  mondayTotal: text("monday_total").notNull().default("0"),
  mondayReview: text("monday_review").notNull().default(""),
  mondayNightOut: text("monday_night_out").notNull().default("false"), // "true" if driver stayed overnight
  mondayExpenseAmount: text("monday_expense_amount").notNull().default("0"), // Expense amount for the day
  mondayExpenseReceipt: text("monday_expense_receipt").notNull().default(""), // Object storage path to receipt
  mondayDriverRating: integer("monday_driver_rating"), // Driver's rating of client (1-10)
  mondayDriverComments: text("monday_driver_comments"), // Driver's feedback about client
  
  // Tuesday
  tuesdayClient: text("tuesday_client").notNull().default(""),
  tuesdayStart: text("tuesday_start").notNull().default(""),
  tuesdayEnd: text("tuesday_end").notNull().default(""),
  tuesdayBreak: text("tuesday_break").notNull().default(""),
  tuesdayPoa: text("tuesday_poa").notNull().default("0"),
  tuesdayOtherWork: text("tuesday_other_work").notNull().default("0"),
  tuesdayTotal: text("tuesday_total").notNull().default("0"),
  tuesdayReview: text("tuesday_review").notNull().default(""),
  tuesdayNightOut: text("tuesday_night_out").notNull().default("false"),
  tuesdayExpenseAmount: text("tuesday_expense_amount").notNull().default("0"),
  tuesdayExpenseReceipt: text("tuesday_expense_receipt").notNull().default(""),
  tuesdayDriverRating: integer("tuesday_driver_rating"), // Driver's rating of client (1-10)
  tuesdayDriverComments: text("tuesday_driver_comments"), // Driver's feedback about client
  
  // Wednesday
  wednesdayClient: text("wednesday_client").notNull().default(""),
  wednesdayStart: text("wednesday_start").notNull().default(""),
  wednesdayEnd: text("wednesday_end").notNull().default(""),
  wednesdayBreak: text("wednesday_break").notNull().default(""),
  wednesdayPoa: text("wednesday_poa").notNull().default("0"),
  wednesdayOtherWork: text("wednesday_other_work").notNull().default("0"),
  wednesdayTotal: text("wednesday_total").notNull().default("0"),
  wednesdayReview: text("wednesday_review").notNull().default(""),
  wednesdayNightOut: text("wednesday_night_out").notNull().default("false"),
  wednesdayExpenseAmount: text("wednesday_expense_amount").notNull().default("0"),
  wednesdayExpenseReceipt: text("wednesday_expense_receipt").notNull().default(""),
  wednesdayDriverRating: integer("wednesday_driver_rating"), // Driver's rating of client (1-10)
  wednesdayDriverComments: text("wednesday_driver_comments"), // Driver's feedback about client
  
  // Thursday
  thursdayClient: text("thursday_client").notNull().default(""),
  thursdayStart: text("thursday_start").notNull().default(""),
  thursdayEnd: text("thursday_end").notNull().default(""),
  thursdayBreak: text("thursday_break").notNull().default(""),
  thursdayPoa: text("thursday_poa").notNull().default("0"),
  thursdayOtherWork: text("thursday_other_work").notNull().default("0"),
  thursdayTotal: text("thursday_total").notNull().default("0"),
  thursdayReview: text("thursday_review").notNull().default(""),
  thursdayNightOut: text("thursday_night_out").notNull().default("false"),
  thursdayExpenseAmount: text("thursday_expense_amount").notNull().default("0"),
  thursdayExpenseReceipt: text("thursday_expense_receipt").notNull().default(""),
  thursdayDriverRating: integer("thursday_driver_rating"), // Driver's rating of client (1-10)
  thursdayDriverComments: text("thursday_driver_comments"), // Driver's feedback about client
  
  // Friday
  fridayClient: text("friday_client").notNull().default(""),
  fridayStart: text("friday_start").notNull().default(""),
  fridayEnd: text("friday_end").notNull().default(""),
  fridayBreak: text("friday_break").notNull().default(""),
  fridayPoa: text("friday_poa").notNull().default("0"),
  fridayOtherWork: text("friday_other_work").notNull().default("0"),
  fridayTotal: text("friday_total").notNull().default("0"),
  fridayReview: text("friday_review").notNull().default(""),
  fridayNightOut: text("friday_night_out").notNull().default("false"),
  fridayExpenseAmount: text("friday_expense_amount").notNull().default("0"),
  fridayExpenseReceipt: text("friday_expense_receipt").notNull().default(""),
  fridayDriverRating: integer("friday_driver_rating"), // Driver's rating of client (1-10)
  fridayDriverComments: text("friday_driver_comments"), // Driver's feedback about client
  
  // Saturday
  saturdayClient: text("saturday_client").notNull().default(""),
  saturdayStart: text("saturday_start").notNull().default(""),
  saturdayEnd: text("saturday_end").notNull().default(""),
  saturdayBreak: text("saturday_break").notNull().default(""),
  saturdayPoa: text("saturday_poa").notNull().default("0"),
  saturdayOtherWork: text("saturday_other_work").notNull().default("0"),
  saturdayTotal: text("saturday_total").notNull().default("0"),
  saturdayReview: text("saturday_review").notNull().default(""),
  saturdayNightOut: text("saturday_night_out").notNull().default("false"),
  saturdayExpenseAmount: text("saturday_expense_amount").notNull().default("0"),
  saturdayExpenseReceipt: text("saturday_expense_receipt").notNull().default(""),
  saturdayDriverRating: integer("saturday_driver_rating"), // Driver's rating of client (1-10)
  saturdayDriverComments: text("saturday_driver_comments"), // Driver's feedback about client
  
  // Sunday
  sundayClient: text("sunday_client").notNull().default(""),
  sundayStart: text("sunday_start").notNull().default(""),
  sundayEnd: text("sunday_end").notNull().default(""),
  sundayBreak: text("sunday_break").notNull().default(""),
  sundayPoa: text("sunday_poa").notNull().default("0"),
  sundayOtherWork: text("sunday_other_work").notNull().default("0"),
  sundayTotal: text("sunday_total").notNull().default("0"),
  sundayReview: text("sunday_review").notNull().default(""),
  sundayNightOut: text("sunday_night_out").notNull().default("false"),
  sundayExpenseAmount: text("sunday_expense_amount").notNull().default("0"),
  sundayExpenseReceipt: text("sunday_expense_receipt").notNull().default(""),
  sundayDriverRating: integer("sunday_driver_rating"), // Driver's rating of client (1-10)
  sundayDriverComments: text("sunday_driver_comments"), // Driver's feedback about client
  
  // Track if timesheet was created by client (stores client name) or driver (null)
  createdByClient: text("created_by_client"), // NULL = driver created, "Client Name" = client created
  
  // Billable hours tracking - stores actual vs billable hours per day
  // Format: { monday: { actual: 6.5, billable: 8, client: "Client Name", minimumApplied: true }, ... }
  billableHoursByDay: jsonb("billable_hours_by_day"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Soft delete fields
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by"),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  timesheets: many(timesheets),
  approvalBatches: many(approvalBatches),
}));

export const approvalBatchesRelations = relations(approvalBatches, ({ one, many }) => ({
  creator: one(users, {
    fields: [approvalBatches.createdBy],
    references: [users.id],
  }),
  timesheets: many(timesheets),
}));

export const timesheetsRelations = relations(timesheets, ({ one }) => ({
  user: one(users, {
    fields: [timesheets.userId],
    references: [users.id],
  }),
  batch: one(approvalBatches, {
    fields: [timesheets.batchId],
    references: [approvalBatches.id],
  }),
}));

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  userId: true, 
  createdAt: true,
  updatedAt: true,
  batchId: true,
  clientApprovedAt: true,
  clientApprovedBy: true,
  clientComments: true,
  clientModifications: true,
  clientRating: true,
  driverComments: true,
  driverRating: true,
  deletedAt: true,
  deletedBy: true,
  createdByClient: true,
  billableHoursByDay: true,
  // Omit fields that we are replacing or not using
  driverName: true,
  weekStartDate: true,
  approvalStatus: true,
  // Monday
  mondayClient: true, mondayStart: true, mondayEnd: true, mondayBreak: true, 
  mondayPoa: true, mondayOtherWork: true, mondayTotal: true, mondayReview: true, 
  mondayNightOut: true, mondayExpenseAmount: true, mondayExpenseReceipt: true, 
  mondayDriverRating: true, mondayDriverComments: true,
  // Tuesday
  tuesdayClient: true, tuesdayStart: true, tuesdayEnd: true, tuesdayBreak: true, 
  tuesdayPoa: true, tuesdayOtherWork: true, tuesdayTotal: true, tuesdayReview: true, 
  tuesdayNightOut: true, tuesdayExpenseAmount: true, tuesdayExpenseReceipt: true, 
  tuesdayDriverRating: true, tuesdayDriverComments: true,
  // Wednesday
  wednesdayClient: true, wednesdayStart: true, wednesdayEnd: true, wednesdayBreak: true, 
  wednesdayPoa: true, wednesdayOtherWork: true, wednesdayTotal: true, wednesdayReview: true, 
  wednesdayNightOut: true, wednesdayExpenseAmount: true, wednesdayExpenseReceipt: true, 
  wednesdayDriverRating: true, wednesdayDriverComments: true,
  // Thursday
  thursdayClient: true, thursdayStart: true, thursdayEnd: true, thursdayBreak: true, 
  thursdayPoa: true, thursdayOtherWork: true, thursdayTotal: true, thursdayReview: true, 
  thursdayNightOut: true, thursdayExpenseAmount: true, thursdayExpenseReceipt: true, 
  thursdayDriverRating: true, thursdayDriverComments: true,
  // Friday
  fridayClient: true, fridayStart: true, fridayEnd: true, fridayBreak: true, 
  fridayPoa: true, fridayOtherWork: true, fridayTotal: true, fridayReview: true, 
  fridayNightOut: true, fridayExpenseAmount: true, fridayExpenseReceipt: true, 
  fridayDriverRating: true, fridayDriverComments: true,
  // Saturday
  saturdayClient: true, saturdayStart: true, saturdayEnd: true, saturdayBreak: true, 
  saturdayPoa: true, saturdayOtherWork: true, saturdayTotal: true, saturdayReview: true, 
  saturdayNightOut: true, saturdayExpenseAmount: true, saturdayExpenseReceipt: true, 
  saturdayDriverRating: true, saturdayDriverComments: true,
  // Sunday
  sundayClient: true, sundayStart: true, sundayEnd: true, sundayBreak: true, 
  sundayPoa: true, sundayOtherWork: true, sundayTotal: true, sundayReview: true, 
  sundayNightOut: true, sundayExpenseAmount: true, sundayExpenseReceipt: true, 
  sundayDriverRating: true, sundayDriverComments: true,
}).extend({
  driverName: z.string().min(1, "Driver name is required"),
  weekStartDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  approvalStatus: z.string().default("draft"),
  
  // Monday
  mondayClient: z.string().default(""),
  mondayStart: z.string().default(""),
  mondayEnd: z.string().default(""),
  mondayBreak: z.string().default(""),
  mondayPoa: z.string().default("0"),
  mondayOtherWork: z.string().default("0"),
  mondayTotal: z.string().default("0"),
  mondayReview: z.string().default(""),
  
  // Tuesday
  tuesdayClient: z.string().default(""),
  tuesdayStart: z.string().default(""),
  tuesdayEnd: z.string().default(""),
  tuesdayBreak: z.string().default(""),
  tuesdayPoa: z.string().default("0"),
  tuesdayOtherWork: z.string().default("0"),
  tuesdayTotal: z.string().default("0"),
  tuesdayReview: z.string().default(""),
  
  // Wednesday
  wednesdayClient: z.string().default(""),
  wednesdayStart: z.string().default(""),
  wednesdayEnd: z.string().default(""),
  wednesdayBreak: z.string().default(""),
  wednesdayPoa: z.string().default("0"),
  wednesdayOtherWork: z.string().default("0"),
  wednesdayTotal: z.string().default("0"),
  wednesdayReview: z.string().default(""),
  
  // Thursday
  thursdayClient: z.string().default(""),
  thursdayStart: z.string().default(""),
  thursdayEnd: z.string().default(""),
  thursdayBreak: z.string().default(""),
  thursdayPoa: z.string().default("0"),
  thursdayOtherWork: z.string().default("0"),
  thursdayTotal: z.string().default("0"),
  thursdayReview: z.string().default(""),
  
  // Friday
  fridayClient: z.string().default(""),
  fridayStart: z.string().default(""),
  fridayEnd: z.string().default(""),
  fridayBreak: z.string().default(""),
  fridayPoa: z.string().default("0"),
  fridayOtherWork: z.string().default("0"),
  fridayTotal: z.string().default("0"),
  fridayReview: z.string().default(""),
  
  // Saturday
  saturdayClient: z.string().default(""),
  saturdayStart: z.string().default(""),
  saturdayEnd: z.string().default(""),
  saturdayBreak: z.string().default(""),
  saturdayPoa: z.string().default("0"),
  saturdayOtherWork: z.string().default("0"),
  saturdayTotal: z.string().default("0"),
  saturdayReview: z.string().default(""),
  
  // Sunday
  sundayClient: z.string().default(""),
  sundayStart: z.string().default(""),
  sundayEnd: z.string().default(""),
  sundayBreak: z.string().default(""),
  sundayPoa: z.string().default("0"),
  sundayOtherWork: z.string().default("0"),
  sundayTotal: z.string().default("0"),
  sundayReview: z.string().default(""),
});

export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type Timesheet = typeof timesheets.$inferSelect;

// Weekly rosters - tracks uploaded roster files and metadata
export const rosters = pgTable("rosters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekStartDate: text("week_start_date").notNull(), // Sunday of the week
  fileName: text("file_name").notNull(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  totalEntries: integer("total_entries").notNull().default(0),
  notes: text("notes"),
  // Soft delete fields
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by"),
});

export const insertRosterSchema = createInsertSchema(rosters).omit({
  id: true,
  uploadedAt: true,
});

export type Roster = typeof rosters.$inferSelect;
export type InsertRoster = z.infer<typeof insertRosterSchema>;

// Roster entries - individual driver assignments for a week
export const rosterEntries = pgTable("roster_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rosterId: varchar("roster_id").notNull().references(() => rosters.id, { onDelete: 'cascade' }),
  driverName: text("driver_name").notNull(),
  driverEmail: varchar("driver_email"),
  driverPhone: varchar("driver_phone"),
  expectedClient: text("expected_client"), // Which client they're expected to work for
  notes: text("notes"),
  // Will be linked to actual user if email matches
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
});

export const insertRosterEntrySchema = createInsertSchema(rosterEntries).omit({
  id: true,
  rosterId: true, // Will be set when entry is created
  userId: true, // Will be matched/set by backend
}).extend({
  driverEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
});

export type RosterEntry = typeof rosterEntries.$inferSelect;
export type InsertRosterEntry = z.infer<typeof insertRosterEntrySchema>;
