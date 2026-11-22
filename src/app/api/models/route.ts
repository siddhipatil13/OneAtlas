import { NextRequest } from "next/server";
import { apiErrorResponse, compareNullable, modelWhere, parseModelFilters, parseModelSort, parsePagination } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const pagination = parsePagination(searchParams);
    const filters = parseModelFilters(searchParams);
    const sort = parseModelSort(searchParams);
    const where = modelWhere(filters);

    const [total, models] = await Promise.all([
      prisma.model.count({ where }),
      prisma.model.findMany({
        where,
        include: {
          company: { select: { id: true, slug: true, name: true } },
          providers: {
            include: { provider: { select: { id: true, slug: true, name: true } } },
          },
        },
        ...(sort.field === "contextWindow" || sort.field === "releaseDate"
          ? { orderBy: { [sort.field]: sort.order } }
          : {}),
      }),
    ]);

    const sorted = [...models].sort((left, right) => {
      if (sort.field === "contextWindow" || sort.field === "releaseDate") {
        // Preserve deterministic tie order after the database sort.
        const leftValue = sort.field === "contextWindow" ? left.contextWindow : left.releaseDate?.toISOString() ?? null;
        const rightValue = sort.field === "contextWindow" ? right.contextWindow : right.releaseDate?.toISOString() ?? null;
        const byField = compareNullable(leftValue, rightValue, sort.order);
        return byField || left.name.localeCompare(right.name);
      }

      const priceField = sort.field === "inputPrice" ? "inputPricePerMillion" : "outputPricePerMillion";
      const leftPrices = left.providers.map((entry) => entry[priceField]).filter((value) => value !== null);
      const rightPrices = right.providers.map((entry) => entry[priceField]).filter((value) => value !== null);
      const leftPrice = leftPrices.length ? Math.min(...leftPrices.map(Number)) : null;
      const rightPrice = rightPrices.length ? Math.min(...rightPrices.map(Number)) : null;
      return compareNullable(leftPrice, rightPrice, sort.order) || left.name.localeCompare(right.name);
    });

    return Response.json({
      data: sorted.slice(pagination.offset, pagination.offset + pagination.limit),
      pagination: { ...pagination, total },
      sort,
    });
  } catch (error) {
    return apiErrorResponse(error, "GET /api/models");
  }
}
