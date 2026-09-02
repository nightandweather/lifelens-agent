"use client";

import { useEffect, useMemo, useState } from "react";

type SceneKey = "meal" | "conversation" | "evening" | "move";

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
  sources: string[];
  eventId: string;
  actionType: string;
  latency: string;
};

type LiveAnalysis = {
  headline?: string;
  observation?: string;
  reasoning?: string;
  uncertainty?: string;
  proposed_action?: { label?: string; requires_confirmation?: boolean };
  safety_notes?: string[];
};

const scenes: Scene[] = [
  {
    key: "meal",
    time: "12:38",
    label: "Lunch",
    eyebrow: "MEAL MOMENT",
    title: "Lunch understood.\nYour plan stays flexible.",
    summary: "Bibimbap and miso soup detected. Estimated 620–760 kcal.",
    detail:
      "Your authorized profile is 74.2 kg with 21.8% body fat. At your saved easy-run pace, this is roughly 14–18 optional minutes beyond today’s plan—an energy comparison, never a punishment.",
    action: "Save meal estimate",
    secondary: "Change portion",
    metric: "690",
    metricLabel: "estimated kcal midpoint",
    confidence: "82% visual confidence",
    sources: ["VISION", "INBODY", "RUN PROFILE"],
    eventId: "moment-meal-001",
    actionType: "save_meal_estimate",
    latency: "1.7s",
  },
  {
    key: "conversation",
    time: "16:14",
    label: "Conversation",
    eyebrow: "COMMITMENT CAPTURE",
    title: "One promise worth\nfollowing through on.",
    summary: "You offered to send Mina the revised slides by Friday afternoon.",
    detail:
      "The temporary transcript was discarded. LifeLens kept only the proposed commitment and a neutral speaking-time observation—no emotion, honesty, or personality inference.",
    action: "Add private follow-up",
    secondary: "Discard insight",
    metric: "Fri",
    metricLabel: "follow-up due at 3 PM",
    confidence: "No personality inference",
    sources: ["VOICE", "CALENDAR"],
    eventId: "moment-talk-001",
    actionType: "create_follow_up",
    latency: "1.2s",
  },
  {
    key: "evening",
    time: "20:42",
    label: "Evening",
    eyebrow: "NEXT BEST ACTION",
    title: "A small move will\nclose the loop.",
    summary: "You have been home and seated for 52 minutes after a low-movement day.",
    detail:
      "Your calendar is clear and your usual bedtime is still two hours away. A 20-minute walk fits the activity target without pushing past your typical evening pace.",
    action: "Start 20-min walk",
    secondary: "Remind in 20 min",
    metric: "20",
    metricLabel: "minutes suggested",
    confidence: "Based on your routine",
    sources: ["ACTIVITY", "ROUTINE", "CALENDAR"],
    eventId: "moment-evening-001",
    actionType: "start_activity",
    latency: "0.9s",
  },
  {
    key: "move",
    time: "21:08",
    label: "On the move",
    eyebrow: "LIVE ROUTE ADAPTATION",
    title: "Adjust the route.\nKeep the goal.",
    summary: "Rain is eight minutes away and your pace has slowed for six minutes.",
    detail:
      "During this approved workout session, camera, map, motion, and weather signals found a well-lit 12-minute route home. Nothing reroutes or shares your location until you approve.",
    action: "Use safer route",
    secondary: "Keep current route",
    metric: "12",
    metricLabel: "minutes to home",
    confidence: "4 permissions active",
    sources: ["CAMERA", "MAP", "MOTION", "WEATHER"],
    eventId: "moment-move-001",
    actionType: "apply_route_suggestion",
    latency: "0.6s",
  },
];

const signalRows = [
  ["CAMERA", "12 fps", "Local frame sampling"],
  ["MOTION", "LIVE", "Pace · steps · posture"],
  ["CONTEXT", "6/8", "Only approved sources"],
  ["RAW MEDIA", "0 B", "Discarded after inference"],
];

