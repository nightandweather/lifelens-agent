from __future__ import annotations

from .models import MomentAnalysis, MomentEvent, MomentType, ProposedAction


FORBIDDEN_INFERENCES = (
    "is lying",
    "doesn't like you",
    "hates you",
    "narcissist",
    "depressed",
    "anxious person",
)


def validate_event(event: MomentEvent) -> None:
    if event.raw_media_retained:
        raise ValueError("LifeLens accepts derived observations, not retained raw media.")


def validate_analysis(analysis: MomentAnalysis) -> MomentAnalysis:
    combined = " ".join(
        [analysis.headline, analysis.observation, analysis.reasoning, analysis.uncertainty]
    ).lower()
    if any(term in combined for term in FORBIDDEN_INFERENCES):
        raise ValueError("Analysis contains a prohibited hidden-state inference.")
    if not analysis.proposed_action.requires_confirmation:
        raise ValueError("Every LifeLens action must require confirmation.")
    return analysis


def demo_analysis(event: MomentEvent) -> MomentAnalysis:
    """Deterministic fallback used for local demos and automated evaluation."""
    if event.moment_type is MomentType.meal:
        return MomentAnalysis(
            moment_type=event.moment_type,
            headline="A balanced lunch, with room to adjust.",
            observation="A mixed rice bowl and soup are visible.",
            reasoning="A visual estimate suggests roughly 620–760 kcal. With the authorized demo profile, that is about 14–18 optional easy-run minutes beyond the planned session.",
            uncertainty="Ingredients and weight cannot be verified from the image alone.",
            proposed_action=ProposedAction(
                action_type="save_meal_estimate",
                label="Confirm and log this meal",
                payload={
                    "kcal_low": 620,
                    "kcal_high": 760,
                    "optional_extra_run_minutes_low": 14,
                    "optional_extra_run_minutes_high": 18,
                },
            ),
            safety_notes=[
                "Estimate only",
                "No diagnosis or nutrition prescription",
                "Exercise is framed as optional, never as punishment for eating",
            ],
        )

    if event.moment_type is MomentType.conversation:
        return MomentAnalysis(
            moment_type=event.moment_type,
            headline="One promise is worth following through on.",
            observation="You explicitly offered to send revised slides by Friday afternoon.",
            reasoning="Remembering an explicit commitment can reduce relationship friction without judging the other person.",
            uncertainty="The conversation does not reveal how the other person felt.",
            proposed_action=ProposedAction(
                action_type="create_follow_up",
                label="Add a Friday follow-up",
                payload={"summary": "Send revised slides to Mina", "due": "Friday 15:00"},
            ),
            safety_notes=["No emotion inference", "Nothing sent automatically"],
        )

    if event.moment_type is MomentType.mobility:
        return MomentAnalysis(
            moment_type=event.moment_type,
            headline="Adjust the route, keep the goal.",
            observation="Rain is approaching and your pace has slowed for six minutes.",
            reasoning="A shorter, well-lit route home preserves the workout while reducing exposure to worsening weather.",
            uncertainty="The agent cannot determine fatigue, pain, or route safety with certainty.",
            proposed_action=ProposedAction(
                action_type="apply_route_suggestion",
                label="Use the 12-minute route home",
                payload={"route": "well_lit_home", "eta_minutes": 12},
            ),
            safety_notes=["Location is not shared", "Rerouting requires approval"],
        )

    return MomentAnalysis(
        moment_type=event.moment_type,
        headline="A small move could close the loop.",
        observation="You have been seated for 52 minutes after a low-movement day.",
        reasoning="A short walk matches your stated preference for gentle evening activity.",
        uncertainty="The agent does not know your current pain, fatigue, or medical status.",
        proposed_action=ProposedAction(
            action_type="start_activity",
            label="Start a 20-minute walk",
            payload={"activity": "walk", "minutes": 20},
        ),
        safety_notes=["Skip if unwell", "User controls intensity and timing"],
    )
