import { Role } from "@/types/Roles";
import z from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email());
const fullName = z.string().trim().min(1, "Name is required").max(120);
const role = z.enum(Role);
const status = z.enum(["active", "deactivated"]);
const managerId = z.string().min(1).nullable();

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});

export function zodDetails(
  error: z.ZodError,
): { field: string; message: string }[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "(body)",
    message: issue.message,
  }));
}

export const createUserSchema = z
  .object({
    fullName,
    email,
    role,
    password: z.string().min(8, "Password must be at least 8 characters"),
    managerId: managerId.optional().default(null),
  })
  .strict();

export const updateUserSchema = z
  .object({
    fullName: fullName.optional(),
    email: email.optional(),
    role: role.optional(),
    status: status.optional(),
    managerId: managerId.optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, "Nothing to update");

export const clientListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  sort: z
    .enum(["name", "company", "country", "status", "createdAt"])
    .default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
  q: z.string().trim().max(100).optional(),
  status: z.enum(["active", "churned"]).optional(),
});

export type ClientListQuery = z.infer<typeof clientListQuerySchema>;