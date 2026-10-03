import { tutorReport } from "@/lib/data/ai";
export const maxDuration = 90;
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { question?: string; studentId?: string };
    return Response.json(await tutorReport(body.question ?? "", typeof body.studentId === "string" ? body.studentId : undefined));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar el informe.",
      },
      { status: 400 },
    );
  }
}
