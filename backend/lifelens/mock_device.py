from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path

from .models import MomentEvent


class RayBanMockAdapter:
    """Adapter boundary matching events derived from Meta's Mock Device Kit.

    A native iOS/Android bridge should convert sampled camera/audio frames into
    these structured events, then discard the raw samples. This JSONL adapter
    gives the hackathon demo the same downstream contract without hardware.
    """

    def __init__(self, fixture_path: str | Path) -> None:
        self.fixture_path = Path(fixture_path)

    def stream(self) -> Iterator[MomentEvent]:
        with self.fixture_path.open(encoding="utf-8") as fixture:
            for line in fixture:
                if line.strip():
                    yield MomentEvent.model_validate_json(line)
