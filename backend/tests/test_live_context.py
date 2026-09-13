import base64
import json
import pytest
from lifelens.live_context import LiveContextService, normalize_observation
import live_lambda_handler


def observation(**kwargs):
    value = {"scene": "food", "confidence": .9, "headline": "식사", "description": "보이는 음식", "visibleText": [], "food": {"name": "비빔밥", "kcalLow": 500, "kcalHigh": 800, "portion": "한 그릇", "basis": "시각 추정"}, "uncertainty": "중량 불명"}
    return value | kwargs


def test_low_confidence_has_no_calorie_claim():
    assert normalize_observation(observation(confidence=.4))["food"] is None


@pytest.mark.parametrize("low,high", [(700, 600), (-1, 500), (1, float("inf")), (500, 500), (True, 500)])
def test_rejects_unusable_calorie_ranges(low, high):
    value = observation(); value["food"]["kcalLow"] = low; value["food"]["kcalHigh"] = high
    with pytest.raises(ValueError): normalize_observation(value)


class Client:
    def __init__(self): self.called = False
    def converse(self, **kwargs):
        self.called = True
        assert kwargs["messages"][0]["content"][0]["image"]["source"]["bytes"].startswith(b"\xff\xd8\xff")
        return {"output": {"message": {"content": [{"text": json.dumps(observation())}]}}, "stopReason": "end_turn"}


def test_image_requires_consent_and_never_enters_output():
    client = Client(); service = LiveContextService(client)
    with pytest.raises(ValueError): service.perceive({"cloud_consent": False})
    assert not client.called
    encoded = "data:image/jpeg;base64," + base64.b64encode(b"\xff\xd8\xff" + b"0" * 64).decode()
    value = service.perceive({"image": encoded, "cloud_consent": True, "mode": "meal"})
    assert client.called and value["food"]["name"] == "비빔밥"
    assert "image" not in value and encoded not in json.dumps(value)


def test_handler_authentication_precedes_model_calls(monkeypatch):
    monkeypatch.setenv("LIFELENS_LIVE_TOKEN", "fixture-secret")
    response = live_lambda_handler.handler({"rawPath": "/v1/perception/analyze", "requestContext": {"http": {"method": "POST"}}, "body": "{}"}, None)
    assert response["statusCode"] == 401


def test_invalid_image_never_calls_provider():
    client = Client()
    with pytest.raises(ValueError): LiveContextService(client).perceive({"image": "data:image/jpeg;base64,bm90IGFuIGltYWdl", "mode": "meal", "cloud_consent": True})
    assert not client.called
