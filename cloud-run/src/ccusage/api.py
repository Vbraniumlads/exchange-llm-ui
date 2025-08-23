"""CCUsage API for monitoring Claude usage."""
import subprocess
import json
import datetime as dt
import re
from enum import Enum
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel


class PlanType(Enum):
    """Plan types."""
    PRO = "Pro"
    MAX5 = "Max5"
    MAX20 = "Max20"


PLAN_CONFIG: dict[str, dict[str, Any]] = {
    "Pro": {
        "token_limit": 19_000,
        "cost_limit": 18.0,
        "message_limit": 250,
        "display_name": "Pro"
    },
    "Max5": {
        "token_limit": 88_000,
        "cost_limit": 35.0,
        "message_limit": 1_000,
        "display_name": "Max5"
    },
    "Max20": {
        "token_limit": 220_000,
        "cost_limit": 140.0,
        "message_limit": 2_000,
        "display_name": "Max20"
    },
}

# Regex patterns for limit detection
_LIMIT_HIT = re.compile(
    r'(?:5\s*[- ]?\s*hour\s+limit\s+(?:reached|readched)|rate\s*limit)',
    re.IGNORECASE
)
_RESET_HINT = re.compile(
    r'(?:reset[s]?\s*(?:at|on|in)?\s*[:\-]?\s*)(?P<when>[^\n\r]+)',
    re.IGNORECASE
)


def _run(cmd: list[str], timeout: int = 30) -> tuple[int, str]:
    """Run shell command and return (returncode, output)."""
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    out = (p.stdout or "") + ("\n" + p.stderr if p.stderr else "")
    return p.returncode, out.strip()


def _normalize_plan(plan: PlanType | str) -> dict[str, Any]:
    """Normalize plan to config dict."""
    key = plan.value if isinstance(plan, PlanType) else str(plan)
    if key not in PLAN_CONFIG:
        raise ValueError(f"Unknown plan: {plan}")
    return PLAN_CONFIG[key]


def _utc_from_iso8601(zdt: str) -> dt.datetime:
    """Convert ISO8601 string to UTC datetime."""
    return dt.datetime.fromisoformat(zdt.replace("Z", "+00:00"))


def _fmt_utc(ts: dt.datetime) -> str:
    """Format datetime as UTC string."""
    return ts.strftime("%Y-%m-%d %H:%M UTC")


def _probe_limit_via_claude(test_cmd: tuple[str, ...]) -> dict[str, Any]:
    """Probe claude command to check limit status."""
    try:
        _, out = _run(list(test_cmd))
    except Exception as e:
        return {"type": "error", "message": str(e)}

    # Check for limit hit patterns
    if _LIMIT_HIT.search(out) or _RESET_HINT.search(out):
        return {"type": "limit", "message": out[:500]}

    # Check for expected response
    if "2" not in out.strip():
        return {"type": "error", "message": out[:500]}

    return {"type": "not_limited", "message": out.strip()}


def get_ccusage_status(
    plan: PlanType | str,
    test_cmd: tuple[str, ...] = ("claude", "-p", "1+1"),
) -> dict[str, Any]:
    """
    Return structured ccusage + limit info.
    
    Raises RuntimeError if ccusage call fails.
    """
    cfg = _normalize_plan(plan)
    cost_limit = cfg["cost_limit"]
    token_limit = cfg["token_limit"]
    msg_limit = cfg["message_limit"]

    # Probe for limits
    limit_info = _probe_limit_via_claude(test_cmd)

    # Fetch ccusage data
    code, raw = _run(["npx", "ccusage@latest", "blocks", "--active", "--json"])
    if code != 0:
        raise RuntimeError(f"ccusage failed: {raw[:200]}")

    data = json.loads(raw)
    block = data["blocks"][0]

    # Extract values
    active = bool(block.get("isActive", False))
    cost = float(block.get("costUSD", 0.0))
    tokens_used_raw = int(block.get("totalTokens", 0))
    tokens_used = tokens_used_raw / 1000  # Convert to K units
    msgs = int(block.get("entries", 0))
    models = block.get("models", [])

    # Calculate percentages
    cost_pct = (cost / cost_limit * 100) if cost_limit else 0.0
    token_pct = (tokens_used / token_limit * 100) if token_limit else 0.0
    msg_pct = (msgs / msg_limit * 100) if msg_limit else 0.0

    # Time calculations
    reset_at = _utc_from_iso8601(block["endTime"])
    now_utc = dt.datetime.now(dt.UTC)
    remaining_minutes = max(0, int((reset_at - now_utc).total_seconds() // 60))
    reset_at_str = _fmt_utc(reset_at)

    # Burn rate calculations
    burn = block.get("burnRate", {})
    burn_rate = float(burn.get("tokensPerMinuteForIndicator", 0.0))
    cost_rate = (
        float(burn.get("costPerHour", 0.0)) / 60.0
        if burn.get("costPerHour") else 0.0
    )

    # Predictions (use raw tokens for burn rate calculation)
    remain_tokens_raw = max(0.0, token_limit * 1000 - tokens_used_raw) if token_limit else 0.0
    if burn_rate > 0:
        predict_time = now_utc + dt.timedelta(minutes=remain_tokens_raw / burn_rate)
        tokens_will_run_out = _fmt_utc(predict_time)
    else:
        tokens_will_run_out = "N/A"

    return {
        "limit": limit_info,
        "plan": cfg["display_name"],
        "active": active,
        "models": models,
        "cost": {
            "used": cost,
            "limit": cost_limit,
            "percent": round(cost_pct, 1)
        },
        "tokens": {
            "used": tokens_used,
            "limit": token_limit,
            "percent": round(token_pct, 1)
        },
        "messages": {
            "used": msgs,
            "limit": msg_limit,
            "percent": round(msg_pct, 1)
        },
        "time_to_reset": {
            "remaining_minutes": remaining_minutes,
            "reset_at": reset_at_str
        },
        "burn_rate": burn_rate,
        "cost_rate": round(cost_rate, 4),
        "predictions": {
            "tokens_will_run_out": tokens_will_run_out,
            "limit_resets_at": reset_at_str
        },
    }


class StatusResponse(BaseModel):
    """Response model for status endpoint."""
    limit: dict[str, Any]
    plan: str
    active: bool
    models: list[Any]
    cost: dict[str, Any]
    tokens: dict[str, Any]
    messages: dict[str, Any]
    time_to_reset: dict[str, Any]
    burn_rate: float
    cost_rate: float
    predictions: dict[str, Any]


app = FastAPI(
    title="CCUsage Status API",
    description="VibeTorch CCUsage monitoring API"
)


@app.get("/status", response_model=StatusResponse)
def status(plan: str = Query("Pro", description="Pro | Max5 | Max20")):
    """Get Claude usage status."""
    try:
        data = get_ccusage_status(plan)
        return data
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except RuntimeError as re_err:
        raise HTTPException(status_code=502, detail=str(re_err))


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "ccusage_api"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)