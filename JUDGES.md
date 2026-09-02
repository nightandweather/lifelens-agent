# LifeLens judge guide

LifeLens is an **Everyday Agent** built for the Agents for Humans Hackathon.
This guide provides a fast, hardware-independent path for judging the working
system. All materials and user-facing copy are in English.

## Fastest evaluation path

1. Open the [public LifeLens demo](https://lifelens-agent.kanghoun.chatgpt.site).
2. Choose any of the four moments in the left rail.
3. Select **Analyze with live AI** to send the minimized structured moment to
   the deployed Strands + Amazon Bedrock service.
4. Inspect the observation, reasoning, uncertainty, and proposed action.
5. Approve the action and verify that a minimal receipt appears. No external
   side effect is performed by this public prototype.
6. Pause the session and verify that sensing and analysis stop immediately.

No Vuzix or Ray-Ban hardware is required for this evaluation path. The wearable
clients use the same `MomentEvent` contract demonstrated by the web experience.

## Local deterministic mode

The repository also includes a deterministic path so safety behavior remains
testable without an AWS account:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn lifelens.api:app --reload
curl -s -X POST http://127.0.0.1:8000/v1/moments/analyze \
  -H 'Content-Type: application/json' --data-binary @fixtures/meal.json
```

## Real Strands + Bedrock mode

Set `LIFELENS_DEMO_MODE=0`, provide standard AWS credentials with
`bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream`, then run the
same API. The public service uses AWS Lambda plus the global Amazon Nova 2 Lite
inference profile to keep latency and judging costs low. The function URL is
protected by a server-to-server bearer token; no AWS credential or token reaches
the browser.

## Expected safety behavior

- Raw images, video, and audio are rejected by the cloud event contract.
- Every proposal requires explicit confirmation.
- Conversation moments cannot infer emotion, honesty, intent, diagnosis, or
  personality.
- Health and calorie values remain ranges and are not medical advice.
- Declining an action creates no receipt and performs no external action.

## Known prototype limits

- Physical Vuzix and Ray-Ban validation depends on access to evaluation units.
- Camera perception is represented by hardware-neutral structured fixtures in
  the public judge path.
- The public demo intentionally avoids messages, purchases, calendar changes,
  and location sharing.

## Automated checks

```bash
npm test
cd backend && .venv/bin/pytest
```

GitHub Actions builds the web app, runs the agent safety suite, checks the Slurm
script, builds the Vuzix Android project, and verifies the release APK signature.
