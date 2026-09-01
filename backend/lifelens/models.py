from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class MomentType(str, Enum):
    meal = "meal"
    conversation = "conversation"
    evening = "evening"


class MomentEvent(BaseModel):
    event_id: str
    moment_type: MomentType
    captured_at: str
    observations: list[str] = Field(min_length=1, max_length=12)
    transcript_excerpt: str | None = Field(default=None, max_length=500)
    user_goal: str | None = Field(default=None, max_length=240)
    raw_media_retained: bool = False


class ProposedAction(BaseModel):
    action_type: str
    label: str
    payload: dict[str, Any] = Field(default_factory=dict)
    requires_confirmation: bool = True


class MomentAnalysis(BaseModel):
    moment_type: MomentType
    headline: str
    observation: str
    reasoning: str
    uncertainty: str
    proposed_action: ProposedAction
    safety_notes: list[str] = Field(default_factory=list)


class ConfirmActionRequest(BaseModel):
    event_id: str
    action: ProposedAction
    confirmed: bool


class ActionReceipt(BaseModel):
    status: str
    event_id: str
    message: str
    stored_fields: list[str] = Field(default_factory=list)
