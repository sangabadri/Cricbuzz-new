#!/usr/bin/env python3
"""
diff_inspector.py: Automated Diff, Task-Sizing & Doc-Sync Inspector.

Inspects git diff and status against main or HEAD.
Automates:
1. File count & lines changed.
2. Layer detection (Backend Domain, Services, Repos, Routers, Frontend UI, Features, Tests).
3. Task Sizing Classification (Small: 1-3 files, Medium: 4-12 files, Large: 13+ files or Schema/Auth).
4. Oversized file detection (> 250 lines for new/modified components).
5. Doc Sync Guard: Deterministic Code -> Doc mapping verification to prevent doc drift.
6. CI/Hook Exit Codes: --check returns non-zero if unsynchronized code changes are detected.
"""

import argparse
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]

# Deterministic Code-to-Documentation Mapping Matrix
CODE_TO_DOC_MAPPINGS = [
    {
        "name": "Cricket Domain Rules",
        "code_prefixes": ("backend/app/domain/",),
        "docs": (
            "docs/domain/cricket-rules.md",
            "backend/docs/domain/domain-implementation.md",
        ),
        "description": "Cricket laws, crease state, and format rules",
    },
    {
        "name": "Database Schema & Models",
        "code_prefixes": ("backend/app/models/", "alembic/"),
        "docs": (
            "backend/docs/database/schema-and-relationships.md",
            "docs/domain/domain-model.md",
            "docs/architecture/system-overview.md",
        ),
        "description": "SQLAlchemy models, relations, foreign keys, and indexes",
    },
    {
        "name": "API Contracts & Schemas",
        "code_prefixes": ("backend/app/schemas/", "backend/app/routers/", "frontend/src/types/cricket.ts"),
        "docs": (
            "docs/contracts/interface-contracts.md",
            "backend/docs/api/api-design-and-error-handling.md",
        ),
        "description": "REST endpoints, request/response schemas, and error contracts",
    },
    {
        "name": "Backend Architecture & Services",
        "code_prefixes": ("backend/app/services/", "backend/app/repositories/"),
        "docs": (
            "backend/docs/architecture/components-and-responsibilities.md",
            "backend/docs/database/transactions-and-consistency.md",
        ),
        "description": "Service orchestration, transaction lock order, and repository queries",
    },
    {
        "name": "Authentication & Access Decisions",
        "code_prefixes": ("backend/app/api/deps.py", "backend/app/services/match_access.py", "backend/app/services/auth.py"),
        "docs": (
            "docs/decisions/0005-no-auth.md",
            "docs/decisions/0007-match-access-single-source-of-truth.md",
            "docs/decisions/0008-single-owner-match-model.md",
            "docs/product/overview.md",
            "docs/architecture/system-overview.md",
        ),
        "description": "Public spectator access, session tokens, and match access permissions",
    },
    {
        "name": "Frontend Architecture & Features",
        "code_prefixes": ("frontend/src/features/", "frontend/src/components/"),
        "docs": (
            "frontend/docs/architecture/application-structure.md",
            "frontend/docs/architecture/state-and-data-flow.md",
        ),
        "description": "Feature boundaries, screen composition, and UI layer isolation",
    },
    {
        "name": "Frontend API Client & Integration",
        "code_prefixes": ("frontend/src/lib/api-client.ts", "frontend/src/hooks/useScorer.ts"),
        "docs": (
            "frontend/docs/integration/api-integration.md",
            "docs/contracts/interface-contracts.md",
        ),
        "description": "Axios client, 401 refresh interceptors, and scorer state hooks",
    },
]


def run_cmd(cmd: list[str]) -> str:
    res = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True)
    return res.stdout.strip()


def check_doc_synchronization(files: list[str]) -> bool:
    """
    Doc Sync Guard: Checks if modified production code has corresponding
    documentation updates in the active git diff.
    Returns True if synchronized or no sensitive code touched, False if alerts exist.
    """
    print("\n=== DOCUMENTATION SYNCHRONIZATION GUARD ===")
    norm_files = [f.replace("\\", "/") for f in files]

    sync_alerts = []
    sync_ok = []

    for mapping in CODE_TO_DOC_MAPPINGS:
        # Match production code files (exclude tests and docs)
        matched_code = [
            f for f in norm_files
            if any(f.startswith(prefix) or prefix in f for prefix in mapping["code_prefixes"])
            and not ("/tests/" in f or "__tests__" in f or f.startswith("docs/") or "/docs/" in f)
        ]

        if not matched_code:
            continue

        # Check if any associated doc was updated in the diff
        updated_docs = [doc for doc in mapping["docs"] if doc in norm_files]

        if updated_docs:
            sync_ok.append((mapping["name"], matched_code, updated_docs))
        else:
            sync_alerts.append((mapping["name"], matched_code, mapping["docs"]))

    if not sync_ok and not sync_alerts:
        print("[INFO] No production code touched that requires architectural doc updates.")
        return True

    for name, code_files, updated_docs in sync_ok:
        doc_names = ", ".join(updated_docs)
        print(f"[DOC SYNC: OK] {name}")
        print(f"  Code modified: {len(code_files)} file(s) ({', '.join(code_files[:2])}{'...' if len(code_files) > 2 else ''})")
        print(f"  Doc synchronized: {doc_names}")

    if sync_alerts:
        print("\n[DOC SYNC: ALERT] Code changed without corresponding doc updates:")
        for name, code_files, expected_docs in sync_alerts:
            print(f"  * {name}:")
            print(f"    Modified code: {', '.join(code_files[:3])}{'...' if len(code_files) > 3 else ''}")
            print(f"    Associated docs to review:")
            for doc in expected_docs:
                print(f"      - {doc}")
        return False

    print("\n[DOC SYNC: STATUS] All touched architectural components have synchronized documentation.")
    return True


