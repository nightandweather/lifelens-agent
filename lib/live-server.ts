import type { Coordinates } from "./live-types";

export function coordinates(value: unknown): Coordinates {
  if (!value || typeof value !== "object") throw new Error("위치 권한을 켜고 다시 시도해주세요.");
  const { latitude, longitude } = value as Coordinates;
  if (typeof latitude !== "number" || typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error("올바른 위치가 필요해요.");
  return { latitude: Math.round(latitude * 1000) / 1000, longitude: Math.round(longitude * 1000) / 1000 };
}
export async function jsonBody(request: Request, maxBytes = 1_100_000): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new Error("JSON 요청이 필요해요.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("요청 내용이 없어요.");
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > maxBytes) { await reader.cancel(); throw new Error("사진이 너무 커요. 작은 사진으로 다시 시도해주세요."); } chunks.push(value); } } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const body = JSON.parse(new TextDecoder().decode(bytes));
  if (!body || Array.isArray(body) || typeof body !== "object") throw new Error("요청 형식이 올바르지 않아요.");
  return body;
}
export function result(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "no-store" } }); }
export async function agentRequest(path: string, body: unknown) {
  const base = process.env.LIFELENS_LIVE_API_URL?.replace(/\/$/, "");
  if (!base || !process.env.LIFELENS_LIVE_TOKEN) return result({ error: "AI 연결을 준비 중이에요. 날씨 조회는 사용할 수 있어요.", code: "not_configured" }, 503);
  try {
    const response = await fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LIFELENS_LIVE_TOKEN}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(45_000) });
    if (!response.ok) return result({ error: response.status === 404 ? "실시간 영상 분석 서버를 업데이트 중이에요." : "AI가 응답하지 못했어요. 잠시 후 다시 시도해주세요." }, 502);
    return result(await response.json());
  } catch { return result({ error: "AI 연결이 지연되고 있어요. 다시 시도해주세요." }, 504); }
}
