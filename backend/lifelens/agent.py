from __future__ import annotations

import json
import os

from strands import Agent
from strands.models import BedrockModel

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
            model = BedrockModel(
                model_id=os.getenv(
                    "LIFELENS_MODEL_ID", "global.amazon.nova-2-lite-v1:0"
                ),
                region_name=os.getenv("AWS_REGION", "ap-northeast-2"),
                temperature=0.1,
                max_tokens=1200,
            )
            self._agent = Agent(
                model=model,
                system_prompt=SYSTEM_PROMPT,
                tools=[self.tools.commit_confirmed_action],
                callback_handler=None,
            )
        return self._agent

    def analyze(self, event: MomentEvent) -> MomentAnalysis:
        validate_event(event)
        if self.demo_mode:
            return demo_analysis(event)

        prompt = (
            "Analyze this structured wearable moment. Do not call any mutating tool. "
            "Return one proposed action requiring confirmation. Use the action "
            "type that matches the moment: meal=save_meal_estimate, "
            "conversation=create_follow_up, evening=start_activity, "
            "mobility=apply_route_suggestion. For meals, include a conservative "
            "calorie range and optional activity-minute range in the payload.\n\n"
            + json.dumps(event.model_dump(mode="json"), ensure_ascii=False)
        )
        result = self.agent(prompt, structured_output_model=MomentAnalysis)
        if result.structured_output is None:
            raise RuntimeError("The model returned no structured LifeLens analysis.")
        return validate_analysis(result.structured_output, event)
