import z from "zod";
import { AppError } from "../result";
import { zodDetails } from "./schemas";

export type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response };

export function errorResponse(error: AppError): Response {
  const { status, ...body } = error;
  return Response.json({ error: body }, { status });
}

export function parseWith<S extends z.ZodType>(schema: S, input: unknown): Parsed<z.output<S>> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    response: errorResponse({
      status: 422,
      code: "VALIDATION",
      message: "The request is invalid.",
      details: zodDetails(parsed.error),
    }),
  };
}

export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<Parsed<z.output<S>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: errorResponse({ status: 400, code: "VALIDATION", message: "Body must be valid JSON." }),
    };
  }
  return parseWith(schema, body);
}