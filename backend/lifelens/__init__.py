"""LifeLens services; keep cloud perception independent of Strands startup."""
__all__ = ["LifeLensService"]


def __getattr__(name):
    if name == "LifeLensService":
        from .agent import LifeLensService
        return LifeLensService
    raise AttributeError(name)
