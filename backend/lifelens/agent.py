from __future__ import annotations

import json
import os

from strands import Agent

from .models import MomentAnalysis, MomentEvent
from .prompts import SYSTEM_PROMPT
from .safety import demo_analysis, validate_analysis, validate_event
from .tools import LifeLensTools


class LifeLensService:
    def __init__(self, demo_mode: bool | None = None) -> None:
        self.demo_mode = (
            demo_mode
            if demo_mode is not None
            else os.getenv("LIFELENS_DEMO_MODE", "1") == "1"
        )
        self.tools = LifeLensTools()
        self._agent: Agent | None = None

    @property
    def agent(self) -> Agent:
        if self._agent is None:
            self._agent = Agent(
                system_prompt=SYSTEM_PROMPT,
                tools=[self.tools.commit_confirmed_action],
                callback_handler=None,
            )
        return self._agent

    def analyze(self, event: MomentEvent) -> MomentAnalysis:
        validate_event(event)
        if self.demo_mode:
            return validate_analysis(demo_analysis(event))

        prompt = (
            "Analyze this structured wearable moment. Do not call any mutating tool. "
            "Return one proposed action requiring confirmation.\n\n"
            + json.dumps(event.model_dump(mode="json"), ensure_ascii=False)
        )
        result = self.agent(prompt, structured_output_model=MomentAnalysis)
        if result.structured_output is None:
            raise RuntimeError("The model returned no structured LifeLens analysis.")
        return validate_analysis(result.structured_output)
