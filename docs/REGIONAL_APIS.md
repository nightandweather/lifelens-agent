# Regional API integrations

## Workflow

A contributor can own a provider without owning a permanent country branch.
Example: branch feat/weather-us from main, implement and test the provider, open
one PR, merge to main and delete the completed branch. Common features reach all
countries through that same main. UI language, country coverage and provider
choice are separate concepts.

## Current implementation and proposed structure

Today weather normalization lives in lib/weather.ts, selection in
app/api/live/weather/route.ts, and the shared contract in lib/live-types.ts.
KMA/Open-Meteo are the currently typed providers. Restaurant lookup lives in
app/api/live/places/route.ts. This document does not add a new provider or refactor
those files.

When a new provider is implemented, split provider-specific parsing into a
module such as lib/providers/weather/kma.ts or lib/providers/weather/us-provider.ts
and keep selection/normalization shared. These paths are a proposed layout, not
existing modules. Use ISO 3166-1 alpha-2 region codes (KR, US, etc.) in explicit
configuration. A provider can cover multiple regions; a country can have several
providers. Keep device capture separate from provider adapters.

## Weather contract

Use WeatherReport, WeatherHour, Coordinates and Source in lib/live-types.ts.
Any added provider identifier requires a coordinated type update and review of
all web/Android consumers. Do not create an incompatible national response shape.

| Field | Required behavior |
| --- | --- |
| provider / source | Identify the provider actually used, with its source URL and fetch time |
| issuedAt | Preserve the provider's publication time when available; explicitly document when only retrieval time is available |
| hours[].time | An ISO timestamp with timezone/offset; convert display timezone separately |
| precipitation | Millimetres for the interval documented by the adapter; null means unknown, not zero |
| precipitationLabel | Preserve categories such as less than 1 mm or 30–50 mm; do not invent an exact number |
| probability | Percent 0–100, or null; never interpret precipitation amount as probability |
| temperature | Degrees Celsius, or null; convert upstream units explicitly |
| location | Minimum necessary consented location; do not fabricate demo coordinates |
| fallbackReason | Explain an actual fallback, including unavailable credentials or unsupported region |

Each provider PR must document forecast interval/accumulation semantics and
resolution so the UI cannot compare incompatible quantities. The current shared
shape may require an additive schema change for a new provider; coordinate it
before implementation rather than silently coercing data.

## Provider acceptance checklist

- Link official API documentation; state geographic coverage, credentials,
  attribution requirements, rate limits and response semantics.
- Add placeholder environment variables to .env.example and setup instructions.
  Production secrets are configured by the deployment owner.
- Use timeouts, bounded responses and explicit failure/fallback behavior.
  Missing credentials or stale/invalid data must never appear as a live forecast.
- Request only user-consented location. Explain provider fallback in the consent
  and output flow; keep secrets and coordinates out of logs and URLs shown to users.
- Test sanitized fixtures for success, missing values, categorical ranges,
  timezone/day boundaries, unit conversion, timeout and upstream failure.
- Verify optional live integration with your own credentials and consented test
  coordinates. Report it separately from fixture tests; no secrets in evidence.
- Ensure existing KR and fallback behavior still works and review Android consumers.

The same principles apply to regional place/food databases: shared output,
provider attribution, uncertainty and country-specific parsing behind an adapter.
