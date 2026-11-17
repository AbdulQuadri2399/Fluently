import { z } from "zod";
import { projectsCopy } from "@/components/projects/copy";

// Shared by the New project dialog (SCR4) and O10 createProject.
export const createProjectSchema = z.object({
  name: z.string().trim().min(1, projectsCopy.nameInvalid).max(80, projectsCopy.nameInvalid),
  mode: z.enum(["new", "optimise"]),
  channel: z.enum(["screens", "email"]),
  clientLabel: z.string().trim().max(80).optional(),
});
export type CreateProjectInput = z.input<typeof createProjectSchema>;

export const listProjectsSchema = z.object({
  filter: z.enum(["active", "archived"]).default("active"),
  search: z.string().trim().max(80).optional(),
  cursor: z.string().optional(),
});
export type ListProjectsInput = z.input<typeof listProjectsSchema>;
