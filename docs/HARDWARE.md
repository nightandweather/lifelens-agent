# Hardware integration

LifeLens keeps a common event contract while device adapters handle capture,
controls, and display differences.

## Vuzix M400 / M4000

The repository includes a native Android prototype under `android-vuzix/`.
Current native flow (version 0.3.0):

1. Start and consent to cloud analysis, then grant camera permission. A reduced
   640×480 JPEG is sent only while the activity is foregrounded. Stable scenes
   are sampled every three seconds; automatic requests are at least 20 seconds
   apart and an unchanged scene is not resubmitted. “다시 보기” explicitly retries.
2. The HUD shows actual server observations and estimated calorie ranges. Voice
   output is opt-in. Repeated identical notices are suppressed for three minutes.
3. “질문” uses the installed Android speech-recognition service with `ko-KR`, then
   sends the transcript with current context. If recognition is unavailable,
   a text dialog is offered. Korean recognition and TTS availability on M400
   firmware require physical verification; the app does not bundle a speech engine.
4. “날씨” separately asks for approximate location. No fixed demo location is used.
   A network location provider must exist on the glasses. In commute mode a
   consented weather query refreshes every five minutes while foregrounded.
   KMA is used only when configured; Open-Meteo fallback is explicitly labeled.
5. “기록” opens a confirmation dialog and stores only the food name, calorie range
   and timestamp on this device (last 20 records). The records dialog can delete them.
6. Stop, Back or leaving the activity closes camera/microphone, cancels requests,
   and discards volatile observations. Late responses cannot revive a stopped session.

There is no device pairing, iPhone location relay, background capture or local
vision model in this native live path yet. Photos are held in memory for the
request, not written to disk. AWS credentials stay on the server. The legacy
local-perception interfaces remain a separate future adapter boundary.

## Build and install

Use Java 17, Gradle 8.9 and Android SDK 35:

```bash
cd android-vuzix
gradle testDebugUnitTest lintDebug assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

For a signed APK, open the repository's **Build signed Vuzix APK** Actions run
and download the `lifelens-vuzix-release` artifact. Install its `app-release.apk`
with `adb install -r`. If an older installation uses a different signing key,
Android will reject an update; uninstalling it first deletes its local records.
The release workflow uses the existing GitHub secrets:

```text
VUZIX_KEYSTORE_BASE64
VUZIX_KEYSTORE_PASSWORD
VUZIX_KEY_ALIAS
VUZIX_KEY_PASSWORD
```

Never commit a keystore or password. API base is the public LifeLens Site in
`MainActivity`; there are no AWS tokens or API keys in the APK. Distribution is
for device testing, not a completed Vuzix store submission.

Official device references: [Vuzix Camera2 guidance](https://support.vuzix.com/docs/camera),
[M400/M4000 technical details](https://support.vuzix.com/docs/m400-m4000-technical-details),
[Vuzix Voice Input](https://apps.vuzix.com/app/vuzix-voice-input).

## Ray-Ban Meta

Meta's official Wearables Device Access Toolkit extends a companion iOS or
Android application rather than installing this Vuzix APK on the glasses.

- Camera: SDK video streaming and photo capture for Ray-Ban Meta Gen 1/2.
- Audio: microphone and speakers through the phone platform's Bluetooth profiles.
- Display: only Meta Ray-Ban Display models expose a display path.
- Development without glasses: Meta's Mock Device Kit simulates permissions,
  device state, and media streaming.
- Distribution: developer preview release channels, not general publishing yet.

LifeLens should sample the stream in the companion app, run Core ML/Vision or an
Android local model, and discard raw frames before producing `MomentEvent`.
See [`../rayban-meta/README.md`](../rayban-meta/README.md).

## Device validation checklist

- Measure first-response and sustained-response latency.
- Test camera and voice permission denial separately.
- Confirm every capture state is visible in the HUD.
- Verify D-pad controls with gloves and while walking.
- Record battery and thermal behavior at 10, 30, and 60 minutes.
- Test network loss during analysis and confirmation.
- Confirm raw samples are absent from logs, caches, crash reports, and backups.
- Treat route, calorie, and activity outputs as estimates in every screen.
