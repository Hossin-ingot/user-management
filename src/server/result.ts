import { Denial } from "@/types/Policy";


export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "SELF_LOCKOUT"
  | "LAST_ADMINISTRATOR"
  | "VALIDATION"
  | "NOT_FOUND"
  | "CONFLICT";

export interface AppError {
  status: 400 | 401 | 403 | 404 | 409 | 422;
  code: ErrorCode;
  message: string;
  details?: Denial[] | { field: string; message: string }[];
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(error: AppError): Result<T> {
  return { ok: false, error };
}

export function errorFromDenials(denials: Denial[]): AppError {
  const [primary] = denials;
  if (!primary) {
    return { status: 403, code: "FORBIDDEN", message: "Forbidden." };
  }
  const isInvariant = primary.code !== "FORBIDDEN";
  return {
    status: isInvariant ? 409 : 403,
    code: primary.code,
    message: denials.map((d) => d.message).join(" "),
    details: denials,
  };
}