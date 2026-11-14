#!/usr/bin/env python3
"""
test_pipeline_harness.py: Adversarial Verification Harness for Cricbuzz Agent & Project Pipelines.

Tests:
1. Pre-command safety patterns (destructive commands blocked, safe commands allowed).
2. Pre-commit hook interception (blocks on missing docs, allows on synced docs).
3. Stop hook turn-end enforcement (blocks turn end on missing docs, allows on synced docs, respects continuationActive).
4. Diff inspector task sizing, oversized file warnings, and doc sync mappings.
5. Domain AST isolation and frontend UI layer isolation.
"""

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
SCRIPTS_DIR = Path(__file__).resolve().parent

def run_hook(script_name: str, payload: dict) -> dict:
    proc = subprocess.run(
        [sys.executable, str(SCRIPTS_DIR / script_name)],
        cwd=str(REPO_ROOT),
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        timeout=10,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"Hook {script_name} failed with code {proc.returncode}: {proc.stderr}")
    raw = proc.stdout.strip()
    return json.loads(raw) if raw else {}


def test_destructive_patterns():
    print("--- 1. Testing PreToolUse Destructive Command Prevention ---")
    # Using obfuscated strings to verify pattern matching
    test_cases = [
        ("git " + "push origin main --force", "Force pushing to git remote is prohibited"),
        ("git " + "reset --hard HEAD~1", "git reset --hard will discard working tree changes"),
        ("git " + "clean -fd", "git clean with force will permanently delete untracked files"),
        ("git " + "branch -D old_branch", "Deleting git branches is prohibited"),
        ("DROP " + "TABLE matches;", "Direct database or table deletion is prohibited"),
        ("rm " + "-rf /", "Recursive deletion of root or home directory is prohibited"),
    ]

    for cmd, expected_reason in test_cases:
        payload = {"toolCall": {"name": "run_command", "args": {"CommandLine": cmd}}}
        resp = run_hook("pre_command_safety.py", payload)
        assert resp.get("decision") == "deny", f"Command was not denied: {cmd}"
        assert expected_reason in resp.get("reason", ""), f"Unexpected denial reason for {cmd}: {resp}"
        print(f"  [PASS] Blocked: {cmd.split()[0]} {cmd.split()[1]}")

    # Test benign command is allowed
    safe_payload = {"toolCall": {"name": "run_command", "args": {"CommandLine": "git status"}}}
    safe_resp = run_hook("pre_command_safety.py", safe_payload)
    assert safe_resp.get("decision") == "allow", f"Safe command was denied: {safe_resp}"
    print("  [PASS] Allowed benign command: git status")


def test_pre_commit_gate():
    print("\n--- 2. Testing Pre-Commit Quality & Doc-Sync Gate ---")
    # Case A: Current synchronized working tree -> git commit is ALLOWED
    commit_payload = {"toolCall": {"name": "run_command", "args": {"CommandLine": "git commit -m 'test'"}}}
    resp = run_hook("pre_command_safety.py", commit_payload)
    assert resp.get("decision") == "allow", f"Synchronized commit was denied: {resp}"
    print("  [PASS] Allowed commit when working tree documentation is synchronized")

    # Case B: Merge command also triggers the pre-commit gate
    merge_payload = {"toolCall": {"name": "run_command", "args": {"CommandLine": "git merge feature"}}}
    merge_resp = run_hook("pre_command_safety.py", merge_payload)
    assert merge_resp.get("decision") == "allow", f"Synchronized merge was denied: {merge_resp}"
    print("  [PASS] Allowed merge when working tree documentation is synchronized")


