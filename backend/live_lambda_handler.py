"""Isolated Wanted endpoint. No request bodies, media or transcripts are logged."""
import base64
import hmac
import json
import os
from lifelens.live_context import LiveContextService

_service = None

def response(status, body):
    return {"statusCode": status, "headers": {"content-type": "application/json; charset=utf-8", "cache-control": "no-store"}, "body": json.dumps(body, ensure_ascii=False)}

def handler(event, _context):
    global _service
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    path = event.get("rawPath", "/")
    if method == "GET" and path == "/health":
        return response(200, {"status": "ok", "capabilities": ["vision", "question"], "mediaStorage": False})
    headers = {k.lower(): v for k, v in event.get("headers", {}).items()}
    token = os.getenv("LIFELENS_LIVE_TOKEN", "")
    if not token or not hmac.compare_digest(headers.get("authorization", ""), "Bearer " + token):
        return response(401, {"error": "Unauthorized"})
    if method != "POST" or path not in {"/v1/perception/analyze", "/v1/context/question"}:
        return response(404, {"error": "Not found"})
    try:
        raw = event.get("body") or "{}"
        if len(raw) > 1_500_000:
            return response(413, {"error": "Payload too large"})
        if event.get("isBase64Encoded"):
            raw = base64.b64decode(raw).decode("utf-8")
        payload = json.loads(raw)
        if not isinstance(payload, dict):
            raise ValueError()
        if _service is None:
            _service = LiveContextService()
        value = _service.perceive(payload) if path == "/v1/perception/analyze" else _service.question(payload)
        return response(200, value)
    except (ValueError, TypeError, KeyError):
        return response(422, {"error": "Invalid input or inconclusive model output"})
    except Exception:
        return response(502, {"error": "AI temporarily unavailable"})
