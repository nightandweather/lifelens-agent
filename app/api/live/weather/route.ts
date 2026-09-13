import { coordinates, jsonBody, result } from "../../../../lib/live-server";
import { fetchKma, fetchOpenMeteo } from "../../../../lib/weather";
export async function POST(request: Request) {
  let location;
  try { const body = await jsonBody(request, 2048); if (body.locationConsent !== true) return result({ error: "날씨 조회에는 위치 사용 동의가 필요해요." }, 409); location = coordinates(body.location); } catch { return result({ error: "올바른 위치와 동의가 필요해요." }, 422); }
  const key = process.env.KMA_SERVICE_KEY;
  const korea = location.latitude >= 33 && location.latitude <= 39.5 && location.longitude >= 124 && location.longitude <= 132;
  if (key && korea) { try { return result(await fetchKma(location, key)); } catch { /* Explicitly label fallback below. */ } }
  try { const report = await fetchOpenMeteo(location); report.fallbackReason = !korea ? "기상청 서비스 지역 밖이라 Open-Meteo 예보를 사용해요." : key ? "기상청 응답을 받지 못해 Open-Meteo 예보를 사용해요." : "기상청 연결 전이라 Open-Meteo 예보를 사용해요."; return result(report); } catch { return result({ error: "날씨를 가져오지 못했어요. 이전 정보를 최신 예보로 사용하지 않아요." }, 502); }
}
