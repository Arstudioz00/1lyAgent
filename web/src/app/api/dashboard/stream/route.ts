import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const supabase = getSupabaseAdmin();
        const { data } = await supabase
          .from("requests")
          .select("id,status,classification,created_at")
          .order("created_at", { ascending: false })
          .limit(20);

        controller.enqueue(encoder.encode(`event: init\ndata: ${JSON.stringify(data ?? [])}\n\n`));
      } catch {
        controller.enqueue(encoder.encode("event: init\ndata: []\n\n"));
      }

      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\ndata: ${Date.now()}\n\n`));
      }, 15000);

      setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 60000);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
