# LifeLens for Vuzix — store listing draft

## App name

LifeLens

## Monetization

Free. No external billing.

## Category

Productivity; Health & Fitness; Utilities; Developer / Demo

## Description

LifeLens is a privacy-first context agent prototype for Vuzix M400/M4000 smart
glasses. It places a minimal heads-up layer over the live camera view and turns
user-enabled moments into one proposed next action.

The prototype demonstrates meal estimates with optional activity comparisons,
weather-aware running guidance, and neutral commitment capture from a temporary
voice session. Camera and microphone permissions are requested separately. Raw
audio is not stored, location is not shared, and every consequential action
requires an explicit center-button confirmation.

This is a hackathon prototype and not a medical device. Calorie, body, exercise,
route, and safety information are estimates and must not replace professional
advice or the user's own judgment.

## Installation guide

Install through the Vuzix App Store on a registered M400/M4000. Launch LifeLens,
grant camera access for the live view, and optionally grant microphone access
for a temporary voice moment. Use left/right to change moment, center to confirm,
and Enter to start a voice moment.

## Support

- Source and issues: https://github.com/nightandweather/lifelens-agent
- Project note: https://nightandweather.github.io/projects/lifelens.html

## Review notes

- Package: `com.kanghoun.lifelens.vuzix`
- Version name/code: `0.2.0` / `2`
- Target: Vuzix M400/M4000, landscape HUD
- Uses platform Camera2 and Android SpeechRecognizer APIs.
- Current build is an interaction and hardware-integration prototype; agent
  responses shown in the APK are deterministic demo data.
