#!/usr/bin/env python3
"""
stop_doc_guard.py: Antigravity Turn-End Stop Hook for Doc-Sync Enforcement.

Fires on `Stop` event when an agent finishes tool calls and attempts to end the turn.
Enforces:
1. If production code was modified in the working tree without corresponding documentation
   updates, forces continuation (`decision: "continue"`) so the active agent synchronizes
   docs before ending the session.
2. Prevents the "Chat A vs Chat B" problem where a subsequent session inherits undocumented
   code changes with no context.
3. Respects `continuationActive` to guarantee it only prompts once per turn and never traps
   the agent in an infinite loop.
"""

import json
import subprocess
import sys
from pathlib import Path


def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({}))
            return

        payload = json.loads(raw_input)
        termination_reason = payload.get("terminationReason", "")
        continuation_active = payload.get("continuationActive", False)

        # 1. Do not trap the agent in an infinite loop if it was already asked to continue this turn
        if continuation_active:
            print(json.dumps({}))
            return

        # 2. Only check on natural turn completion (NO_TOOL_CALL)
        if termination_reason != "NO_TOOL_CALL":
            print(json.dumps({}))
            return

        # 3. Run diff_inspector to check for doc sync alerts
        repo_root = Path(__file__).resolve().parents[4]
        script_path = Path(__file__).resolve().parent / "diff_inspector.py"

        proc = subprocess.run(
            [sys.executable, str(script_path), "--check"],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            timeout=10,
        )

        if proc.returncode != 0:
            # Doc sync alert detected! Force agent continuation in this session.
            output_msg = proc.stdout.strip() or "Doc-sync verification failed."
            result = {
                "decision": "continue",
                "reason": (
                    "CRICBUZZ DOC-SYNC GUARD: You modified production code without synchronizing "
                    "the required documentation. Please update the associated documentation before ending "
                    f"your turn so future sessions are not left with un-synchronized code:\n\n{output_msg}"
                ),
            }
            print(json.dumps(result))
            return

        # Everything synchronized or no production code touched
        print(json.dumps({}))

    except Exception:
        # Fail safe on any unexpected hook exception
        print(json.dumps({}))


if __name__ == "__main__":
    main()
