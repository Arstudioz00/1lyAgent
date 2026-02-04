import { err, ok } from "@/lib/http";
import { createRequest } from "@/lib/requests";
import { requestSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = requestSchema.safeParse({ ...json, source: "human_ui" });
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid payload");

    const row = await createRequest(parsed.data.prompt, "human_ui");
    return ok(row, 201);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Request create failed", 500);
  }
}
