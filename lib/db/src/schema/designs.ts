import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const designsTable = pgTable("designs", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  canvasData: jsonb("canvas_data").notNull().$type<Record<string, unknown>>(),
  thumbnail: text("thumbnail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDesignSchema = createInsertSchema(designsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDesign = z.infer<typeof insertDesignSchema>;
export type Design = typeof designsTable.$inferSelect;
