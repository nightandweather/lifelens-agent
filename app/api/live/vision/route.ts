import { liveLimit } from "../../../../lib/live-limit";
import { agentRequest, jsonBody, result } from "../../../../lib/live-server";
export async function POST(request: Request) {
  const limited = await liveLimit(request); if (limited) return limited;
  try { const body = await jsonBody(request);
    if (body.cloudConsent !== true || body.sessionActive !== true) return result({ error: "사진을 클라우드 AI로 분석하는 데 동의하고 세션을 시작해주세요." }, 409);
    if (typeof body.image !== "string" || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(body.image) || body.image.length > 1_000_000 || !["meal", "mobility"].includes(String(body.mode))) return result({ error: "분석 가능한 JPEG 사진이 필요해요." }, 422);
    return agentRequest("/v1/perception/analyze", { image: body.image, mode: body.mode, cloud_consent: true });
  } catch { return result({ error: "사진 요청을 확인해주세요." }, 422); }
}
