# LifeLens — Agents for Humans Hackathon Goal

## Mission

Ship **LifeLens** as a credible, working **Everyday Agent** for the Agents for Humans Hackathon. LifeLens should use the Strands Agents SDK to turn consented wearable/phone context into useful proposals while staying quiet until the user has a real decision to make.

## Deadline

- Submission deadline: **2026-09-15 09:00 KST (GMT+9)**
- Hackathon: [Agents for Humans Hackathon](https://agentsforhumans.devpost.com/)
- Track: **Everyday Agents**

## Definition of done

- [x] A non-trivial Strands Agents implementation performs real work end to end.
- [x] The public demo calls the deployed AWS backend and returns a safe, structured response.
- [x] Amazon Bedrock is used by the live agent.
- [x] A public GitHub repository contains source, assets, setup instructions, README, and an open-source license.
- [x] An architecture diagram is visible in the repository.
- [x] The product experience covers meal, conversation commitment, evening activity, and mobility moments.
- [x] Sensitive actions require explicit confirmation; uncertainty and privacy limits are visible.
- [ ] A public demo video of no more than 5 minutes shows the working project end to end.
- [ ] The video pitch clearly covers the problem, audience, and why it matters.
- [ ] The Devpost entry contains the description, public repository URL, architecture diagram, video URL, AWS Builder ID, and live demo URL.
- [ ] Optional: publish an AWS Builder post with **Agents for Humans** in the title before the deadline.
- [ ] Optional: evaluate an Amazon Bedrock AgentCore deployment if its scoring benefit justifies the added cost and complexity.

## Judging targets

1. **Technological Implementation** — genuine Strands usage, working live demo, reproducible AWS setup, meaningful safety validation.
2. **Design** — a coherent product rather than a collection of disconnected mock screens.
3. **Potential Impact** — a specific case for helping consented users manage health, commitments, and routines.
4. **Creativity & Originality** — ambient assistance through smart glasses/phones without pretending to diagnose people or infer hidden intent.
5. **Presentation** — a concise, understandable end-to-end demonstration.

## 30-minute health-check contract

Every monitoring run should verify the following and report only meaningful state changes or failures:

1. The repository working tree is readable and `Goal.md` remains present.
2. GitHub `main` exists and the latest CI run for `nightandweather/lifelens-agent` has succeeded or is still running.
3. `npm test` passes when the current commit has not already been validated by a successful CI run.
4. The public site `https://lifelens-agent.kanghoun.chatgpt.site/` returns HTTP 200 and contains the LifeLens title.
5. `POST /api/analyze` with an active `meal` scene returns HTTP 200, `mode: strands-bedrock`, a structured analysis, and `requires_confirmation: true`.
6. AWS Lambda `LifeLensAgent` in `ap-northeast-2` is `Active` with a successful last update.
7. No secret token, credential, or private user data is printed in logs or reports.
8. If a check fails, identify the failing layer (repo, CI, site, Sites environment, Lambda, Bedrock, or safety contract), preserve evidence, and attempt only safe, reversible recovery within this repository.

## Current submission blockers

- Record and publicly upload the final demo video.
- Add the video URL and remaining required fields to the Devpost submission.
- Decide whether to publish the optional AWS Builder build story.

