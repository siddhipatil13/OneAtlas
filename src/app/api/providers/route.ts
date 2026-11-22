import { NextRequest } from "next/server";
import { apiErrorResponse, parsePagination } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const pagination = parsePagination(request.nextUrl.searchParams);
    const [total, providers] = await Promise.all([
      prisma.provider.count(),
      prisma.provider.findMany({
        skip: pagination.offset,
        take: pagination.limit,
        orderBy: { name: "asc" },
        include: {
          company: { select: { id: true, slug: true, name: true } },
          models: {
            orderBy: { model: { name: "asc" } },
            include: {
              model: {
                select: { id: true, slug: true, name: true, type: true, contextWindow: true, capabilities: true },
              },
            },
          },
        },
      }),
    ]);

    return Response.json({ data: providers, pagination: { ...pagination, total } });
  } catch (error) {
    return apiErrorResponse(error, "GET /api/providers");
  }
}
