# LifeLens demo video script

Target length: **3 minutes**. The final upload must be public on
YouTube or Vimeo and remain under the hackathon's five-minute limit.

## 0:00–0:20 — Problem and audience

Show a quick sequence of lunch, work, sitting at home, and walking outside.

> People do not need another chatbot to manage. They need an agent that notices
> a useful moment, understands only the context they allowed, and asks before it
> acts. LifeLens is for people who want practical support from smart glasses
> without turning their day into a permanent recording.

## 0:20–0:38 — Product promise

Open the public site and pause/resume the private session.

> LifeLens converts short camera, voice, movement, and health signals into a
> minimized MomentEvent. Raw media is discarded. The agent proposes one next
> action, explains why, and waits for approval.

## 0:38–1:38 — Working end-to-end demo

1. Select **Lunch**.
2. Press **Analyze with live AI** and wait for the `BEDROCK RESPONSE` label.
3. Read the observation, uncertainty, and proposed action.
4. Approve the action and show the receipt.
5. Point to the four-stage judge path: Observe, Reason, Confirm, Receipt.
6. Pause the session and show that analysis becomes unavailable.

Say explicitly that the button calls the deployed Python Strands agent on AWS
Lambda, which invokes Amazon Bedrock. Do not call the deterministic scene text
an AI response.

## 1:38–2:15 — Architecture

Show `docs/architecture.png`, then briefly open the repository directories.

> Vuzix, Ray-Ban, phone, and web inputs share one hardware-neutral event schema.
> Local perception minimizes frames. Strands handles reasoning through Bedrock.
> A second validator checks the response, and a separate consent gate blocks
> every unconfirmed action.

Show `backend/lifelens/agent.py`, `backend/lifelens/safety.py`, the tests, and the
Vuzix Android project without dwelling on code.

## 2:15–2:42 — Why it matters

> LifeLens applies to meals, commitments, movement, and navigation, but its real
> contribution is the boundary: useful context without unlimited surveillance,
> and assistance without hidden action. The same contract can move from today's
> web judge path to real glasses when hardware is available.

## 2:42–3:00 — Status and close

Show the live URL, passing GitHub Actions checks, and the signed Vuzix APK
release. Clearly label physical-device validation as pending.

> The public demo is free to test, the repository is MIT licensed, and every
> required component is reproducible from the judge guide. LifeLens is an agent
> that looks out for you, not over you.

## Recording checklist

- Record at 1080p with the browser zoomed so text is legible.
- Use English narration or add accurate English subtitles.
- Show the live Bedrock response label and one approved receipt.
- Include problem, audience, and why it matters in spoken narration.
- Upload publicly to YouTube or Vimeo and add the URL to the README and Devpost.
