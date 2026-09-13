/** Short-lived, per-isolate abuse guard. It is not a global billing quota. */
const windows = new Map<string, { start: number; count: number }>();
export async function liveLimit(request: Request): Promise<Response | null> {
  const now = Date.now();
  for (const [key, value] of windows) if (now - value.start > 60_000) windows.delete(key);
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return Response.json({ error: "같은 LifeLens 화면에서 요청해주세요." }, { status: 403 });
  const address = request.headers.get("cf-connecting-ip") || "local";
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(address + Math.floor(now / 60_000)));
  const key = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  const current = windows.get(key) || { start: now, count: 0 };
  const total = windows.get("total") || { start: now, count: 0 };
  if (current.count >= 8 || total.count >= 40) return Response.json({ error: "잠시 쉬었다가 다시 요청해주세요." }, { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
  current.count++; total.count++; windows.set(key, current); windows.set("total", total);
  return null;
}
