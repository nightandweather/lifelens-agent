const allowedActions = new Set([
  "save_meal_estimate",
  "create_follow_up",
  "start_activity",
  "apply_route_suggestion",
]);

export async function POST(request: Request) {
  const body = (await request.json()) as {
    eventId?: string;
    actionType?: string;
    confirmed?: boolean;
  };

  if (!body.confirmed) {
    return Response.json(
      { status: "blocked", message: "Explicit confirmation is required." },
      { status: 409 },
    );
  }

  if (!body.eventId || !body.actionType || !allowedActions.has(body.actionType)) {
    return Response.json(
      { status: "blocked", message: "Unsupported LifeLens action." },
      { status: 422 },
    );
  }

  return Response.json({
    status: "committed",
    eventId: body.eventId,
    actionType: body.actionType,
    persisted: false,
    message: "Demo approval recorded for this session; no external action was taken.",
  });
}
