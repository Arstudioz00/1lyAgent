import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// GET /api/json/:id - Serve JSON answer (called by 1ly proxy or direct access)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { data: request, error } = await supabase
      .from("requests")
      .select("json_answer, status, classification")
      .eq("id", id)
      .single();

    if (error || !request) {
      return new Response(
        JSON.stringify({ error: "Request not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!request.json_answer) {
      return new Response(
        JSON.stringify({
          error: "Answer not ready yet",
          status: request.status,
          message: "Please wait, answer is being generated..."
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return the JSON answer
    return new Response(
      JSON.stringify(request.json_answer),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600" // Cache for 1 hour
        }
      }
    );
  } catch (error) {
    console.error("Error fetching JSON answer:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// POST /api/json/:id - Store JSON answer (called by agent)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Verify agent authentication
    const authHeader = req.headers.get("Authorization");
    const expectedToken = `Bearer ${getRequiredEnv("AGENT_HOOK_TOKEN")}`;

    if (authHeader !== expectedToken) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse JSON answer from request body
    const jsonAnswer = await req.json();

    // Update request with JSON answer
    const { error } = await supabase
      .from("requests")
      .update({
        json_answer: jsonAnswer,
        status: "FULFILLED"
      })
      .eq("id", id);

    if (error) {
      console.error("Database update failed:", error);
      return new Response(
        JSON.stringify({ error: "Failed to store answer" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`✓ JSON answer stored for request ${id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Answer stored successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error storing JSON answer:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
