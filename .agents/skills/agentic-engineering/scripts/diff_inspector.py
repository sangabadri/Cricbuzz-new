#!/usr/bin/env python3
"""
diff_inspector.py: Automated Diff & Task-Sizing Inspector.

Inspects git diff and status against main or HEAD.
Automates:
1. File count & lines changed.
2. Layer detection (Backend Domain, Services, Repos, Routers, Frontend UI, Features, Tests).
3. Task Sizing Classification (Small: 1-3 files, Medium: 4-12 files, Large: 13+ files or Schema/Auth).
4. Oversized file detection (> 250 lines for new/modified components).
"""

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]


def run_cmd(cmd: list[str]) -> str:
    res = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True)
    return res.stdout.strip()


def main():
    print("=== CRICBUZZ DIFF & TASK-SIZING INSPECTOR ===")
    status_raw = run_cmd(["git", "status", "--short"])
    if not status_raw:
        print("[INFO] Working tree is clean. Comparing against HEAD~1 or origin/main if available.")
        diff_stat = run_cmd(["git", "diff", "--stat", "HEAD~1", "HEAD"])
        diff_names = run_cmd(["git", "diff", "--name-only", "HEAD~1", "HEAD"]).splitlines()
    else:
        diff_stat = run_cmd(["git", "diff", "--stat", "HEAD"])
        diff_names = run_cmd(["git", "diff", "--name-only", "HEAD"]).splitlines()

    files = [f.strip() for f in diff_names if f.strip()]
    if status_raw:
        for line in status_raw.splitlines():
            line = line.strip()
            if line.startswith("??"):
                untracked_file = line[2:].strip().strip('"')
                if untracked_file and untracked_file not in files:
                    files.append(untracked_file)

    count = len(files)

    print(f"Total Files Modified: {count}")
    if diff_stat:
        print("Diff Summary:")
        for line in diff_stat.splitlines()[-3:]:
            print(f"  {line}")

    # Detect sensitive or cross-cutting areas
    has_db_change = any("models/" in f or "alembic" in f for f in files)
    has_auth_change = any("auth" in f.lower() or "security" in f.lower() for f in files)
    has_domain_change = any("domain/" in f for f in files)

    # Classify Task Size
    if count == 0:
        size = "NO CHANGES"
        recommendation = "No changes detected."
    elif has_db_change or has_auth_change or count > 12:
        size = "LARGE TASK (High Risk)"
        recommendation = "Follow references/processes/03-large-feature.md. Requires Task Brief, Plan, ADR, and Independent Reviewer."
    elif count >= 4 or has_domain_change:
        size = "MEDIUM TASK (Moderate Risk)"
        recommendation = "Follow references/processes/02-medium-feature.md. Requires brief and proposal before coding."
    else:
        size = "SMALL TASK (Low Risk)"
        recommendation = "Follow references/processes/01-small-task.md. Focused tests + self-diff review."

    print(f"\nRecommended Classification: {size}")
    print(f"Guidance: {recommendation}")

    # Check for oversized files among modified files
    oversized = []
    for f in files:
        fpath = REPO_ROOT / f
        if fpath.exists() and fpath.is_file():
            line_count = len(fpath.read_text(encoding="utf-8", errors="ignore").splitlines())
            if line_count > 250 and not f.endswith("package-lock.json"):
                oversized.append((f, line_count))

    if oversized:
        print("\n[WARNING] Oversized files modified (exceeds 250 lines):")
        for f, lines in oversized:
            print(f"  - {f}: {lines} lines (aim for < 150 for components, < 300 for files)")

    print("---------------------------------------------")


if __name__ == "__main__":
    main()