function SceneVisual({ scene, sessionOn }: { scene: SceneKey; sessionOn: boolean }) {
  if (!sessionOn) {
    return (
      <div className="visual-scene paused-scene">
        <span className="pause-lock">◎</span>
        <strong>Capture paused</strong>
        <p>No camera or microphone frames are being processed.</p>
      </div>
    );
  }

  if (scene === "meal") {
    return (
      <div className="visual-scene photo-scene meal-photo" aria-label="Smart-glasses view of lunch">
        <div className="hud-corners" />
        <div className="focus-box"><span>meal · 82%</span></div>
        <div className="visual-chip top-right">620–760 kcal</div>
        <div className="visual-chip bottom-left">portion · regular</div>
      </div>
    );
  }

  if (scene === "conversation") {
    return (
      <div className="visual-scene photo-scene conversation-photo" aria-label="Smart-glasses view of a work conversation">
        <div className="hud-corners" />
        <div className="voice-wave"><i /><i /><i /><i /><i /><i /></div>
        <div className="promise-chip">“I’ll send it Friday.”</div>
        <div className="visual-chip top-right">audio · ephemeral</div>
      </div>
    );
  }

  if (scene === "move") {
    return (
      <div className="visual-scene photo-scene move-photo" aria-label="Animated running view with route guidance">
        <div className="hud-corners" />
        <div className="visual-chip top-right">rain · 8 min</div>
        <div className="visual-chip bottom-left">6:42 /km · HR 142</div>
      </div>
    );
  }

  return (
    <div className="visual-scene evening-scene" aria-label="Simulated glasses view of an evening at home">
      <div className="hud-corners" />
      <div className="tv"><span>52 min</span></div>
      <div className="sofa" />
      <div className="lamp"><span /></div>
      <div className="walk-path"><i /><i /><i /></div>
      <div className="visual-chip bottom-left">activity goal · 64%</div>
    </div>
  );
}

