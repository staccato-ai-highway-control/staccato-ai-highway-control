from pathlib import Path


PROMPT_DIR = Path(__file__).resolve().parents[1] / "prompts"


def load_prompt(prompt_name: str) -> str:
    path = PROMPT_DIR / prompt_name

    if not path.exists():
        return ""

    return path.read_text(encoding="utf-8")
