# LifeLens Live — Wanted AI Championship 2026

## Product

LifeLens notices useful moments in the user's field of view and offers concise
information without repeated interruptions. The first physical-input prototype
runs at `/live` on an iPhone browser: camera HUD, scene-change sampling, opt-in
cloud visual perception, voice questions, and location-based weather.

The original `/` experience and original Strands endpoint remain available for
the earlier Agents for Humans entry. Do not represent the original scripted
numbers as measurements from this version.

## Implemented paths

- Camera permission → rear-camera video → local 24-pixel scene comparison →
  sampled JPEG (max dimension approximately 960px) → dedicated Bedrock Nova
  perception → typed observations and uncertain calorie range → HUD.
- Stable scene required, at least 20 seconds between automatic model requests,
  3-minute notification suppression by recognized food/scene, no overlapping
  vision requests. A manual recheck bypasses scene-change detection only.
- Location permission → coordinates rounded to 3 decimal places → KMA 5km
  forecast grid → next six hourly precipitation values. KMA publishing time,
  categorical rainfall intervals, missing data and midnight rollover handled.
- Explicitly labeled Open-Meteo fallback when KMA is unconfigured, outside Korea
  or unavailable. No invented minute-level rain onset or route safety claims.
- Korean browser speech recognition on a button gesture → follow-up AI answer
  grounded in current observation and fresh weather. Text input remains usable
  without speech support. Optional speech synthesis; default is silent.
- Optional Kakao Local restaurant candidates. User confirms the venue; nearest
  is not automatically treated as the current restaurant. No menu database yet.
- User-confirmed meal records persist **only in this browser** via localStorage;
  no photos, coordinates, weight or full transcripts are saved. Delete per record.
- Activity comparison is deterministic: kcal / (MET × 3.5 × kg / 200), gross
  energy expenditure. Walking: 3.8 MET at 2.8–3.4 mph; running: 6.5 MET at
  4–4.2 mph. This is not exercise advice or a debt to compensate for food.

## Explicit privacy-boundary change

The original project sends only locally derived observations. **The new `/live`
prototype optionally sends sampled JPEGs to Amazon Bedrock**, after a separate,
unselected consent checkbox. It does not claim on-device visual inference.
Raw media stays outside the original `MomentEvent` contract. The dedicated
perception handler does not persist images or log request bodies. Provider-side
processing is subject to AWS configuration and policies. Browser speech
recognition can use the browser vendor's service; the UI discloses this.

Stopping, switching modes, hiding the page or unmounting stops capture, aborts
client requests, cancels speech and discards session context. Already transmitted
server inference may finish; late responses are ignored using session epochs.
Saved, explicitly confirmed meal records survive session termination.

## Deployment

A reproducible SAM definition is in `template-wanted.yaml`. Use an isolated Lambda (`live_lambda_handler.handler`, Python 3.12) with the three
files `live_lambda_handler.py`, `lifelens/__init__.py`, `lifelens/live_context.py`.
The runtime supplies boto3. Set `LIFELENS_LIVE_TOKEN` on Lambda and the matching
secret on Sites. Set `LIFELENS_LIVE_API_URL` to its function URL. Allow Bedrock
InvokeModel for the configured Nova model and inference profile only.

`KMA_SERVICE_KEY` and `KAKAO_REST_API_KEY` belong in the Sites runtime secret set,
not Git. Local development uses ignored `.env.local`. Updating Sites values
requires deploying a version to apply them. The original demo uses its separate
`LIFELENS_AGENT_API_URL` / `LIFELENS_AGENT_TOKEN` variables.

The new API adds bounded request bodies, timeouts, origin checking and a
short-lived per-isolate rate limiter. This is not a globally enforced billing
quota. The initial AWS account did not permit reserving two concurrent executions;
check the account's concurrency quota before expanding public traffic.

## Validation and remaining release gates

Automated tests cover KMA grid/time/ranges, missing weather, repetition policy,
activity math, cloud consent, image bounds, model-output ranges, authentication,
and the original demo regression tests.

Before claiming physical-device support: test camera selection, autoplay,
permissions, Korean speech recognition, audio output, foreground interruption,
latency and battery on an actual iPhone. Browser feature support is not proof of
physical validation. No glasses transport, head tracking, world-anchored AR,
HealthKit, full walking-route engine or verified restaurant-menu lookup is shipped.

Before submission: collect measured latency and a small manually labeled image
set; record a complete two-scenario video; verify weather provenance and fallback
behavior; document the difference from the earlier entry. Keep the public web URL
available throughout judging. Participant registration and final submission are
performed by the user.

## Sources

- [Wanted official rules](https://static.wanted.co.kr/ai-championship/2026/landing.html)
- [KMA short-range forecast](https://www.data.go.kr/data/15084084/openapi.do)
- [Open-Meteo documentation](https://open-meteo.com/en/docs)
- [Kakao Local](https://developers.kakao.com/docs/ko/local/dev-guide)
- [Nova image understanding](https://docs.aws.amazon.com/nova/latest/userguide/modalities-image-examples.html)
- [2024 Compendium walking](https://pacompendium.com/walking/)
- [2024 Compendium running](https://pacompendium.com/running/)

## Initial integration evidence

On 2026-09-13, the deployed isolated Lambda returned a real photo analysis in
approximately 2.5 seconds for one public bibimbap photograph (single smoke test,
not a latency benchmark). The complete local web-proxy path took approximately
2.2 seconds in another call. A question without weather context correctly
reported missing information. Live Open-Meteo retrieval returned six upcoming
hourly rows for a fixed Seoul test coordinate. KMA and iPhone physical validation
remain separate gates until their connection/device checks are completed.
