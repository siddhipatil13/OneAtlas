import type { Prisma } from "@/generated/prisma/client";
import { ModelType } from "@/generated/prisma/enums";
import { unstable_rethrow } from "next/navigation";

const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 120;
const MAX_CAPABILITIES = 20;

export class ApiInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiInputError";
  }
}

export function apiErrorResponse(error: unknown, route: string) {
  // Let Next.js handle its prerender/request-time control-flow signals instead
  // of turning them into application-level 500 responses.
  unstable_rethrow(error);

  if (error instanceof ApiInputError) {
    return Response.json(
      { error: { code: "INVALID_QUERY", message: error.message } },
      { status: 400 },
    );
  }

  // Keep implementation details, SQL errors, and connection information private.
  const errorType = error instanceof Error ? error.name : typeof error;
  const safeCategory = classifyApiFailure(error);
  console.error(`OneAtlas API request failed in ${route} (${errorType}; ${safeCategory}).`);
  return Response.json(
    { error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}

function classifyApiFailure(error: unknown) {
  if (!(error instanceof Error)) return "UNKNOWN";
  if (/failed to parse url|invalid url/i.test(error.message)) return "INVALID_REQUEST_URL";
  if (/fetch failed|network request failed/i.test(error.message)) return "NETWORK_FAILURE";
  if (/database|prisma|postgres|connection|econn/i.test(error.message)) return "DATABASE_FAILURE";
  return "UNCLASSIFIED";
}

export function parsePagination(searchParams: URLSearchParams) {
  const limit = parseInteger(searchParams.get("limit"), "limit", 50, MAX_PAGE_SIZE);
  const offset = parseInteger(searchParams.get("offset"), "offset", 0, Number.MAX_SAFE_INTEGER);
  return { limit, offset };
}

function parseInteger(value: string | null, field: string, fallback: number, maximum: number) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) throw new ApiInputError(`${field} must be a non-negative integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw new ApiInputError(`${field} must be between 0 and ${maximum}.`);
  }
  if (field === "limit" && parsed < 1) throw new ApiInputError("limit must be at least 1.");
  return parsed;
}

export function parseModelFilters(searchParams: URLSearchParams) {
  const rawSearch = searchParams.get("search") ?? searchParams.get("q");
  const search = rawSearch?.trim();
  if (search && search.length > MAX_SEARCH_LENGTH) {
    throw new ApiInputError(`search must be ${MAX_SEARCH_LENGTH} characters or fewer.`);
  }

  const company = parseOptionalSlug(searchParams.get("company"), "company");
  const provider = parseOptionalSlug(searchParams.get("provider"), "provider");
  const type = parseOptionalModelType(searchParams.get("type"));
  const capabilities = [...new Set(
    searchParams.getAll("capability")
      .flatMap((value) => value.split(","))
      .map((value) => value.trim().toLocaleLowerCase())
      .filter(Boolean),
  )];

  if (capabilities.length > MAX_CAPABILITIES) {
    throw new ApiInputError(`Use at most ${MAX_CAPABILITIES} capability filters.`);
  }
  if (capabilities.some((capability) => capability.length > 60)) {
    throw new ApiInputError("Each capability filter must be 60 characters or fewer.");
  }

  return { search, company, provider, type, capabilities };
}

function parseOptionalSlug(value: string | null, field: string) {
  if (value === null || value.trim() === "") return undefined;
  const normalized = value.trim().toLocaleLowerCase();
  if (normalized.length > 120) throw new ApiInputError(`${field} filter is too long.`);
  return normalized;
}

function parseOptionalModelType(value: string | null) {
  if (value === null || value.trim() === "") return undefined;
  const normalized = value.trim().toLocaleUpperCase();
  const availableTypes = Object.values(ModelType);
  if (!availableTypes.includes(normalized as (typeof availableTypes)[number])) {
    throw new ApiInputError(`type must be one of ${availableTypes.join(", ")}.`);
  }
  return normalized as (typeof availableTypes)[number];
}

export type ModelSortField = "inputPrice" | "outputPrice" | "contextWindow" | "releaseDate";
export type SortDirection = "asc" | "desc";

export function parseModelSort(searchParams: URLSearchParams) {
  const rawSort = searchParams.get("sort") ?? "releaseDate";
  const aliases: Record<string, ModelSortField> = { price: "inputPrice" };
  const sort = aliases[rawSort] ?? rawSort;
  const supported: ModelSortField[] = ["inputPrice", "outputPrice", "contextWindow", "releaseDate"];
  if (!supported.includes(sort as ModelSortField)) {
    throw new ApiInputError("sort must be inputPrice, outputPrice, price, contextWindow, or releaseDate.");
  }

  const rawOrder = searchParams.get("order");
  if (rawOrder && rawOrder !== "asc" && rawOrder !== "desc") {
    throw new ApiInputError("order must be asc or desc.");
  }

  const field = sort as ModelSortField;
  const order = (rawOrder ?? (field === "inputPrice" || field === "outputPrice" ? "asc" : "desc")) as SortDirection;
  return { field, order };
}

export function modelWhere(filters: ReturnType<typeof parseModelFilters>): Prisma.ModelWhereInput {
  return {
    ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
    ...(filters.company ? { company: { slug: filters.company } } : {}),
    ...(filters.provider ? { providers: { some: { provider: { slug: filters.provider } } } } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.capabilities.length ? { capabilities: { hasEvery: filters.capabilities } } : {}),
  };
}

export function compareNullable(
  left: number | string | null,
  right: number | string | null,
  direction: SortDirection,
) {
  // Keep missing prices and dates at the end in either sort direction.
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const result = typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right));
  return direction === "asc" ? result : -result;
}
