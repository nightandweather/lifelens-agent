# Contributing to LifeLens

Start with [AGENTS.md](AGENTS.md), our shared instructions for humans and coding
agents. Claude's entry point is [CLAUDE.md](CLAUDE.md). Regional API contributors
also read [the provider guide](docs/REGIONAL_APIS.md).

## 한국어 요약

공통 기능과 국가별 API 연동을 모두 main에 모읍니다. 작업마다 짧은 브랜치를
만들어 PR로 합치고, 국가별 차이는 코드와 설정으로 분리합니다. 국가별 영구
브랜치를 유지하지 않습니다. 키는 각자 로컬 환경에만 설정하고, 배포용 키는
배포 담당자가 관리합니다. 대회 마감 이후에는 제출본 보존 지침을 따릅니다.

## Branch and review workflow

1. Check [submission freeze dates](docs/SUBMISSION_FREEZE.md) and git status.
2. Start a focused branch from current main: feat/voice-question,
   feat/weather-kr, feat/weather-us, fix/weather-timezone, docs/setup.
3. Describe behavior changes or new data sources in an issue or draft PR before
   large edits. Link existing discussion instead of creating duplicates.
4. Keep shared contracts and country-specific parsing separate. Coordinate edits
   to schemas, consent, credentials and provider selection with other contributors.
5. Run relevant checks and open a PR into main. Request another contributor's
   review. The maintainer can merge routine documentation after checking it.
6. Merge only with passing required CI and resolved review comments, then delete
   the completed branch. Do not force-push main or overwrite another person's work.

These are collaboration conventions. GitHub permissions, branch protection and
required reviewer settings are separate administrative settings, not configured
by this document. Repository access alone does not establish hackathon team
membership; coordinate contribution credit and entry details with the submitter.

## Checks by change

- Documentation only: check relative links and git diff --check; application
  tests need not run locally. Any CI triggered by the PR must still pass.
- Web/API: npm ci, npm test (includes the build), and npx tsc --noEmit.
  Run lint for changed code and report any existing lint failures accurately.
- Python agent/safety: install backend/requirements.txt in a virtual environment,
  then run pytest from backend/.
- Android: with Java 17, Gradle 8.9 and Android SDK 35, run
  gradle testDebugUnitTest lintDebug assembleDebug from android-vuzix/.
  Signed release CI uses maintainer-managed secrets; never share signing keys.
- Cross-layer changes: run the relevant checks for each affected component.

Tests should exercise consent, missing/stale data, unit/time conversions and
failure behavior. Use sanitized fixtures by default. Production paid API calls
and physical-device validation are separate evidence, not prerequisites for docs.

## Pull-request expectations

Explain the user problem, resulting behavior and validation. Mark fixture/demo,
live API integration and physically tested behavior accurately. Include a screen
capture for UI changes, with no private data. Preserve uncertainty for calorie,
social and route suggestions. Do not commit credentials, private media, health
records or proprietary data. Keep raw media outside MomentEvent; the distinct
live photo path requires explicit cloud-photo consent. New stored records and
agent actions that change data require confirmation of the exact action.
