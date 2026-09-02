# Hardware integration

LifeLens keeps a common event contract while device adapters handle capture,
controls, and display differences.

## Vuzix M400 / M4000

The repository includes a native Android prototype under `android-vuzix/`.
Current capabilities:

- Camera2 preview rendered behind the HUD;
- separate camera and microphone permissions;
- temporary speech recognition;
- left/right D-pad navigation;
- center-button approval;
- clear status when camera or voice is unavailable.

Build locally with Java 17 and Android SDK 35:

```bash
cd android-vuzix
gradle assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The signed release workflow requires these GitHub Actions secrets:

```text
VUZIX_KEYSTORE_BASE64
VUZIX_KEYSTORE_PASSWORD
VUZIX_KEY_ALIAS
VUZIX_KEY_PASSWORD
```

Never commit a keystore or password. A successful workflow uploads the signed
APK as a run artifact.

## Ray-Ban bridge

`RayBanMockAdapter` demonstrates the downstream contract; it is not presented
as a completed native integration. A physical-device bridge should:

1. begin only after an explicit visible action;
2. sample camera/audio during the active moment;
3. derive a bounded list of observations;
4. set `raw_media_retained=false` only after deletion succeeds;
5. send the minimized event over an authenticated channel.

## Device validation checklist

- Measure first-response and sustained-response latency.
- Test camera and voice permission denial separately.
- Confirm every capture state is visible in the HUD.
- Verify D-pad controls with gloves and while walking.
- Record battery and thermal behavior at 10, 30, and 60 minutes.
- Test network loss during analysis and confirmation.
- Confirm raw samples are absent from logs, caches, crash reports, and backups.
- Treat route, calorie, and activity outputs as estimates in every screen.
