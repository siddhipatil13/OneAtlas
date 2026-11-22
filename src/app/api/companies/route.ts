import { NextRequest } from "next/server";
import { apiErrorResponse, parsePagination } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const pagination = parsePagination(request.nextUrl.searchParams);
    const [total, companies] = await Promise.all([
      prisma.company.count(),
      prisma.company.findMany({
        skip: pagination.offset,
        take: pagination.limit,
        orderBy: { name: "asc" },
        include: {
          models: {
            select: { id: true, slug: true, name: true, type: true, contextWindow: true, capabilities: true },
            orderBy: { name: "asc" },
          },
        },
      }),
    ]);

    return Response.json({ data: companies, pagination: { ...pagination, total } });
  } catch (error) {
    return apiErrorResponse(error, "GET /api/companies");
  }
}
