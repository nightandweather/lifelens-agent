import { coordinates, jsonBody, result } from "../../../../lib/live-server";
export async function POST(request: Request) {
  let location;
  try { const body = await jsonBody(request, 2048); if (body.locationConsent !== true) return result({ error: "주변 식당 조회에는 위치 사용 동의가 필요해요." }, 409); location = coordinates(body.location); } catch { return result({ error: "위치를 확인해주세요." }, 422); }
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return result({ places: [], available: false, message: "주변 식당 검색을 준비 중이에요. 식당 이름은 직접 입력할 수 있어요." });
  const url = new URL("https://dapi.kakao.com/v2/local/search/category.json");
  url.search = new URLSearchParams({ category_group_code: "FD6", x: String(location.longitude), y: String(location.latitude), radius: "150", sort: "distance", size: "5" }).toString();
  try { const response = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` }, signal: AbortSignal.timeout(8000) }); if (!response.ok) throw new Error(); const data = await response.json() as { documents: Record<string, string>[] };
    return result({ available: true, places: data.documents.map((p: Record<string, string>) => ({ id: p.id, name: p.place_name, address: p.road_address_name || p.address_name, distance: p.distance ? Number(p.distance) : null, url: p.place_url })), source: { name: "카카오 로컬", url: "https://map.kakao.com/", fetchedAt: new Date().toISOString() } });
  } catch { return result({ error: "주변 식당 정보를 가져오지 못했어요." }, 502); }
}
