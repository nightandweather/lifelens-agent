# Contributing to LifeLens

Thank you for improving a human-first wearable agent.

## Before opening a pull request

1. Open an issue for behavior changes or new data sources.
2. Keep raw image, video, and audio outside the agent event contract.
3. Require explicit confirmation for every action that stores or changes data.
4. Add or update tests when changing safety, models, tools, or API behavior.
5. Run the web build and Python tests locally.

```bash
npm ci
npm test
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest
```

## Pull-request expectations

- Explain the user problem and the smallest behavior change that solves it.
- Distinguish simulated, integration-ready, and physically validated features.
- Include screenshots for interface changes.
- Do not add secrets, private recordings, real health records, or proprietary data.
- Preserve uncertainty language for health, social, and route suggestions.

Small documentation, accessibility, testing, and device-compatibility fixes are
especially welcome.
