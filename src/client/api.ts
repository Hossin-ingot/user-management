"use client";

import type { ApiError } from "@/types/Api";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: ApiError["error"] };

interface ApiFetchOptions {
  redirectOnUnauthenticated?: boolean;
}

export async function apiFetch<T>(
  url: string,
  init?: RequestInit,
  { redirectOnUnauthenticated = true }: ApiFetchOptions = {},
): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });

  if (response.status === 401 && redirectOnUnauthenticated) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional full reload
    window.location.assign("/login");
    return {
      ok: false,
      status: 401,
      error: { code: "UNAUTHENTICATED", message: "Session ended." },
    };
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = isApiError(body)
      ? body.error
      : { code: "UNKNOWN", message: `Request failed (${response.status}).` };
    return { ok: false, status: response.status, error };
  }
  return { ok: true, data: body as T };
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error: unknown }).error === "object"
  );
}
