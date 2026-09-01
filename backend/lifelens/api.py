from __future__ import annotations

from fastapi import FastAPI, HTTPException

from .agent import LifeLensService
from .models import ActionReceipt, ConfirmActionRequest, MomentAnalysis, MomentEvent

app = FastAPI(
    title="LifeLens Agent API",
    version="0.1.0",
    description="Consent-gated Strands agent for wearable daily moments.",
)
service = LifeLensService()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy", "mode": "demo" if service.demo_mode else "bedrock"}


@app.post("/v1/moments/analyze", response_model=MomentAnalysis)
def analyze_moment(event: MomentEvent) -> MomentAnalysis:
    try:
        return service.analyze(event)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/v1/actions/confirm", response_model=ActionReceipt)
def confirm_action(request: ConfirmActionRequest) -> ActionReceipt:
    return service.tools.confirm(request)
