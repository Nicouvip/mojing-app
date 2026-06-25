import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  createdAt: text("createdAt").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updatedAt").notNull().default("CURRENT_TIMESTAMP"),
  deletedAt: text("deletedAt"),
});

export const chapters = sqliteTable("chapters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("projectId")
    .notNull()
    .references(() => projects.id),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  order: integer("order").notNull().default(0),
  wordCount: integer("wordCount").notNull().default(0),
  deletedAt: text("deletedAt"),
});
