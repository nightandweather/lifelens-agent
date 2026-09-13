import { result } from "../../../../lib/live-server";
export async function GET() { return result({ visionConfigured: !!process.env.LIFELENS_LIVE_API_URL && !!process.env.LIFELENS_LIVE_TOKEN, kmaConfigured: !!process.env.KMA_SERVICE_KEY, placesConfigured: !!process.env.KAKAO_REST_API_KEY }); }
