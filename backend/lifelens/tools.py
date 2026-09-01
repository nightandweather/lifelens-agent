from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from strands import tool

from .models import ActionReceipt, ConfirmActionRequest


@dataclass
class MemoryStore:
    """In-memory MVP store containing only user-approved structured fields."""

    records: list[dict[str, Any]] = field(default_factory=list)

    def append(self, record: dict[str, Any]) -> None:
        self.records.append(record)


class LifeLensTools:
    def __init__(self, store: MemoryStore | None = None) -> None:
        self.store = store or MemoryStore()

    @tool
    def commit_confirmed_action(
        self,
        event_id: str,
        action_type: str,
        label: str,
        payload: dict[str, Any],
        confirmed: bool = False,
    ) -> dict[str, Any]:
        """Commit a structured LifeLens action only after explicit user confirmation.

        Args:
            event_id: Source moment identifier.
            action_type: One of save_meal_estimate, create_follow_up, start_activity,
                or apply_route_suggestion.
            label: Human-readable action label shown to the user.
            payload: Minimal structured fields needed for the action.
            confirmed: True only when the user explicitly approved this exact action.
        """
        if not confirmed:
            return {
                "status": "blocked",
                "message": "Explicit confirmation is required. Nothing was stored or executed.",
            }

        allowed = {
            "save_meal_estimate",
            "create_follow_up",
            "start_activity",
            "apply_route_suggestion",
        }
        if action_type not in allowed:
            return {"status": "blocked", "message": "Unsupported action type."}

        record = {
            "event_id": event_id,
            "action_type": action_type,
            "label": label,
            "payload": payload,
        }
        self.store.append(record)
        return {
            "status": "committed",
            "message": "The approved structured action was saved.",
            "stored_fields": sorted(record.keys()),
        }

    def confirm(self, request: ConfirmActionRequest) -> ActionReceipt:
        result = self.commit_confirmed_action(
            event_id=request.event_id,
            action_type=request.action.action_type,
            label=request.action.label,
            payload=request.action.payload,
            confirmed=request.confirmed,
        )
        return ActionReceipt(
            status=str(result.get("status", "blocked")),
            event_id=request.event_id,
            message=str(result.get("message", "Action not completed.")),
            stored_fields=list(result.get("stored_fields", [])),
        )
