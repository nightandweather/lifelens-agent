export type Mode = "meal" | "mobility";
export type Coordinates = { latitude: number; longitude: number; accuracy?: number; capturedAt?: number };
export type Source = { name: string; url: string; fetchedAt: string };
export type WeatherHour = { time: string; precipitation: number | null; precipitationLabel: string; probability: number | null; temperature: number | null };
export type WeatherReport = { source: Source; provider: "kma" | "open-meteo"; fallbackReason?: string; issuedAt: string; hours: WeatherHour[]; headline: string; detail: string; alertKey: string; location: Coordinates };
export type FoodEstimate = { name: string; kcalLow: number; kcalHigh: number; portion: string; basis: string };
export type Observation = { scene: "food" | "outdoor" | "other"; headline: string; description: string; confidence: number; visibleText: string[]; food: FoodEstimate | null; rainVisible: boolean; uncertainty: string; signature: string; source: Source };
export type Place = { id: string; name: string; address: string; distance: number | null; url: string };
