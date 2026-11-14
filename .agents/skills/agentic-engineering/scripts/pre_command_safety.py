#!/usr/bin/env python3
"""
pre_command_safety.py: High-speed (< 20ms) Negative Safety & Pre-Commit Hook for Antigravity.

Intercepts PreToolUse for `run_command`.
Enforces:
1. Destructive command prevention:
   - git push --force / -f
   - git reset --hard
   - git clean -f
   - drop table / database / truncate
   - rm -rf / or recursive system root deletion
2. Pre-Commit Quality & Doc-Sync Gate:
   - Before executing `git commit` or `git merge`, automatically executes
     `python .agents/skills/agentic-engineering/scripts/diff_inspector.py --check --staged`.
   - Blocks the commit immediately if production code was touched without synchronizing documentation.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

DESTRUCTIVE_PATTERNS = [
    (r"\bgit\s+push\s+.*(--force|-f\b)", "Force pushing to git remote is prohibited by safety rules."),
    (r"\bgit\s+reset\s+.*--hard\b", "git reset --hard will discard working tree changes; prohibited."),
    (r"\bgit\s+clean\s+.*(-[a-zA-Z]*f[a-zA-Z]*|--force)\b", "git clean with force will permanently delete untracked files; prohibited."),
    (r"\bgit\s+branch\s+.*(-[a-zA-Z]*D[a-zA-Z]*)\b", "Deleting git branches is prohibited."),
    (r"\b(drop|truncate)\s+(database|table)\b", "Direct database or table deletion is prohibited."),
    (r"\brm\s+-[a-zA-Z]*r[a-zA-Z]*f\s+[/~]", "Recursive deletion of root or home directory is prohibited."),
    (r"\brmdir\s+/s\s+/q\s+[cCdD]:\\", "Root drive recursive deletion is prohibited."),
]


def run_pre_commit_gate() -> tuple[bool, str]:
    """Runs diff_inspector to verify doc synchronization and diff cleanliness before commit."""
    script_path = Path(__file__).resolve().parent / "diff_inspector.py"
    repo_root = Path(__file__).resolve().parents[4]

    try:
        proc = subprocess.run(
            [sys.executable, str(script_path), "--check", "--staged"],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            timeout=10,
        )
        if proc.returncode != 0:
            return False, proc.stdout.strip() or proc.stderr.strip() or "Doc-sync verification failed."
        return True, ""
    except Exception as exc:
        # In case of script error, report issue
        return False, f"Diff inspector execution error: {exc}"


def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"decision": "allow"}))
            return

        payload = json.loads(raw_input)
        tool_call = payload.get("toolCall", {})
        tool_name = tool_call.get("name", "")
        args = tool_call.get("args", {})

        if tool_name == "run_command":
            cmd = args.get("CommandLine", "")

            # 1. Safety Checks: Block destructive actions
            for pattern, reason in DESTRUCTIVE_PATTERNS:
                if re.search(pattern, cmd, re.IGNORECASE):
                    result = {
                        "decision": "deny",
                        "reason": f"CRICBUZZ SAFETY GATE: Blocked destructive command. {reason}",
                    }
                    print(json.dumps(result))
                    return

            # 2. Pre-Commit Gate: Run diff_inspector before git commit or merge
            if re.search(r"\bgit\s+(commit|merge)\b", cmd, re.IGNORECASE):
                passed, error_msg = run_pre_commit_gate()
                if not passed:
                    result = {
                        "decision": "deny",
                        "reason": (
                            "CRICBUZZ PRE-COMMIT GATE: Blocked commit. "
                            "Diff inspector found that code was modified without required documentation synchronization.\n\n"
                            f"{error_msg}\n\n"
                            "Action: Review and update the associated documentation files before committing."
                        ),
                    }
                    print(json.dumps(result))
                    return

        print(json.dumps({"decision": "allow"}))
    except Exception as e:
        # In case of any unhandled hook error, fail safe
        print(json.dumps({"decision": "allow"}))


if __name__ == "__main__":
    main()
