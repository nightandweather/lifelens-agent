# Device adapters and delivery scope

LifeLens shares server perception, context questions and sourced weather. Each
client owns camera permissions, foreground session state, input controls and
presentation. Hardware support must not be inferred from a working web demo.

| Target | Current implementation | Next evidence needed |
| --- | --- | --- |
| Vuzix M400/M4000 | Native Camera2 → reduced JPEG → live server → Android HUD; optional system speech/TTS; location weather | Signed APK build, then real camera orientation, controls, language services, location, latency and battery checks |
| iPhone browser | Foreground camera/upload, voice when supported, location weather | Browser permissions and actual phone testing |
| Meta Ray-Ban | Existing integration plan/fixtures only | Select exact model and SDK entitlement; implement companion camera/session adapter and verify available output channels |
| Samsung | Architecture scope only | Select exact device and supported SDK before implementing capture or display |

## Shared live boundary

- `POST /api/live/vision`: `image` (JPEG data URL), `mode` (`meal` or `mobility`),
  `cloudConsent: true`, `sessionActive: true`; returns `Observation`.
- `POST /api/live/question`: `question` (up to 500 characters), optional
  `observation` and fresh `weather`, `sessionActive: true`; returns an answer.
- `POST /api/live/weather`: approximate `location` and `locationConsent: true`;
  returns `WeatherReport`, including source and fallback reason.
- Type definitions live in `lib/live-types.ts`; the Android transport boundary is
  `ContextGateway`. Device-specific SDKs must not be added to server reasoning.

A future adapter should expose camera, microphone, display, audio output and
location as independent capabilities, enabling only verified ones. A headset
brand does not imply support for an XR overlay. The original local-only
`MomentEvent` pipeline remains distinct from this explicitly consented live
cloud-image API; neither route should silently change its privacy contract.

## Hackathon demonstration

Show one complete Vuzix loop first: opt in, see actual food, get a range, ask a
question and explicitly record it. Demonstrate weather only with a real location
and display the actual provider. Keep the browser demo as an accessible fallback.
Describe Meta and Samsung as planned adapters until their own device checks pass.
