import type { Coordinates, WeatherHour, WeatherReport } from "./live-types";

// KMA Lambert conformal grid: 5 km, standard parallels 30/60, origin 126E/38N.
export function kmaGrid({ latitude, longitude }: Coordinates) {
  const rad = Math.PI / 180, re = 6371.00877 / 5;
  const sn = Math.log(Math.cos(30 * rad) / Math.cos(60 * rad)) / Math.log(Math.tan(Math.PI / 4 + 60 * rad / 2) / Math.tan(Math.PI / 4 + 30 * rad / 2));
  const sf = Math.pow(Math.tan(Math.PI / 4 + 30 * rad / 2), sn) * Math.cos(30 * rad) / sn;
  const ro = re * sf / Math.pow(Math.tan(Math.PI / 4 + 38 * rad / 2), sn);
  const ra = re * sf / Math.pow(Math.tan(Math.PI / 4 + latitude * rad / 2), sn);
  let theta = (longitude - 126) * rad; if (theta > Math.PI) theta -= 2 * Math.PI; if (theta < -Math.PI) theta += 2 * Math.PI; theta *= sn;
  return { nx: Math.floor(ra * Math.sin(theta) + 43 + .5), ny: Math.floor(ro - ra * Math.cos(theta) + 136 + .5) };
}
export function kmaBase(now = new Date()) {
  // The xx:30 forecast becomes available after xx:45. Leave a five-minute margin.
  const kst = new Date(now.getTime() + 9 * 3600_000 - 50 * 60_000);
  const baseDate = kst.toISOString().slice(0, 10).replaceAll("-", "");
  return { baseDate, baseTime: `${String(kst.getUTCHours()).padStart(2, "0")}30` };
}
export function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value); return Number.isFinite(number) && number > -900 ? number : null;
}
export function rainValue(value: unknown): number | null {
  if (value === "강수없음" || value === "강수 없음") return 0;
  if (typeof value === "string" && /미만|이상|~/.test(value)) return null;
  return numeric(typeof value === "string" ? value.replace(/mm/g, "").trim() : value);
}
export function hasRain(hour: WeatherHour) {
  return (hour.precipitation !== null && hour.precipitation > 0) || (hour.precipitationLabel !== "자료 없음" && /미만|이상|~/.test(hour.precipitationLabel));
}
export function describeWeather(hours: WeatherHour[], now: Date) {
  const wet = hours.find(hasRain);
  const unknown = hours.some(h => h.precipitation === null && h.precipitationLabel === "자료 없음");
  const max = Math.max(0, ...hours.map(h => h.precipitation ?? 0));
  const time = wet ? new Date(wet.time).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }) : "";
  return {
    headline: wet ? `${time} 예보에 강수가 있어요` : unknown ? "일부 강수 자료를 확인하지 못했어요" : "가까운 시간대에 강수 예보가 없어요",
    detail: wet ? `해당 시간대 예상 강수량 ${wet.precipitationLabel}. 출발 전 우산을 확인하세요. 시간별 예보로 정확한 시작·종료 분은 알 수 없어요.` : "현재 위치의 시간별 예보예요. 이동 경로 전체나 실제 빗방울을 관측한 결과는 아니에요.",
    alertKey: wet ? `rain:${wet.time}:${max >= 10 ? "heavy" : max >= 3 ? "moderate" : "light"}` : `dry:${now.toISOString().slice(0, 13)}`,
  };
}
export async function fetchKma(location: Coordinates, key: string, now = new Date()): Promise<WeatherReport> {
  const { nx, ny } = kmaGrid(location); const { baseDate, baseTime } = kmaBase(now);
  const url = new URL("https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst");
  let decodedKey = key; try { decodedKey = decodeURIComponent(key); } catch { /* Already decoded. */ }
  url.search = new URLSearchParams({ serviceKey: decodedKey, pageNo: "1", numOfRows: "1000", dataType: "JSON", base_date: baseDate, base_time: baseTime, nx: String(nx), ny: String(ny) }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("KMA unavailable");
  const data = await response.json() as { response?: { header?: { resultCode?: string }; body?: { items?: { item?: Array<{ fcstDate: string; fcstTime: string; category: string; fcstValue: string }> } } } };
  if (String(data?.response?.header?.resultCode) !== "00") throw new Error("KMA no valid forecast");
  const items = data.response?.body?.items?.item;
  if (!Array.isArray(items)) throw new Error("KMA missing forecast");
  const grouped = new Map<string, Record<string, unknown>>();
  for (const item of items) { const date = String(item.fcstDate), time = String(item.fcstTime).padStart(4, "0"); if (!/^\d{8}$/.test(date) || !/^\d{4}$/.test(time)) continue;
    const at = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2)}:00+09:00`;
    grouped.set(at, { ...grouped.get(at), [item.category]: item.fcstValue });
  }
  const hours: WeatherHour[] = [...grouped].sort(([a], [b]) => a.localeCompare(b)).filter(([time]) => Date.parse(time) >= now.getTime()).slice(0, 6).map(([time, values]) => ({ time, precipitation: rainValue(values.RN1), precipitationLabel: values.RN1 == null ? "자료 없음" : /mm|강수/.test(String(values.RN1)) ? String(values.RN1) : `${values.RN1} mm`, probability: null, temperature: numeric(values.T1H) }));
  if (!hours.length) throw new Error("KMA stale forecast");
  return { provider: "kma", source: { name: "기상청 초단기예보", url: "https://www.data.go.kr/data/15084084/openapi.do", fetchedAt: now.toISOString() }, issuedAt: `${baseDate.slice(0, 4)}-${baseDate.slice(4, 6)}-${baseDate.slice(6)}T${baseTime.slice(0, 2)}:30:00+09:00`, hours, location, ...describeWeather(hours, now) };
}
export async function fetchOpenMeteo(location: Coordinates, now = new Date()): Promise<WeatherReport> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), hourly: "temperature_2m,precipitation,precipitation_probability", forecast_days: "2", timezone: "UTC" }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("Weather unavailable");
  const data = await response.json() as { hourly?: { time?: string[]; precipitation?: unknown[]; temperature_2m?: unknown[]; precipitation_probability?: unknown[] } };
  if (!Array.isArray(data?.hourly?.time)) throw new Error("Missing weather");
  const hours: WeatherHour[] = data.hourly.time.map((time: string, i: number) => { const precipitation = numeric(data.hourly!.precipitation?.[i]); return { time: `${time}Z`, precipitation, precipitationLabel: precipitation === null ? "자료 없음" : `${precipitation} mm`, temperature: numeric(data.hourly!.temperature_2m?.[i]), probability: numeric(data.hourly!.precipitation_probability?.[i]) }; }).filter((h: WeatherHour) => Date.parse(h.time) >= now.getTime()).slice(0, 6);
  if (!hours.length) throw new Error("Stale weather");
  return { provider: "open-meteo", source: { name: "Open-Meteo 기상 모델", url: "https://open-meteo.com/", fetchedAt: now.toISOString() }, issuedAt: now.toISOString(), hours, location, ...describeWeather(hours, now) };
}