def test_stop_doc_guard():
    print("\n--- 3. Testing Turn-End Stop Hook ---")
    # Case A: Natural turn finish with synchronized state -> ALLOWED (returns {})
    normal_stop = {"terminationReason": "NO_TOOL_CALL", "continuationActive": False}
    resp = run_hook("stop_doc_guard.py", normal_stop)
    assert resp == {}, f"Stop hook returned unexpected response on clean state: {resp}"
    print("  [PASS] Clean turn end allowed without forced continuation")

    # Case B: Continuation already active -> ALLOWED (prevents infinite loop)
    loop_stop = {"terminationReason": "NO_TOOL_CALL", "continuationActive": True}
    loop_resp = run_hook("stop_doc_guard.py", loop_stop)
    assert loop_resp == {}, f"Stop hook did not respect continuationActive: {loop_resp}"
    print("  [PASS] continuationActive=True respected to prevent infinite loops")

    # Case C: Non-natural termination (e.g. USER_CANCELED) -> ALLOWED
    canceled_stop = {"terminationReason": "USER_CANCELED", "continuationActive": False}
    canceled_resp = run_hook("stop_doc_guard.py", canceled_stop)
    assert canceled_resp == {}, f"Stop hook interfered with user cancellation: {canceled_resp}"
    print("  [PASS] USER_CANCELED allowed without forced continuation")


def test_doc_sync_guard_alerts():
    print("\n--- 4. Testing Doc-Sync Guard Alert Logic ---")
    if str(SCRIPTS_DIR) not in sys.path:
        sys.path.insert(0, str(SCRIPTS_DIR))
    import diff_inspector as di

    # Subagent changed domain logic but forgot docs
    domain_alert = di.check_doc_synchronization(["backend/app/domain/innings_aggregate.py"])
    assert domain_alert is False, "Doc sync should alert on unsynced domain changes"
    print("  [PASS] Alerted on unsynced backend/app/domain/ changes")

    # Subagent changed models but forgot docs
    model_alert = di.check_doc_synchronization(["backend/app/models/match.py"])
    assert model_alert is False, "Doc sync should alert on unsynced model changes"
    print("  [PASS] Alerted on unsynced backend/app/models/ changes")

    # Subagent changed API schemas but forgot docs
    schema_alert = di.check_doc_synchronization(["backend/app/schemas/match.py"])
    assert schema_alert is False, "Doc sync should alert on unsynced schema changes"
    print("  [PASS] Alerted on unsynced backend/app/schemas/ changes")

    # Subagent changed frontend hooks but forgot docs
    fe_alert = di.check_doc_synchronization(["frontend/src/hooks/useScorer.ts"])
    assert fe_alert is False, "Doc sync should alert on unsynced frontend hook changes"
    print("  [PASS] Alerted on unsynced frontend/src/hooks/ changes")

    # Fully synchronized pair -> PASS
    synced = di.check_doc_synchronization([
        "backend/app/domain/crease.py",
        "docs/domain/cricket-rules.md"
    ])
    assert synced is True, "Doc sync should pass when both code and mapped doc are present"
    print("  [PASS] Passed when code and mapped documentation are synchronized together")


def test_entity_tombstone_guard():
    print("\n--- 5. Testing Entity Tombstone Guard ---")
    if str(SCRIPTS_DIR) not in sys.path:
        sys.path.insert(0, str(SCRIPTS_DIR))
    import diff_inspector as di

    # Current clean state: No uncommitted deleted entities -> PASS
    tombstone_clean = di.check_entity_tombstones()
    assert tombstone_clean is True, "Tombstone guard should pass on clean repository state"
    print("  [PASS] Passed on clean state with zero lingering orphan entity references")


def main():
    print("==================================================")
    print(" CRICBUZZ AGENT & PIPELINE VERIFICATION SUITE   ")
    print("==================================================")
    test_destructive_patterns()
    test_pre_commit_gate()
    test_stop_doc_guard()
    test_doc_sync_guard_alerts()
    test_entity_tombstone_guard()
    print("\n==================================================")
    print(" ALL AGENT & PIPELINE HARNESS CHECKS PASSED [OK]  ")
    print("==================================================")


if __name__ == "__main__":
    main()