def check_entity_tombstones(prefer_staged: bool = False) -> bool:
    """
    Tombstone Guard: Detects deleted production entities (models, services, routers, components)
    and verifies that references to the deleted entity are completely purged from
    active documentation, architecture diagrams, and test matrices.
    """
    print("\n=== ENTITY TOMBSTONE GUARD ===")
    if prefer_staged:
        deleted_raw = run_cmd(["git", "diff", "--cached", "--diff-filter=D", "--name-only"])
    else:
        status_raw = run_cmd(["git", "status", "--short"])
        if not status_raw:
            deleted_raw = run_cmd(["git", "diff", "--diff-filter=D", "--name-only", "HEAD~1", "HEAD"])
        else:
            deleted_raw = run_cmd(["git", "diff", "--diff-filter=D", "--name-only", "HEAD"])

    deleted_files = [f.strip().replace("\\", "/") for f in deleted_raw.splitlines() if f.strip()]

    # Filter for production entity deletions
    prod_prefixes = (
        "backend/app/models/",
        "backend/app/services/",
        "backend/app/repositories/",
        "backend/app/routers/",
        "frontend/src/features/",
        "frontend/src/components/",
    )
    generic_names = {"__init__", "base", "deps", "index", "types", "api", "utils", "common"}
    tombstone_keywords = {"eliminated", "removed", "retired", "superseded", "deleted", "deprecated"}

    stems_to_check = set()
    for f in deleted_files:
        if any(f.startswith(p) for p in prod_prefixes):
            stem = Path(f).stem
            if stem and stem.lower() not in generic_names:
                stems_to_check.add((stem, f))

    if not stems_to_check:
        print("[TOMBSTONE: OK] No deleted production entities detected.")
        return True

    violations = []
    for stem, origin_file in stems_to_check:
        grep_res = run_cmd(["git", "grep", "-n", "-i", stem, "--", "docs/", "backend/docs/", "frontend/docs/"])
        if not grep_res:
            continue
        for line in grep_res.splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split(":", 2)
            if len(parts) < 3:
                continue
            fpath, lineno, text = parts[0], parts[1], parts[2]
            fpath_norm = fpath.replace("\\", "/")
            if fpath_norm.startswith("docs/decisions/") or fpath_norm == "backend/docs/known-problems.md":
                continue
            if any(kw in text.lower() for kw in tombstone_keywords):
                continue
            violations.append((stem, origin_file, fpath_norm, lineno, text.strip()))

    if violations:
        print("\n[TOMBSTONE: ALERT] Deleted entity references still lingering in active documentation:")
        for stem, origin_file, fpath, lineno, text in violations:
            print(f"  * Entity '{stem}' (deleted in {origin_file}):")
            print(f"    - {fpath}:{lineno}: {text}")
        print("\nFix: Purge lingering references from architecture overviews, ERDs, and test matrices, or mark explicitly as eliminated/deprecated.")
        return False

    print(f"[TOMBSTONE: OK] All {len(stems_to_check)} deleted entity tombstones verified clean across documentation.")
    return True


def get_target_files(prefer_staged: bool = False) -> tuple[list[str], str]:
    """Resolves target files, prioritizing staged files when staged changes exist."""
    staged_output = run_cmd(["git", "diff", "--cached", "--name-only"])
    staged_names = [f.strip() for f in staged_output.splitlines() if f.strip()]

    if prefer_staged and staged_names:
        return staged_names, "Staged Changes (--cached)"

    status_raw = run_cmd(["git", "status", "--short", "-uall"])
    if not status_raw:
        diff_names = run_cmd(["git", "diff", "--name-only", "HEAD~1", "HEAD"]).splitlines()
        scope = "Last Commit (HEAD~1..HEAD)"
    else:
        diff_names = run_cmd(["git", "diff", "--name-only", "HEAD"]).splitlines()
        scope = "Working Tree & Staged"

    files = [f.strip() for f in diff_names if f.strip()]
    if status_raw:
        for line in status_raw.splitlines():
            line = line.strip()
            if line.startswith("??"):
                untracked_file = line[2:].strip().strip('"')
                if untracked_file and untracked_file not in files:
                    files.append(untracked_file)

    return files, scope


def main():
    parser = argparse.ArgumentParser(description="Diff, Task-Sizing & Doc-Sync Inspector")
    parser.add_argument("--check", action="store_true", help="Fail with exit code 1 if doc sync alerts are detected")
    parser.add_argument("--staged", action="store_true", help="Inspect only staged changes (git diff --cached)")
    args = parser.parse_args()

    print("=== CRICBUZZ DIFF & TASK-SIZING INSPECTOR ===")
    files, scope = get_target_files(prefer_staged=args.staged)
    count = len(files)

    print(f"Scope: {scope}")
    print(f"Total Files Modified: {count}")

    diff_stat = run_cmd(["git", "diff", "--stat", "HEAD"])
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

    # Run Documentation Synchronization Guard & Entity Tombstone Guard
    is_synced = check_doc_synchronization(files)
    is_tombstone_clean = check_entity_tombstones(prefer_staged=args.staged)

    print("---------------------------------------------")

    if args.check and (not is_synced or not is_tombstone_clean):
        print("[ERROR] Quality & Doc Sync Guard failed. Resolve alerts before commit.")
        sys.exit(1)


if __name__ == "__main__":
    main()
