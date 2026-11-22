import { NextRequest } from "next/server";
import { apiErrorResponse, parsePagination } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const pagination = parsePagination(request.nextUrl.searchParams);
    const [total, benchmarks] = await Promise.all([
      prisma.benchmark.count(),
      prisma.benchmark.findMany({
        skip: pagination.offset,
        take: pagination.limit,
        orderBy: [{ category: "asc" }, { name: "asc" }],
        include: {
          scores: {
            orderBy: [{ score: "desc" }, { model: { name: "asc" } }],
            include: {
              model: {
                select: {
                  id: true, slug: true, name: true,
                  company: { select: { id: true, slug: true, name: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    return Response.json({ data: benchmarks, pagination: { ...pagination, total } });
  } catch (error) {
    return apiErrorResponse(error, "GET /api/benchmarks");
  }
}
