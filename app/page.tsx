"use client";

import { useMemo, useState } from "react";

type SceneKey = "meal" | "conversation" | "evening";

type Scene = {
  key: SceneKey;
  time: string;
  label: string;
  eyebrow: string;
  title: string;
  summary: string;
  detail: string;
  action: string;
  secondary: string;
  metric: string;
  metricLabel: string;
  confidence: string;
};

const scenes: Scene[] = [
  {
    key: "meal",
    time: "12:38",
    label: "Lunch",
    eyebrow: "MEAL MOMENT",
    title: "A balanced lunch,\nwith room to adjust.",
    summary: "Bibimbap and miso soup detected. Estimated 620–760 kcal.",
    detail:
      "The portion looks vegetable-forward. The estimate stays a range until you confirm what was in the bowl.",
    action: "Log this meal",
    secondary: "Adjust estimate",
    metric: "690",
    metricLabel: "estimated kcal",
    confidence: "82% visual confidence",
  },
  {
    key: "conversation",
    time: "16:14",
    label: "Conversation",
    eyebrow: "SOCIAL MIRROR",
    title: "One promise worth\nfollowing through on.",
    summary: "You offered to send Mina the revised slides by Friday afternoon.",
    detail:
      "You spoke for most of the final minute. Next time, a simple “What do you think?” could make more room—without guessing how Mina felt.",
    action: "Add the follow-up",
    secondary: "Reflect privately",
    metric: "Fri",
    metricLabel: "follow-up due",
    confidence: "No personality inference",
  },
  {
    key: "evening",
    time: "20:42",
    label: "Evening",
    eyebrow: "NEXT BEST ACTION",
    title: "A small move will\nclose the loop.",
    summary: "You have been home and seated for 52 minutes after a low-movement day.",
    detail:
      "A 20-minute walk would move you toward today’s activity goal without pushing past your usual evening pace.",
    action: "Start a 20-min walk",
    secondary: "Remind me in 20 min",
    metric: "20",
    metricLabel: "minutes suggested",
    confidence: "Based on your routine",
  },
];

const timeline = [
  { time: "08:06", title: "Day started", note: "Home → commute", state: "done" },
  { time: "12:38", title: "Lunch understood", note: "Meal estimate ready", state: "done" },
  { time: "16:14", title: "Promise remembered", note: "Slides for Mina", state: "done" },
  { time: "20:42", title: "Movement suggested", note: "Awaiting your choice", state: "active" },
];

function SceneVisual({ scene }: { scene: SceneKey }) {
  if (scene === "meal") {
    return (
      <div className="visual-scene meal-scene" aria-label="Simulated glasses view of lunch">
        <div className="table-line" />
        <div className="bowl">
          <span className="food food-a" />
          <span className="food food-b" />
          <span className="food food-c" />
          <span className="food food-d" />
        </div>
        <div className="soup" />
        <div className="focus-box"><span>meal detected</span></div>
      </div>
    );
  }

  if (scene === "conversation") {
    return (
      <div className="visual-scene conversation-scene" aria-label="Simulated conversation reflection">
        <div className="window-glow" />
        <div className="person"><span /></div>
        <div className="speech-line line-one" />
        <div className="speech-line line-two" />
        <div className="speech-line line-three" />
        <div className="promise-chip">“I’ll send it Friday.”</div>
      </div>
    );
  }

  return (
    <div className="visual-scene evening-scene" aria-label="Simulated glasses view of an evening at home">
      <div className="tv"><span>52 min</span></div>
      <div className="sofa" />
      <div className="lamp"><span /></div>
      <div className="walk-path"><i /><i /><i /></div>
    </div>
  );
}

