from __future__ import annotations

import base64
import json
import os
from typing import Any

from pydantic import ValidationError

from lifelens.agent import LifeLensService
from lifelens.models import ConfirmActionRequest, MomentEvent


service = LifeLensService(demo_mode=False)
allowed_origin = os.getenv(
    "LIFELENS_ALLOWED_ORIGIN", "https://lifelens-agent.kanghoun.chatgpt.site"
)
agent_token = os.getenv("LIFELENS_AGENT_TOKEN", "")


def _response(status: int, body: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status,
        "headers": {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": allowed_origin,
            "access-control-allow-methods": "GET,POST,OPTIONS",
            "access-control-allow-headers": "content-type",
            "cache-control": "no-store",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }


def _body(event: dict[str, Any]) -> dict[str, Any]:
    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raw = base64.b64decode(raw).decode("utf-8")
    return json.loads(raw)


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    request = event.get("requestContext", {}).get("http", {})
    method = request.get("method", "GET")
    path = event.get("rawPath", "/")

    if method == "OPTIONS":
        return _response(204, {})
    if method == "GET" and path in {"/", "/health"}:
        return _response(
            200,
            {
                "status": "ok",
                "mode": "strands-bedrock",
                "runtime": "aws-lambda",
                "model": os.getenv(
                    "LIFELENS_MODEL_ID", "global.amazon.nova-2-lite-v1:0"
                ),
            },
        )

    headers = {str(k).lower(): str(v) for k, v in (event.get("headers") or {}).items()}
    if not agent_token or headers.get("authorization") != f"Bearer {agent_token}":
        return _response(401, {"error": "Unauthorized"})

    try:
        payload = _body(event)
        if method == "POST" and path == "/v1/moments/analyze":
            result = service.analyze(MomentEvent.model_validate(payload))
            return _response(200, result.model_dump(mode="json"))
        if method == "POST" and path == "/v1/actions/confirm":
            confirmation = ConfirmActionRequest.model_validate(payload)
            result = service.tools.confirm(confirmation)
            return _response(200, result.model_dump(mode="json"))
        return _response(404, {"error": "Not found"})
    except (ValidationError, ValueError, json.JSONDecodeError) as error:
        return _response(422, {"error": str(error)})
    except Exception:
        return _response(500, {"error": "Agent execution failed safely."})
