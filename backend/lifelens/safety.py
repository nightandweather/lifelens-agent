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
            reasoning="A visual estimate suggests roughly 620–760 kcal, depending on oil and portion size.",
            uncertainty="Ingredients and weight cannot be verified from the image alone.",
            proposed_action=ProposedAction(
                action_type="save_meal_estimate",
                label="Confirm and log this meal",
                payload={"kcal_low": 620, "kcal_high": 760},
            ),
            safety_notes=["Estimate only", "No diagnosis or nutrition prescription"],
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