export default function Home() {
  const [activeKey, setActiveKey] = useState<SceneKey>("evening");
  const [sessionOn, setSessionOn] = useState(true);
  const [accepted, setAccepted] = useState<SceneKey[]>([]);
  const [notice, setNotice] = useState("Tap through today’s moments");
  const active = useMemo(
    () => scenes.find((scene) => scene.key === activeKey) ?? scenes[2],
    [activeKey],
  );

  const acceptAction = () => {
    setAccepted((items) => (items.includes(activeKey) ? items : [...items, activeKey]));
    setNotice(
      activeKey === "meal"
        ? "Meal saved after your confirmation"
        : activeKey === "conversation"
          ? "Follow-up added — nothing was sent"
          : "20-minute walk started",
    );
  };

  return (
    <main>
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="LifeLens home">
          <span className="brand-mark"><i /><i /></span>
          <span>LifeLens</span>
        </a>
        <div className="nav-center" aria-label="Demo sections">
          <a href="#day">Today</a>
          <a href="#memory">Memory</a>
          <a href="#principles">Privacy</a>
        </div>
        <button
          className={`session-pill ${sessionOn ? "is-on" : ""}`}
          onClick={() => {
            setSessionOn((value) => !value);
            setNotice(sessionOn ? "Capture paused — you are in control" : "Private session resumed");
          }}
          aria-pressed={sessionOn}
        >
          <span className="status-dot" />
          {sessionOn ? "Private session" : "Capture paused"}
        </button>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker"><span>01</span> A HUMAN-FIRST DAILY AGENT</p>
          <h1>Your life,<br /><em>gently</em> in focus.</h1>
          <p className="lede">
            LifeLens turns what you see and say into small, useful next steps—across health,
            work, and relationships. Nothing happens without you.
          </p>
          <div className="hero-actions">
            <a href="#day" className="primary-link">Experience a day <span>↘</span></a>
            <span className="microcopy">Vision • voice • memory • consent</span>
          </div>
        </div>

        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit-ring ring-one" />
          <div className="orbit-ring ring-two" />
          <div className="lens-core">
            <div className="lens-glint" />
            <span>LIVE</span>
          </div>
          <p className="orbit-note note-one">understands context</p>
          <p className="orbit-note note-two">asks before acting</p>
          <p className="orbit-note note-three">remembers what matters</p>
        </div>
      </section>

      <section className="demo-section" id="day">
        <header className="section-heading">
          <div>
            <p className="kicker"><span>02</span> INTERACTIVE DAY</p>
            <h2>See the agent think.<br />You make the call.</h2>
          </div>
          <div className="date-block">
            <span>TUESDAY</span>
            <strong>01</strong>
            <span>SEPTEMBER</span>
          </div>
        </header>

        <div className="demo-shell">
          <aside className="moment-tabs" aria-label="Choose a moment from the day">
            <p className="rail-label">TODAY’S MOMENTS</p>
            {scenes.map((scene, index) => (
              <button
                key={scene.key}
                className={activeKey === scene.key ? "active" : ""}
                onClick={() => {
                  setActiveKey(scene.key);
                  setNotice(`${scene.label} moment selected`);
                }}
                aria-pressed={activeKey === scene.key}
              >
                <span className="tab-index">0{index + 1}</span>
                <span className="tab-content"><strong>{scene.time}</strong>{scene.label}</span>
                <span className="tab-state">{accepted.includes(scene.key) ? "✓" : "→"}</span>
              </button>
            ))}
            <div className="capture-note">
              <span className="privacy-icon">◉</span>
              <p><strong>On-device first</strong>Raw media disappears after each moment is understood.</p>
            </div>
          </aside>

          <article className="pov-card">
            <div className="pov-header">
              <span><i className={sessionOn ? "recording" : ""} /> RAY-BAN VIEW</span>
              <span>{active.time} KST</span>
            </div>
            <SceneVisual scene={activeKey} />
            <div className="pov-footer">
              <span>{sessionOn ? "Context capture active" : "Camera input paused"}</span>
              <span>•••</span>
            </div>
          </article>

          <article className="agent-card" aria-live="polite">
            <div className="agent-topline">
              <p>{active.eyebrow}</p>
              <span>{active.confidence}</span>
            </div>
            <h3>{active.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h3>
            <p className="agent-summary">{active.summary}</p>
            <div className="agent-reason">
              <span>WHY THIS?</span>
              <p>{active.detail}</p>
            </div>
            <div className="metric-row">
              <strong>{active.metric}</strong>
              <span>{active.metricLabel}</span>
            </div>
            <div className="decision-row">
              <button className="accept-button" onClick={acceptAction} disabled={accepted.includes(activeKey)}>
                {accepted.includes(activeKey) ? "Approved" : active.action}<span>↗</span>
              </button>
              <button className="text-button" onClick={() => setNotice(`${active.secondary} selected`)}>{active.secondary}</button>
            </div>
          </article>
        </div>
        <div className="toast-line" role="status"><span />{notice}</div>
      </section>

      <section className="memory-section" id="memory">
        <div className="memory-intro">
          <p className="kicker"><span>03</span> MEMORY WITH BOUNDARIES</p>
          <h2>It remembers commitments,<br /><em>not conversations.</em></h2>
          <p>
            LifeLens keeps only the details that help future-you. Every memory is visible,
            editable, and yours to remove.
          </p>
        </div>
        <div className="memory-stack">
          <article className="memory-card first">
            <span className="memory-tag">COMMITMENT</span>
            <p>Send revised slides to Mina</p>
            <footer><span>Due Friday, 3:00 PM</span><button aria-label="Edit commitment">Edit</button></footer>
          </article>
          <article className="memory-card second">
            <span className="memory-tag">PREFERENCE</span>
            <p>Short walks work better after dinner</p>
            <footer><span>Learned from 4 approvals</span><button aria-label="Forget preference">Forget</button></footer>
          </article>
          <article className="memory-card third">
            <span className="memory-tag">HEALTH NOTE</span>
            <p>Calorie estimates must be confirmed</p>
            <footer><span>Safety rule • always on</span><button aria-label="View rule">View</button></footer>
          </article>
        </div>
      </section>

      <section className="principles" id="principles">
        <div className="principle-title">
          <p className="kicker"><span>04</span> BUILT FOR TRUST</p>
          <h2>The agent serves<br />the human.</h2>
        </div>
        <div className="principle-grid">
          <article><span>01</span><h3>No hidden capture</h3><p>Sessions are explicit, visible, and easy to pause.</p></article>
          <article><span>02</span><h3>No mind reading</h3><p>It reflects observable patterns—not feelings, motives, or personality.</p></article>
          <article><span>03</span><h3>No silent actions</h3><p>Messages, records, and reminders require your approval.</p></article>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand light" href="#top"><span className="brand-mark"><i /><i /></span><span>LifeLens</span></a>
        <p>Built with AWS Strands Agents • Bedrock • AgentCore</p>
        <p className="footer-note">A concept for Agents for Humans Hackathon</p>
      </footer>
    </main>
  );
}
