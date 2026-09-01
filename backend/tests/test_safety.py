from lifelens.agent import LifeLensService
from lifelens.models import ConfirmActionRequest, MomentEvent
from lifelens.mock_device import RayBanMockAdapter


def test_mock_day_has_no_retained_raw_media() -> None:
    moments = list(RayBanMockAdapter("fixtures/day.jsonl").stream())
    assert len(moments) == 3
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
