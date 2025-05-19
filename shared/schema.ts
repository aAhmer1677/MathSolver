import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// New schemas for math problem solving
export const mathProblems = pgTable("math_problems", {
  id: serial("id").primaryKey(),
  problem: text("problem").notNull(),
  solution: text("solution"),
  steps: text("steps").array(),
  createdAt: text("created_at").notNull(),
});

export const insertMathProblemSchema = createInsertSchema(mathProblems).pick({
  problem: true,
});

export const mathResponseSchema = z.object({
  problem: z.string(),
  answer: z.string(),
  steps: z.array(z.object({
    expression: z.string(),
    explanation: z.string()
  })).optional()
});

export type InsertMathProblem = z.infer<typeof insertMathProblemSchema>;
export type MathProblem = typeof mathProblems.$inferSelect;
export type MathResponse = z.infer<typeof mathResponseSchema>;