export default function Home() {
  const [activeKey, setActiveKey] = useState<SceneKey>("meal");
  const [sessionOn, setSessionOn] = useState(true);
  const [accepted, setAccepted] = useState<SceneKey[]>([]);
  const [notice, setNotice] = useState("System ready · choose a moment or run the day");
  const [autoPlay, setAutoPlay] = useState(false);
  const [device, setDevice] = useState<"Vuzix M400" | "Ray-Ban bridge">("Vuzix M400");
  const [memories, setMemories] = useState(["meal", "promise", "routine"]);
  const [liveAnalysis, setLiveAnalysis] = useState<LiveAnalysis | null>(null);
  const [aiState, setAiState] = useState<"idle" | "loading" | "live" | "offline">("idle");

  const active = useMemo(
    () => scenes.find((scene) => scene.key === activeKey) ?? scenes[0],
    [activeKey],
  );

  useEffect(() => {
    if (!autoPlay || !sessionOn) return;
    const timer = window.setInterval(() => {
      setActiveKey((current) => {
        const index = scenes.findIndex((scene) => scene.key === current);
        return scenes[(index + 1) % scenes.length].key;
      });
    }, 4200);
    return () => window.clearInterval(timer);
  }, [autoPlay, sessionOn]);

  useEffect(() => {
    if (autoPlay) setNotice(`${active.time} · ${active.label} context analyzed in ${active.latency}`);
  }, [active, autoPlay]);

  useEffect(() => {
    setLiveAnalysis(null);
    setAiState("idle");
  }, [activeKey]);

  const analyzeWithAgent = async () => {
    setAiState("loading");
    setNotice("Sending minimized observations to the Strands agent…");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: activeKey, sessionActive: sessionOn }),
      });
      const result = (await response.json()) as { analysis?: LiveAnalysis; error?: string };
      if (!response.ok || !result.analysis) {
        setAiState("offline");
        setNotice(`${result.error ?? "Live agent unavailable"} · deterministic demo remains visible`);
        return;
      }
      setLiveAnalysis(result.analysis);
      setAiState("live");
      setNotice("Fresh response received from Strands + Amazon Bedrock");
    } catch {
      setAiState("offline");
      setNotice("Live agent unavailable · deterministic demo remains visible");
    }
  };

  const acceptAction = async () => {
    if (!sessionOn) {
      setNotice("Resume the private session before approving an action");
      return;
    }
    setNotice("Validating consent and action scope…");
    const response = await fetch("/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: active.eventId, actionType: active.actionType, confirmed: true }),
    });

    if (!response.ok) {
      setNotice("Safety gate blocked the action · nothing changed");
      return;
    }
    setAccepted((items) => (items.includes(activeKey) ? items : [...items, activeKey]));
    setNotice(`${active.action} approved · structured receipt created · no external sharing`);
  };

  const resetDay = () => {
    setAccepted([]);
    setActiveKey("meal");
    setAutoPlay(false);
    setNotice("Demo reset · no saved action left this browser session");
  };

  return (
    <main>
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="LifeLens home">
          <span className="brand-mark"><i /><i /></span><span>LifeLens</span>
        </a>
        <div className="nav-center">
          <a href="#live">Live demo</a><a href="#health">Health</a><a href="#system">System</a><a href="#trust">Trust</a>
        </div>
        <button
          className={`session-pill ${sessionOn ? "is-on" : ""}`}
          onClick={() => {
            setSessionOn((value) => !value);
            setAutoPlay(false);
            setNotice(sessionOn ? "Capture stopped immediately" : "Private session resumed");
          }}
          aria-pressed={sessionOn}
        >
          <span className="status-dot" />{sessionOn ? "Session live" : "Capture paused"}
        </button>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker"><span>WEARABLE AGENT · BUILD 0.2</span></p>
          <h1>Life,<br /><em>understood</em><br />in motion.</h1>
          <p className="lede">
            A consent-first agent for smart glasses that understands meals, movement,
            commitments, and surroundings—then proposes one useful next step.
          </p>
          <div className="hero-actions">
            <a href="#live" className="primary-link">Run the interactive day <span>↘</span></a>
            <a className="github-link" href="https://github.com/nightandweather/lifelens-agent" target="_blank" rel="noreferrer">View source ↗</a>
          </div>
          <div className="proof-row" aria-label="Prototype implementation status">
            <div><strong>04</strong><span>working moments</span></div>
            <div><strong>03</strong><span>API surfaces</span></div>
            <div><strong>04/04</strong><span>safety tests</span></div>
            <div><strong>M400</strong><span>native target</span></div>
          </div>
        </div>

        <div className="hero-console" aria-label="LifeLens system overview">
          <div className="console-bar"><span><i /> SYSTEM ONLINE</span><span>LOCAL-FIRST PIPELINE</span></div>
          <div className="console-view">
            <SceneVisual scene={activeKey} sessionOn={sessionOn} />
            <div className="console-reticle"><span /></div>
          </div>
          <div className="console-events">
            <p>NOW INTERPRETING</p>
            <strong>{active.label}</strong>
            <span>{active.summary}</span>
          </div>
          <div className="console-footer"><span>{device}</span><span>{active.latency} response</span><span>raw media 0 B</span></div>
        </div>
      </section>

      <section className="live-section" id="live">
        <header className="section-heading">
          <div><p className="kicker"><span>01</span> OPERABLE PROTOTYPE</p><h2>One day. Four moments.<br />Every action is yours.</h2></div>
          <div className="demo-controls">
            <button className={autoPlay ? "active" : ""} onClick={() => setAutoPlay((value) => !value)} disabled={!sessionOn}>
              {autoPlay ? "Ⅱ Pause day" : "▶ Run the day"}
            </button>
            <button onClick={resetDay}>Reset</button>
          </div>
        </header>

        <div className="workspace-shell">
          <aside className="moment-rail" aria-label="Choose a moment">
            <div className="rail-head"><span>TODAY · SEP 01</span><strong>{accepted.length}/{scenes.length}</strong></div>
            {scenes.map((scene, index) => (
              <button
                key={scene.key}
                className={activeKey === scene.key ? "active" : ""}
                onClick={() => { setActiveKey(scene.key); setAutoPlay(false); setNotice(`${scene.time} · ${scene.label} selected`); }}
                aria-pressed={activeKey === scene.key}
              >
                <span className="moment-index">0{index + 1}</span>
                <span><strong>{scene.time}</strong><small>{scene.label}</small></span>
                <i>{accepted.includes(scene.key) ? "✓" : activeKey === scene.key ? "●" : "○"}</i>
              </button>
            ))}
            <div className="device-switch">
              <span>INPUT DEVICE</span>
              {(["Vuzix M400", "Ray-Ban bridge"] as const).map((name) => (
                <button key={name} className={device === name ? "selected" : ""} onClick={() => setDevice(name)}>{name}</button>
              ))}
            </div>
          </aside>

          <article className="lens-panel">
            <div className="lens-head"><span><i className={sessionOn ? "recording" : ""} /> {device.toUpperCase()}</span><span>{active.time}:24 KST</span></div>
            <SceneVisual scene={activeKey} sessionOn={sessionOn} />
            <div className="lens-signals">
              {active.sources.map((source) => <span key={source}><i />{source}</span>)}
            </div>
          </article>

          <article className="decision-panel" aria-live="polite">
            <div className="decision-top"><p>{active.eyebrow}</p><span className={`ai-state ${aiState}`}>{aiState === "live" ? "BEDROCK RESPONSE" : aiState === "loading" ? "ANALYZING…" : aiState === "offline" ? "AGENT OFFLINE" : active.confidence}</span></div>
            <h3>{(liveAnalysis?.headline ?? active.title).split("\n").map((line) => <span key={line}>{line}</span>)}</h3>
            <p className="decision-summary">{liveAnalysis?.observation ?? active.summary}</p>
            <div className="reason-box"><span>WHY NOW</span><p>{liveAnalysis?.reasoning ?? active.detail}</p></div>
            {liveAnalysis?.uncertainty && <p className="uncertainty"><strong>UNCERTAINTY</strong>{liveAnalysis.uncertainty}</p>}
            <div className="metric-row"><strong>{active.metric}</strong><span>{active.metricLabel}</span></div>
            <div className="decision-actions">
              <button className="approve-button" onClick={acceptAction} disabled={accepted.includes(activeKey)}>
                {accepted.includes(activeKey) ? "Action approved ✓" : active.action}<span>↗</span>
              </button>
              <button className="secondary-button" onClick={() => setNotice(`${active.secondary} · demo preference updated`)}>{active.secondary}</button>
            </div>
            <button className="agent-button" onClick={analyzeWithAgent} disabled={aiState === "loading" || !sessionOn}>
              <span>{aiState === "live" ? "↻ Ask Strands again" : "✦ Analyze with live AI"}</span><small>Minimized observations only</small>
            </button>
          </article>

          <aside className="telemetry-panel">
            <div className="telemetry-head"><span>SESSION TELEMETRY</span><i>{sessionOn ? "LIVE" : "OFF"}</i></div>
            {signalRows.map(([name, value, note]) => (
              <div className="signal-row" key={name}><span>{name}</span><strong>{sessionOn || name === "RAW MEDIA" ? value : "OFF"}</strong><small>{note}</small></div>
            ))}
            <div className="receipt-log">
              <span>ACTION RECEIPTS</span>
              {accepted.length === 0 ? <p>No approved actions yet.</p> : accepted.map((key) => {
                const item = scenes.find((scene) => scene.key === key)!;
                return <p key={key}><i>✓</i><span>{item.action}<small>{item.eventId}</small></span></p>;
              })}
            </div>
          </aside>
        </div>
        <div className="status-line" role="status"><span className={sessionOn ? "pulse" : ""} />{notice}</div>
      </section>

      <section className="health-section" id="health">
        <div className="health-copy">
          <p className="kicker"><span>02</span> PERSONAL HEALTH CONTEXT</p>
          <h2>Not just “what is this?”<br /><em>What does it mean for me?</em></h2>
          <p>LifeLens combines a visual estimate with the health data you explicitly allow. It gives ranges, shows its reasoning, and keeps the final choice with you.</p>
          <div className="health-disclaimer">Lifestyle estimate · not medical advice · never used to shame or diagnose</div>
        </div>
        <div className="health-board">
          <div className="profile-card">
            <header><span>AUTHORIZED PROFILE</span><i>INBODY · AUG 14</i></header>
            <div className="body-score"><strong>74.2</strong><span>kg</span></div>
            <div className="profile-stats"><p><strong>21.8%</strong><span>body fat</span></p><p><strong>31.6 kg</strong><span>skeletal muscle</span></p><p><strong>2× wk</strong><span>easy runs</span></p></div>
          </div>
          <div className="energy-card">
            <header><span>TODAY’S ENERGY VIEW</span><i>RANGE, NOT VERDICT</i></header>
            <div className="energy-total"><span>Lunch estimate</span><strong>620–760 <small>kcal</small></strong></div>
            <div className="energy-track"><i /><span /></div>
            <div className="energy-options"><p><span>Keep today’s plan</span><strong>30 min easy run</strong></p><p><span>If you want extra room</span><strong>+14–18 min optional</strong></p></div>
          </div>
        </div>
      </section>

      <section className="system-section" id="system">
        <header className="section-heading dark-heading">
          <div><p className="kicker"><span>03</span> THE WORKING SYSTEM</p><h2>Beyond the interface.</h2></div>
          <p>A native glasses client, a typed agent service, and a consent gate that refuses unconfirmed actions.</p>
        </header>
        <div className="pipeline" aria-label="LifeLens architecture">
          <article><span>01 · SENSE</span><strong>Vuzix / Ray-Ban</strong><p>Camera, temporary voice, motion and user-enabled context.</p><i>ANDROID CAMERA2</i></article>
          <b>→</b>
          <article><span>02 · MINIMIZE</span><strong>Moment adapter</strong><p>Raw frames become a small structured event, then disappear.</p><i>PYDANTIC CONTRACT</i></article>
          <b>→</b>
          <article><span>03 · REASON</span><strong>Strands + Bedrock</strong><p>One explainable proposal is created under strict safety rules.</p><i>AGENT SERVICE</i></article>
          <b>→</b>
          <article><span>04 · CONFIRM</span><strong>Human approval</strong><p>Only the exact approved action can create a structured receipt.</p><i>CONSENT GATE</i></article>
        </div>
        <div className="implementation-grid">
          <article><span className="implementation-status">RUNNABLE</span><h3>Native Vuzix prototype</h3><p>Live Camera2 preview, speech input, D-pad moment controls and center-button confirmation for M400/M4000.</p><code>com.kanghoun.lifelens.vuzix</code></article>
          <article><span className="implementation-status">TESTED</span><h3>Agent API</h3><p>Analyze a minimized wearable moment, produce a proposal, and commit only after explicit confirmation.</p><code>POST /v1/moments/analyze</code></article>
          <article><span className="implementation-status">GUARDED</span><h3>Safety contract</h3><p>Raw media is rejected, unconfirmed actions are blocked, and stored records contain structured fields only.</p><code>4 deterministic safety tests</code></article>
        </div>
      </section>

      <section className="memory-section" id="trust">
        <div className="memory-intro">
          <p className="kicker"><span>04</span> MEMORY WITH BOUNDARIES</p>
          <h2>It remembers what helps.<br /><em>Not your whole life.</em></h2>
          <p>Every retained item is inspectable and removable. Delete one below—the interface behaves like the intended product, while this public demo saves nothing remotely.</p>
        </div>
        <div className="memory-list">
          {memories.includes("promise") && <article><span>COMMITMENT · EXPIRES FRI</span><p>Send revised slides to Mina</p><button onClick={() => setMemories((items) => items.filter((item) => item !== "promise"))}>Forget</button></article>}
          {memories.includes("routine") && <article><span>PREFERENCE · LEARNED FROM 4 APPROVALS</span><p>Short walks work better after dinner</p><button onClick={() => setMemories((items) => items.filter((item) => item !== "routine"))}>Forget</button></article>}
          {memories.includes("meal") && <article><span>HEALTH NOTE · USER CONFIRMED</span><p>Use calorie ranges, never a single verdict</p><button onClick={() => setMemories((items) => items.filter((item) => item !== "meal"))}>Forget</button></article>}
          {memories.length === 0 && <div className="empty-memory"><strong>Memory is empty.</strong><span>Nothing remains in this demo session.</span></div>}
        </div>
      </section>

      <section className="final-cta">
        <p className="kicker"><span>OPEN PROTOTYPE</span></p>
        <h2>An agent that looks out<br />for you—not over you.</h2>
        <div><a href="#live">Try the live day ↗</a><a href="https://github.com/nightandweather/lifelens-agent" target="_blank" rel="noreferrer">Inspect the code ↗</a></div>
      </section>

      <footer className="site-footer">
        <a className="brand light" href="#top"><span className="brand-mark"><i /><i /></span><span>LifeLens</span></a>
        <p>AWS Strands Agents · Amazon Bedrock · Vuzix Android</p>
        <p className="footer-note">Agents for Humans Hackathon · 2026</p>
      </footer>
    </main>
  );
}
