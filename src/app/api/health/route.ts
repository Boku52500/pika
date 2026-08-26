import { pingDatabase } from "@/server/prisma";
import { logError } from "@/server/log";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pingDatabase();
    return Response.json(
      { ok: true, db: "up" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError("health.database_down", { error });
    return Response.json(
      { ok: false, db: "down" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
