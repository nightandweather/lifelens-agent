type SceneKey = "meal" | "conversation" | "evening" | "move";

const moments: Record<SceneKey, Record<string, unknown>> = {
  meal: {
    event_id: "moment-meal-001",
    moment_type: "meal",
    captured_at: "2026-09-01T12:38:00+09:00",
    observations: [
      "mixed rice bowl visible",
      "small soup bowl visible",
      "portion size uncertain",
      "authorized profile: 74.2 kg and 21.8 percent body fat",
      "saved easy-run pace available",
    ],
    user_goal: "track lunch and compare it with today's run without strict dieting",
    raw_media_retained: false,
  },
  conversation: {
    event_id: "moment-talk-001",
    moment_type: "conversation",
    captured_at: "2026-09-01T16:14:00+09:00",
    observations: ["user made an explicit promise", "deadline stated as Friday afternoon"],
    transcript_excerpt: "I'll send you the revised slides by Friday afternoon.",
    user_goal: "follow through on commitments",
    raw_media_retained: false,
  },
  evening: {
    event_id: "moment-evening-001",
    moment_type: "evening",
    captured_at: "2026-09-01T20:42:00+09:00",
    observations: [
      "seated for 52 minutes",
      "daily movement below personal baseline",
      "user usually approves short evening walks",
    ],
    user_goal: "move gently after work",
    raw_media_retained: false,
  },
  move: {
    event_id: "moment-move-001",
    moment_type: "mobility",
    captured_at: "2026-09-01T21:08:00+09:00",
    observations: [
      "workout session active",
      "pace slowed for six minutes",
      "rain approaching usual loop",
      "well-lit route home available",
    ],
    user_goal: "finish a gentle evening workout safely",
    raw_media_retained: false,
  },
};

const forbidden = ["is lying", "doesn't like you", "hates you", "narcissist", "depressed"];

export async function POST(request: Request) {
  const body = (await request.json()) as { scene?: SceneKey; sessionActive?: boolean };
  if (!body.sessionActive) {
    return Response.json({ error: "An active, visible capture session is required." }, { status: 409 });
  }
  if (!body.scene || !(body.scene in moments)) {
    return Response.json({ error: "Unknown LifeLens moment." }, { status: 422 });
  }

  const agentUrl = process.env.LIFELENS_AGENT_API_URL?.replace(/\/$/, "");
  if (!agentUrl) {
    return Response.json(
      {
        error: "The live Strands endpoint is not configured on this deployment.",
        setup: "Set LIFELENS_AGENT_API_URL to the deployed LifeLens agent service.",
      },
      { status: 503 },
    );
  }

  try {
    const upstream = await fetch(`${agentUrl}/v1/moments/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(moments[body.scene]),
      signal: AbortSignal.timeout(20_000),
    });
    if (!upstream.ok) {
      return Response.json({ error: "The agent service rejected this moment." }, { status: 502 });
    }

    const analysis = (await upstream.json()) as {
      headline?: string;
      observation?: string;
      reasoning?: string;
      uncertainty?: string;
      proposed_action?: { label?: string; requires_confirmation?: boolean };
      safety_notes?: string[];
    };
    const combined = `${analysis.headline ?? ""} ${analysis.observation ?? ""} ${analysis.reasoning ?? ""}`.toLowerCase();
    if (forbidden.some((term) => combined.includes(term)) || analysis.proposed_action?.requires_confirmation !== true) {
      return Response.json({ error: "The response failed the LifeLens safety contract." }, { status: 502 });
    }

    return Response.json({ mode: "strands-bedrock", analysis });
  } catch {
    return Response.json({ error: "The agent service did not respond in time." }, { status: 504 });
  }
}
