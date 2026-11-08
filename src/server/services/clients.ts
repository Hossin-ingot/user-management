import { Client, User } from "@/types/Models";
import { AppError, fail, ok, Result } from "../result";
import { getStore } from "@/data/store";
import { ClientListQuery } from "../http/schemas";
import { canViewContent } from "../auth/policy";
import { Page } from "@/types/Api";

const FORBIDDEN_CONTENT: AppError = {
  status: 403,
  code: "FORBIDDEN",
  message: "Your role cannot view content pages.",
};

function compareBy(
  field: ClientListQuery["sort"],
): (a: Client, b: Client) => number {
  return (a, b) => a[field].localeCompare(b[field]) || a.id.localeCompare(b.id);
}

export function listClients(
  actor: User,
  query: ClientListQuery,
): Result<Page<Client>> {
  if (!canViewContent(actor)) return fail(FORBIDDEN_CONTENT);

  let rows: Client[] = getStore().clients;

  if (query.status) {
    rows = rows.filter((c) => c.status === query.status);
  }
  if (query.q) {
    const needle = query.q.toLowerCase();
    rows = rows.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.company.toLowerCase().includes(needle) ||
        c.email.toLowerCase().includes(needle),
    );
  }

  const sorted = [...rows].sort(compareBy(query.sort));
  if (query.order === "desc") sorted.reverse();

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * query.limit;

  return ok({
    items: sorted.slice(start, start + query.limit),
    page,
    limit: query.limit,
    total,
    totalPages,
  });
}

export function getClient(actor: User, id: string): Result<Client> {
  if (!canViewContent(actor)) return fail(FORBIDDEN_CONTENT);
  const client = getStore().clientsById.get(id);
  return client
    ? ok(client)
    : fail({ status: 404, code: "NOT_FOUND", message: "Client not found." });
}
