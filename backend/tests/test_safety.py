from lifelens.agent import LifeLensService
import pytest

from lifelens.models import (
    ConfirmActionRequest,
    MomentAnalysis,
    MomentEvent,
    MomentType,
    ProposedAction,
)
from lifelens.mock_device import RayBanMockAdapter
from lifelens.safety import validate_analysis


def test_mock_day_has_no_retained_raw_media() -> None:
    moments = list(RayBanMockAdapter("fixtures/day.jsonl").stream())
    assert len(moments) == 4
    assert all(not moment.raw_media_retained for moment in moments)


def test_every_proposal_requires_confirmation() -> None:
    service = LifeLensService(demo_mode=True)
    for event in RayBanMockAdapter("fixtures/day.jsonl").stream():
        analysis = service.analyze(event)
        assert analysis.proposed_action.requires_confirmation is True


def test_unconfirmed_action_is_blocked() -> None:
    service = LifeLensService(demo_mode=True)
    event = next(RayBanMockAdapter("fixtures/day.jsonl").stream())
    analysis = service.analyze(event)
    receipt = service.tools.confirm(
        ConfirmActionRequest(
            event_id=event.event_id,
            action=analysis.proposed_action,
            confirmed=False,
        )
    )
    assert receipt.status == "blocked"
    assert service.tools.store.records == []


def test_confirmed_action_stores_structured_fields_only() -> None:
    service = LifeLensService(demo_mode=True)
    event = next(RayBanMockAdapter("fixtures/day.jsonl").stream())
    analysis = service.analyze(event)
    receipt = service.tools.confirm(
        ConfirmActionRequest(
            event_id=event.event_id,
            action=analysis.proposed_action,
            confirmed=True,
        )
    )
    assert receipt.status == "committed"
    assert len(service.tools.store.records) == 1
    assert "raw_media" not in service.tools.store.records[0]


def test_action_type_must_match_moment() -> None:
    event = MomentEvent(
        event_id="meal-guard",
        moment_type=MomentType.meal,
        captured_at="2026-09-03T12:00:00+09:00",
        observations=["meal visible"],
    )
    analysis = MomentAnalysis(
        moment_type=MomentType.meal,
        headline="Meal visible",
        observation="A meal is visible.",
        reasoning="The portion is uncertain.",
        uncertainty="Ingredients are unknown.",
        proposed_action=ProposedAction(
            action_type="create_follow_up",
            label="Wrong action",
        ),
    )
    with pytest.raises(ValueError, match="does not match"):
        validate_analysis(analysis, event)
