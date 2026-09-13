import { liveLimit } from "../../../../lib/live-limit";
import { agentRequest, jsonBody, result } from "../../../../lib/live-server";
export async function POST(request: Request) {
  const limited = await liveLimit(request); if (limited) return limited;
  try { const body = await jsonBody(request, 20_000);
    if (body.sessionActive !== true) return result({ error: "세션을 먼저 시작해주세요." }, 409);
    if (typeof body.question !== "string" || !body.question.trim() || body.question.length > 500) return result({ error: "질문을 500자 이내로 입력해주세요." }, 422);
    return agentRequest("/v1/context/question", { question: body.question, observation: body.observation ?? null, weather: body.weather ?? null, place: body.place ?? null });
  } catch { return result({ error: "질문 내용을 확인해주세요." }, 422); }
}
