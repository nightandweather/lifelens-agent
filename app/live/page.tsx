"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Coordinates, Mode, Observation, Place, WeatherReport } from "../../lib/live-types";
import { activityMinutes, AmbientGate, frameDifference } from "../../lib/ambient";
import "./live.css";

type VoiceResult = { results: { [index: number]: { [index: number]: { transcript: string } } } };
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: VoiceResult) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start(): void; abort(): void };
type VoiceWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
type Saved = { id: string; name: string; kcalLow: number; kcalHigh: number; at: string; place: string };
const clock = (value: string) => new Date(value).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" });

export default function LiveLens() {
  const [mode, setMode] = useState<Mode>("meal");
  const [active, setActive] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cloudConsent, setCloudConsent] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [questionBusy, setQuestionBusy] = useState(false);
  const [notice, setNotice] = useState("식사 또는 귀가 모드를 고르고 시작하세요.");
  const [observation, setObservation] = useState<Observation | null>(null);
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [weatherError, setWeatherError] = useState("");
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeName, setPlaceName] = useState("");
  const [placeNote, setPlaceNote] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [comparison, setComparison] = useState(false);
  const [weight, setWeight] = useState("");
  const [met, setMet] = useState(3.8);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [still, setStill] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const live = useRef(false);
  const epoch = useRef(0);
  const analyzing = useRef(false);
  const questionsInFlight = useRef(false);
  const locating = useRef(false);
  const aborts = useRef(new Set<AbortController>());
  const gate = useRef(new AmbientGate());
  const lastFrame = useRef<Uint8ClampedArray | null>(null);
  const sentFrame = useRef<Uint8ClampedArray | null>(null);
  const stable = useRef(0);
  const lastSent = useRef(0);
  const lastWeather = useRef(0);
  const voiceEnabled = useRef(false);
  const analyzeRef = useRef<(image?: string) => Promise<void>>(async () => {});
  const weatherRef = useRef<() => Promise<void>>(async () => {});
  const askRef = useRef<(text: string) => Promise<void>>(async () => {});

  const speak = useCallback((text: string) => {
    if (!voiceEnabled.current || !live.current || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "ko-KR"; utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }, []);
  const stop = useCallback(() => {
    live.current = false; epoch.current++; setActive(false); setCameraOn(false);
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    if (video.current) video.current.srcObject = null;
    recognition.current?.abort(); recognition.current = null; setListening(false);
    aborts.current.forEach(controller => controller.abort()); aborts.current.clear();
    window.speechSynthesis?.cancel();
    analyzing.current = false; questionsInFlight.current = false; locating.current = false;
    setBusy(false); setWeatherBusy(false); setQuestionBusy(false);
    setObservation(null); setWeather(null); setAnswer(""); setLocation(null); setPlaces([]); setPlaceName(""); setPlaceNote(""); setStill(null);
    lastFrame.current = null; sentFrame.current = null; gate.current.reset(); stable.current = 0; lastWeather.current = 0; lastSent.current = 0;
    setNotice("세션을 종료했어요. 카메라·마이크와 진행 중인 요청을 멈췄어요.");
  }, []);
  useEffect(() => {
    try { const values = JSON.parse(localStorage.getItem("lifelens-approved-meals-v1") || "[]"); if (Array.isArray(values)) setSaved(values.filter(v => typeof v.id === "string" && typeof v.name === "string" && Number.isFinite(v.kcalLow) && Number.isFinite(v.kcalHigh) && typeof v.at === "string").slice(0, 20)); } catch { /* Storage may be unavailable. */ }
    const hide = () => { if (document.hidden && live.current) stop(); };
    document.addEventListener("visibilitychange", hide);
    const timer = window.setInterval(() => setTick(x => x + 1), 60_000);
    return () => { document.removeEventListener("visibilitychange", hide); window.clearInterval(timer); live.current = false; epoch.current++; stream.current?.getTracks().forEach(t => t.stop()); recognition.current?.abort(); aborts.current.forEach(c => c.abort()); window.speechSynthesis?.cancel(); };
  }, [stop]);

  async function request<T>(url: string, body: unknown): Promise<T> {
    const controller = new AbortController(); aborts.current.add(controller);
    const timeout = window.setTimeout(() => controller.abort(), 50_000);
    try { const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal }); const data = await response.json() as T & { error?: string }; if (!response.ok) throw new Error(data.error || "연결을 확인해주세요."); return data; }
    finally { aborts.current.delete(controller); window.clearTimeout(timeout); }
  }
  function session() { if (!live.current) { epoch.current++; live.current = true; setActive(true); } }
  async function startCamera() {
    if (!cloudConsent) { setNotice("사진을 클라우드 AI로 분석하는 데 동의해주세요."); return; }
    session(); const current = epoch.current; setNotice("카메라를 연결하고 있어요…"); setStill(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("카메라는 HTTPS 또는 localhost에서 사용할 수 있어요.");
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (!live.current || epoch.current !== current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current?.getTracks().forEach(t => t.stop()); stream.current = media;
      if (video.current) { video.current.srcObject = media; await video.current.play(); }
      setCameraOn(true); setNotice("장면이 안정되면 살펴볼게요. 새로운 정보가 있을 때만 알려드려요.");
    } catch (error) { if (epoch.current === current) setNotice(error instanceof Error && error.name !== "NotAllowedError" ? error.message : "카메라 권한을 허용하거나 사진을 선택해주세요."); }
  }
  function capture(width = 960) {
    if (!video.current?.videoWidth) return null;
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = Math.round(width * video.current.videoHeight / video.current.videoWidth);
    const context = canvas.getContext("2d"); if (!context) return null;
    context.drawImage(video.current, 0, 0, canvas.width, canvas.height); return canvas;
  }
  async function analyze(image?: string) {
    if (!live.current || !cloudConsent || analyzing.current) return;
    const canvas = image ? null : capture(); const data = image || canvas?.toDataURL("image/jpeg", .72); if (!data) return;
    const current = epoch.current; analyzing.current = true; setBusy(true); setObservation(null); lastSent.current = Date.now();
    try { const observed = await request<Observation>("/api/live/vision", { image: data, mode, cloudConsent: true, sessionActive: true });
      if (!live.current || epoch.current !== current) return;
      setObservation(observed); setAnswer(""); setExpanded(true);
      if (gate.current.shouldNotify(observed.signature, observed.confidence, Date.now())) { setNotice(observed.headline); speak(observed.food ? `${observed.food.name}으로 보여요. 약 ${observed.food.kcalLow}에서 ${observed.food.kcalHigh} 킬로칼로리로 추정돼요.` : observed.headline); }
      else setNotice(observed.confidence < .65 ? "아직 확실하지 않아요. 가까이 비추거나 다른 각도로 보여주세요." : "같은 장면을 보고 있어요. 반복해서 알리지 않을게요.");
      if (mode === "mobility" && observed.rainVisible && location && Date.now() - lastWeather.current > 300_000) void weatherRef.current();
    } catch (error) { if (current === epoch.current && live.current) { sentFrame.current = null; setNotice(error instanceof Error ? error.message : "사진 분석에 실패했어요."); } }
    finally { if (current === epoch.current) { analyzing.current = false; setBusy(false); } }
  }
  analyzeRef.current = analyze;
  useEffect(() => {
    if (!active || !cameraOn || !cloudConsent) return;
    const timer = window.setInterval(() => {
      if (!live.current || analyzing.current || document.hidden) return;
      const canvas = capture(24); const context = canvas?.getContext("2d"); if (!canvas || !context) return;
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      stable.current = lastFrame.current && frameDifference(pixels, lastFrame.current) < .08 ? stable.current + 1 : 0; lastFrame.current = pixels;
      const changed = !sentFrame.current || frameDifference(pixels, sentFrame.current) > .10;
      if (stable.current >= 1 && changed && Date.now() - lastSent.current > 20_000) { sentFrame.current = pixels; void analyzeRef.current(); }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [active, cameraOn, cloudConsent]);

  async function upload(file: File | undefined) {
    if (!file) return; if (!cloudConsent) { setNotice("먼저 클라우드 사진 분석에 동의해주세요."); return; }
    if (!file.type.startsWith("image/") || file.size > 20_000_000) { setNotice("20MB 이하의 사진을 선택해주세요."); return; }
    session(); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setCameraOn(false);
    const current = epoch.current, url = URL.createObjectURL(file);
    try { const img = new Image(); img.src = url; await img.decode(); if (!live.current || epoch.current !== current) return;
      const canvas = document.createElement("canvas"); const scale = Math.min(1, 960 / Math.max(img.width, img.height)); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", .72); setStill(data); await analyze(data);
    } catch { setNotice("사진을 읽지 못했어요. JPEG 또는 PNG로 다시 시도해주세요."); } finally { URL.revokeObjectURL(url); }
  }
  async function currentLocation(): Promise<Coordinates> {
    return new Promise((resolve, reject) => { if (!navigator.geolocation) return reject(new Error("위치를 지원하지 않는 브라우저예요.")); navigator.geolocation.getCurrentPosition(p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy, capturedAt: p.timestamp }), () => reject(new Error("위치 권한을 허용해주세요. 임의의 위치로 대체하지 않아요.")), { enableHighAccuracy: true, maximumAge: 60_000, timeout: 15_000 }); });
  }
  async function loadWeather() {
    if (locating.current) return; session(); const current = epoch.current; locating.current = true; setWeatherBusy(true); setWeatherError("");
    try { const coords = await currentLocation(); if (epoch.current !== current || !live.current) return; setLocation(coords);
      const report = await request<WeatherReport>("/api/live/weather", { location: coords, locationConsent: true }); if (epoch.current !== current || !live.current) return;
      setWeather(report); lastWeather.current = Date.now(); setNotice(report.headline);
      if (gate.current.shouldNotify(report.alertKey, 1, Date.now())) speak(report.headline);
    } catch (error) { if (epoch.current === current) { setWeather(null); setWeatherError(error instanceof Error ? error.message : "날씨 조회에 실패했어요."); } }
    finally { if (epoch.current === current) { locating.current = false; setWeatherBusy(false); } }
  }
  weatherRef.current = loadWeather;
  useEffect(() => { if (!active || mode !== "mobility" || !location) return; const timer = window.setInterval(() => { if (Date.now() - lastWeather.current >= 300_000) void weatherRef.current(); }, 60_000); return () => window.clearInterval(timer); }, [active, mode, location]);
  async function nearby() {
    session(); const current = epoch.current; setPlaceNote("주변 식당을 찾고 있어요…");
    try { const coords = await currentLocation(); if (current !== epoch.current) return; setLocation(coords); const data = await request<{ places: Place[]; message?: string }>("/api/live/places", { location: coords, locationConsent: true }); if (current !== epoch.current) return; setPlaces(data.places); setPlaceNote(data.message || "가까운 식당 후보예요. 지금 있는 곳을 직접 확인해주세요."); }
    catch (error) { if (current === epoch.current) setPlaceNote(error instanceof Error ? error.message : "식당을 찾지 못했어요."); }
  }
  async function ask(text: string) {
    if (!text.trim() || !live.current || questionsInFlight.current) return;
    const current = epoch.current; questionsInFlight.current = true; setQuestion(text); setQuestionBusy(true); setAnswer("");
    const freshWeather = weather && Date.now() - Date.parse(weather.source.fetchedAt) < 900_000 ? weather : null;
    try { const data = await request<{ answer: string }>("/api/live/question", { question: text, observation, weather: freshWeather, place: placeName ? { name: placeName, source: "user_confirmed" } : null, sessionActive: true }); if (current !== epoch.current || !live.current) return; setAnswer(data.answer); speak(data.answer); }
    catch (error) { if (current === epoch.current) setAnswer(error instanceof Error ? error.message : "질문에 답하지 못했어요."); }
    finally { if (current === epoch.current) { questionsInFlight.current = false; setQuestionBusy(false); } }
  }
  askRef.current = ask;
  function listen() {
    if (listening) { recognition.current?.abort(); return; }
    const api = window as VoiceWindow; const Constructor = api.SpeechRecognition || api.webkitSpeechRecognition;
    if (!Constructor) { setNotice("이 브라우저에서는 음성인식을 지원하지 않아요. 질문을 입력해주세요."); return; }
    session(); const current = epoch.current; window.speechSynthesis?.cancel(); const rec = new Constructor(); recognition.current = rec; rec.lang = "ko-KR"; rec.continuous = false; rec.interimResults = false;
    rec.onresult = event => { if (!live.current || epoch.current !== current) return; const text = event.results[0]?.[0]?.transcript; if (text) void askRef.current(text); };
    rec.onerror = () => { if (current === epoch.current) { setListening(false); setNotice("음성을 듣지 못했어요. 마이크 권한을 확인하거나 질문을 입력해주세요."); } };
    rec.onend = () => setListening(false);
    try { rec.start(); setListening(true); } catch { setListening(false); setNotice("음성인식을 시작하지 못했어요."); }
  }
  function saveMeal() {
    if (!observation?.food || !live.current) return;
    const f = observation.food; const record: Saved = { id: crypto.randomUUID(), name: f.name, kcalLow: f.kcalLow, kcalHigh: f.kcalHigh, at: new Date().toISOString(), place: placeName };
    const next = [record, ...saved].slice(0, 20);
    try { localStorage.setItem("lifelens-approved-meals-v1", JSON.stringify(next)); setSaved(next); setNotice("확인한 식사 정보를 이 기기에 저장했어요. 사진은 저장하지 않았어요."); } catch { setNotice("이 브라우저에서 저장할 수 없어요. 저장되지 않았어요."); }
  }
  function forget(id: string) { const next = saved.filter(v => v.id !== id); try { localStorage.setItem("lifelens-approved-meals-v1", JSON.stringify(next)); setSaved(next); } catch { setNotice("기록을 지우지 못했어요."); } }
  function switchMode(next: Mode) { stop(); setMode(next); setNotice(next === "meal" ? "음식이 보이면 한 번씩 알려드려요." : "현재 위치의 예상 강수량을 먼저 확인하세요."); setComparison(false); }
  const food = observation?.food;
  const stale = !!weather && (tick >= 0 && Date.now() - Date.parse(weather.source.fetchedAt) > 900_000);
  const lowMinutes = food && weight ? activityMinutes(food.kcalLow, Number(weight), met) : null;
  const highMinutes = food && weight ? activityMinutes(food.kcalHigh, Number(weight), met) : null;

  return <main className="lens-app" lang="ko">
    <header className="lens-header"><a href="/live">LifeLens<span>LIVE</span></a><a href="/">기존 데모 ↗</a></header>
    <div className="lens-layout">
      <section className="lens-viewport" aria-label="카메라와 상황 안내">
        <video ref={video} playsInline muted className={cameraOn ? "lens-video visible" : "lens-video"} aria-label="실시간 카메라" />
        {still && <img className="lens-still" src={still} alt="분석 중인 사용자 선택 사진" />}
        <div className="lens-topline"><span>IPHONE HUD · {mode === "meal" ? "식사" : "귀가"}</span><span>{busy ? "장면 분석 중" : cameraOn ? "카메라 켜짐" : active ? "세션 진행 중" : "세션 종료됨"}</span></div>
        {!cameraOn && !still && <div className="lens-intro"><span className="lens-eyebrow">지금, 눈앞의 일상</span><h1>필요한 순간에만.<br />LifeLens.</h1><p>{mode === "meal" ? "음식이 보이면 알아보고, 궁금한 건 말로 물어보세요." : "돌아가는 길, 비가 얼마나 올지 미리 살펴보세요."}</p><a className="lens-start-link" href="#lens-setup">{mode === "meal" ? "카메라·사진으로 시작하기" : "위치로 날씨 확인하기"} ↓</a></div>}
        {(cameraOn || still) && <div className="lens-reticle" aria-hidden="true" />}
        <div className="lens-overlay">
          {mode === "meal" && observation && <article className="lens-card">
            <div className="lens-card-top"><span>{food ? "음식을 발견했어요" : "지금 보이는 장면"}</span><button className="text-button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "접기" : "펼치기"}</button></div>
            <h2>{food?.name || observation.headline}</h2>
            {food && <div className="lens-calories">{food.kcalLow}–{food.kcalHigh}<small>kcal 추정</small></div>}
            {expanded && <><p>{food?.portion || observation.description}</p><p className="lens-caution">{observation.uncertainty}</p><div className="lens-source">{observation.source.name} · {clock(observation.source.fetchedAt)}</div>{food && <div className="lens-actions"><button onClick={saveMeal}>확인하고 이 기기에 기록</button><button onClick={() => setComparison(!comparison)}>활동량 비교</button></div>}</>}
          </article>}
          {mode === "mobility" && weather && <article className="lens-card">
            <div className="lens-card-top"><span>{stale ? "오래된 예보 · 다시 조회해주세요" : "현재 위치 · 시간별 강수"}</span><span>{clock(weather.source.fetchedAt)} 조회</span></div>
            <h2>{weather.headline}</h2><p>{weather.detail}</p>
            <div className="lens-rain-grid">{weather.hours.map(h => <div key={h.time}><span>{clock(h.time)}</span><div className="lens-rain-track"><i style={{ height: `${h.precipitation === null ? 8 : Math.max(3, Math.min(100, h.precipitation * 10))}%` }} /></div><strong>{h.precipitationLabel}</strong>{h.probability !== null && <small>확률 {h.probability}%</small>}</div>)}</div>
            <a className="lens-source" href={weather.source.url} target="_blank" rel="noreferrer">{weather.source.name} ↗</a><p className="lens-caution">{weather.fallbackReason || `발표 ${clock(weather.issuedAt)} · 시간당 강수량, mm`}</p>
          </article>}
        </div>
        <div className="lens-controls">
          <div className="lens-modes"><button aria-pressed={mode === "meal"} onClick={() => switchMode("meal")}>식사</button><button aria-pressed={mode === "mobility"} onClick={() => switchMode("mobility")}>귀가</button></div>
          <p role="status" aria-live="polite">{notice}</p>
        </div>
      </section>
      <aside className="lens-panel" id="lens-setup">
        <section className="lens-panel-section"><div className="lens-section-heading"><span>01</span><h2>시작하기</h2></div>
          <label className="lens-check"><input type="checkbox" checked={cloudConsent} onChange={e => { if (!e.target.checked) stop(); setCloudConsent(e.target.checked); }} /><span>사진을 클라우드 AI로 분석하는 데 동의해요<small>장면이 바뀌면 축소한 사진 한 장을 AWS Bedrock으로 보내요. LifeLens는 사진을 서버에 저장하지 않아요.</small></span></label>
          <div className="lens-actions"><button className="primary" onClick={startCamera} disabled={cameraOn || !cloudConsent}>카메라 시작</button><label className={`lens-upload ${!cloudConsent ? "disabled" : ""}`}>사진 선택<input type="file" accept="image/*" disabled={!cloudConsent || busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></label></div>
          {cameraOn && <button className="full" disabled={busy} onClick={() => void analyze()}>{busy ? "분석 중…" : "지금 장면 다시 보기"}</button>}
          {active && <button className="full stop" onClick={stop}>세션 종료 · 카메라와 마이크 끄기</button>}
          <p className="lens-small">자동 분석은 화면이 켜져 있을 때만 작동해요. 앱을 벗어나면 세션이 종료돼요. 실제 안경 연결은 아직 지원하지 않아요.</p>
        </section>
        <section className="lens-panel-section"><div className="lens-section-heading"><span>02</span><h2>{mode === "meal" ? "어디서 먹고 있나요?" : "돌아가는 길의 날씨"}</h2></div>
          {mode === "meal" ? <><label className="lens-field">식당 이름 <span>직접 확인한 정보</span><input value={placeName} onChange={e => setPlaceName(e.target.value.slice(0, 100))} placeholder="간판이나 메뉴판의 식당 이름" /></label><button className="full" onClick={nearby}>현재 위치로 주변 식당 찾기</button><p className="lens-small">약 100m 단위 위치를 식당 검색에 사용해요. 가까운 식당이 현재 식당이라고 단정하지 않아요.</p>{placeNote && <p className="lens-small" role="status">{placeNote}</p>}<div className="lens-place-list">{places.map(p => <button key={p.id} aria-pressed={placeName === p.name} onClick={() => setPlaceName(p.name)}>{p.name}<small>{p.address}{p.distance !== null ? ` · ${p.distance}m` : ""}</small></button>)}</div></> : <><button className="primary full" disabled={weatherBusy} onClick={loadWeather}>{weatherBusy ? "위치와 예보 확인 중…" : "현재 위치 날씨 확인"}</button><p className="lens-small">약 100m 단위 위치를 예보 조회에 사용해요. 켜진 귀가 세션에서는 5분마다 갱신해요.</p>{weatherError && <p className="lens-error" role="alert">{weatherError}</p>}{location && <p className="lens-small">위치 정확도 약 {Math.round(location.accuracy || 0)}m. 귀가 경로 전체를 조회한 결과는 아니에요.</p>}<a className="lens-map-link" href="https://maps.apple.com/" target="_blank" rel="noreferrer">지도에서 귀갓길 확인 ↗</a></>}
        </section>
        {comparison && food && <section className="lens-panel-section"><div className="lens-section-heading"><span>↔</span><h2>활동량으로 비교하면</h2></div><div className="lens-form-row"><label className="lens-field">체중 (kg)<input type="number" min="20" max="300" value={weight} onChange={e => setWeight(e.target.value)} placeholder="예: 70" /></label><label className="lens-field">활동<select value={met} onChange={e => setMet(Number(e.target.value))}><option value="3.8">걷기 4.5–5.5 km/h</option><option value="6.5">달리기 6.4–6.8 km/h</option></select></label></div>{lowMinutes !== null && highMinutes !== null && <p className="lens-activity">약 {lowMinutes}–{highMinutes}분</p>}<p className="lens-small">총 에너지 소비량을 비교한 값이에요. 식사 후 해야 할 운동량이 아니며, 체력·속도에 따라 달라져요. 체중은 서버로 보내지 않아요.</p><a className="lens-source" href={met === 3.8 ? "https://pacompendium.com/walking/" : "https://pacompendium.com/running/"} target="_blank" rel="noreferrer">신체활동 Compendium · MET 기준 ↗</a></section>}
        <section className="lens-panel-section"><div className="lens-section-heading"><span>03</span><h2>이어서 물어보세요</h2></div>
          <label className="lens-check"><input type="checkbox" checked={voiceOn} onChange={e => { setVoiceOn(e.target.checked); voiceEnabled.current = e.target.checked; if (!e.target.checked) window.speechSynthesis?.cancel(); }} /><span>안내와 답변을 음성으로 듣기</span></label>
          <form onSubmit={e => { e.preventDefault(); void ask(question); }}><label className="lens-field">질문<input value={question} maxLength={500} onChange={e => setQuestion(e.target.value)} placeholder={mode === "meal" ? "밥을 반만 먹으면?" : "비가 얼마나 더 올 것 같아?"} /></label><div className="lens-actions"><button type="button" onClick={listen} disabled={questionBusy}>{listening ? "듣기 중지" : "마이크로 질문"}</button><button className="primary" disabled={!active || questionBusy || !question.trim()}>{questionBusy ? "답변 중…" : "물어보기"}</button></div></form>
          <p className="lens-small">마이크를 누른 동안만 들어요. 음성인식은 브라우저 제공 서비스로 처리될 수 있어요. 인식한 질문은 AI에 전달돼요.</p>
          {answer && <p className="lens-answer" role="status">{answer}</p>}
        </section>
      </aside>
    </div>
    <section className="lens-saved"><div><span className="lens-eyebrow">내가 확인한 기록만</span><h2>이 기기에 남긴 식사</h2><p>사진 없이 이름·열량 범위·식당·시각만 저장해요. 이 브라우저에서만 볼 수 있어요.</p></div>{saved.length ? <div className="lens-saved-grid">{saved.map(item => <article key={item.id}><span>{clock(item.at)} · {item.place || "식당 미입력"}</span><h3>{item.name}</h3><p>{item.kcalLow}–{item.kcalHigh} kcal · AI 추정</p><button onClick={() => forget(item.id)}>기록 삭제</button></article>)}</div> : <p className="lens-empty">아직 저장한 식사가 없어요. 분석 후 확인한 내용만 기록할 수 있어요.</p>}</section>
  </main>;
}
