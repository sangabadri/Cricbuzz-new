#!/usr/bin/env python3
"""
pre_command_safety.py: High-speed (< 20ms) Negative Safety Hook for Antigravity.

Intercepts PreToolUse for `run_command`.
Blocks destructive commands per .agents/skills/agentic-engineering/references/checklists/safety.md:
- git push --force / -f
- git reset --hard
- drop table / database / truncate
- rm -rf / or recursive system root deletion
"""

import json
import re
import sys

DESTRUCTIVE_PATTERNS = [
    (r"\bgit\s+push\s+.*(--force|-f)\b", "Force pushing to git remote is prohibited by safety rules."),
    (r"\bgit\s+reset\s+--hard\b", "git reset --hard will discard working tree changes; prohibited."),
    (r"\bgit\s+clean\s+.*-[a-zA-Z]*f\b", "git clean with force will permanently delete untracked files; prohibited."),
    (r"\bgit\s+branch\s+-[dD]\b", "Deleting git branches is prohibited."),
    (r"\b(drop|truncate)\s+(database|table)\b", "Direct database or table deletion is prohibited."),
    (r"\brm\s+-[a-zA-Z]*r[a-zA-Z]*f\s+[/~]", "Recursive deletion of root or home directory is prohibited."),
    (r"\brmdir\s+/s\s+/q\s+[cCdD]:\\", "Root drive recursive deletion is prohibited."),
]


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
            for pattern, reason in DESTRUCTIVE_PATTERNS:
                if re.search(pattern, cmd, re.IGNORECASE):
                    result = {
                        "decision": "deny",
                        "reason": f"CRICBUZZ SAFETY GATE: Blocked destructive command. {reason}",
                    }
                    print(json.dumps(result))
                    return

        print(json.dumps({"decision": "allow"}))
    except Exception as e:
        # In case of any hook error, fail safe
        print(json.dumps({"decision": "allow"}))


if __name__ == "__main__":
    main()
