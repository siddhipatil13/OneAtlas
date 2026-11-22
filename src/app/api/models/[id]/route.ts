import { apiErrorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const model = await prisma.model.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        company: true,
        providers: {
          include: {
            provider: { include: { company: { select: { id: true, slug: true, name: true } } } },
          },
        },
        scores: {
          include: { benchmark: true },
          orderBy: { evaluatedAt: "desc" },
        },
      },
    });

    if (!model) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Model was not found." } },
        { status: 404 },
      );
    }

    return Response.json({ data: model });
  } catch (error) {
    return apiErrorResponse(error, "GET /api/models/[id]");
  }
}
