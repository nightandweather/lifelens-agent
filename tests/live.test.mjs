import assert from "node:assert/strict";
import test from "node:test";
import { AmbientGate, activityMinutes, frameDifference } from "../lib/ambient.ts";
import { kmaBase, kmaGrid, rainValue, describeWeather, fetchKma, fetchOpenMeteo } from "../lib/weather.ts";

test("KMA grid and publication rollover use Korean local time", () => {
  assert.deepEqual(kmaGrid({ latitude: 37.5665, longitude: 126.978 }), { nx: 60, ny: 127 });
  assert.deepEqual(kmaBase(new Date("2026-09-13T00:20:00+09:00")), { baseDate: "20260912", baseTime: "2330" });
  assert.deepEqual(kmaBase(new Date("2026-09-13T10:50:00+09:00")), { baseDate: "20260913", baseTime: "1030" });
});
test("categorical rain and missing data do not become fabricated exact values", () => {
  assert.equal(rainValue("1.0mm 미만"), null); assert.equal(rainValue("30.0~50.0mm"), null); assert.equal(rainValue("강수없음"), 0); assert.equal(rainValue("2.5mm"), 2.5); assert.equal(rainValue(-998), null);
  const report = describeWeather([{ time: "2026-09-13T10:00:00Z", precipitation: null, precipitationLabel: "1.0mm 미만" }], new Date()); assert.match(report.headline, /강수/); assert.doesNotMatch(report.headline, /없어요/);
});
test("ambient notifications suppress repeats but allow changed and later contexts", () => {
  const gate = new AmbientGate(); assert.equal(gate.shouldNotify("food", .4, 0), false); assert.equal(gate.shouldNotify("food", .8, 0), true); assert.equal(gate.shouldNotify("food", .8, 1000), false); assert.equal(gate.shouldNotify("rain", .8, 1000), true); assert.equal(gate.shouldNotify("food", .8, 181000), true); gate.reset(); assert.equal(gate.shouldNotify("food", .8, 181001), true);
});
test("activity comparison is computed from weight and MET and rejects invalid inputs", () => {
  assert.equal(activityMinutes(700, 70, 3.8), 150); assert.equal(activityMinutes(700, 0, 3.8), null); assert.equal(activityMinutes(700, NaN, 3.8), null); assert.equal(activityMinutes(700, 70, 0), null);
  assert.equal(frameDifference(new Uint8ClampedArray([0, 0, 0, 255]), new Uint8ClampedArray([255, 255, 255, 255])), 1);
});
test("KMA parser preserves category ranges and reports actual publication time", async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ response: { header: { resultCode: "00" }, body: { items: { item: [{ fcstDate: "20260913", fcstTime: "2000", category: "RN1", fcstValue: "1.0mm 미만" }, { fcstDate: "20260913", fcstTime: "2000", category: "T1H", fcstValue: "22" }] } } } });
  try { const report = await fetchKma({ latitude: 37.5665, longitude: 126.978 }, "fixture", new Date("2026-09-13T10:00:00Z")); assert.equal(report.provider, "kma"); assert.equal(report.hours[0].precipitation, null); assert.equal(report.hours[0].precipitationLabel, "1.0mm 미만"); assert.equal(report.issuedAt, "2026-09-13T18:30:00+09:00"); } finally { globalThis.fetch = oldFetch; }
});
test("weather provider errors do not produce a fake dry forecast", async () => {
  const oldFetch = globalThis.fetch; globalThis.fetch = async () => Response.json({ hourly: { time: [] } });
  try { await assert.rejects(fetchOpenMeteo({ latitude: 37, longitude: 127 })); } finally { globalThis.fetch = oldFetch; }
});

test("same-origin guard and short-lived model request budget reject abuse", async () => {
  const { liveLimit } = await import("../lib/live-limit.ts");
  const crossSite = new Request("https://lifelens.example/api/live/vision", { headers: { origin: "https://other.example" } });
  assert.equal((await liveLimit(crossSite)).status, 403);
  const sameSite = new Request("https://lifelens.example/api/live/vision", { headers: { origin: "https://lifelens.example" } });
  for (let i = 0; i < 8; i++) assert.equal(await liveLimit(sameSite), null);
  assert.equal((await liveLimit(sameSite)).status, 429);
});
