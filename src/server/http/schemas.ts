import z from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email());

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