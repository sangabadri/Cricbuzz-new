#!/usr/bin/env python3
"""
audit_gate.py: Deterministic Quality Gate & Architectural Audit Runner.

Runs mechanical checks to eliminate manual testing friction and token bloat.
Checks:
1. Python AST Domain Invariants (ADR-0001: app/domain has 0 framework/ORM imports).
2. Frontend UI Layer Invariants (ADR-0006: components/ui has 0 imports from features/pages).
3. Backend Test Suite (pytest -c backend/pytest.ini backend).
4. Frontend Build & Typecheck (tsc -b && vite build).

Outputs a concise, 10-line structured Markdown summary.
"""

import argparse
import ast
import os
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
BACKEND_DIR = REPO_ROOT / "backend"
FRONTEND_DIR = REPO_ROOT / "frontend"


def check_domain_ast_invariants() -> tuple[bool, str]:
    """ADR-0001: Domain layer must not import fastapi, sqlalchemy, or pydantic."""
    forbidden = {"fastapi", "sqlalchemy", "pydantic"}
    domain_dir = BACKEND_DIR / "app" / "domain"
    if not domain_dir.exists():
        return False, "Domain directory not found."

    violations = []
    for py_file in domain_dir.rglob("*.py"):
        if py_file.name.startswith("."):
            continue
        try:
            tree = ast.parse(py_file.read_text(encoding="utf-8"), filename=str(py_file))
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if alias.name.split(".")[0] in forbidden:
                            violations.append(f"{py_file.relative_to(REPO_ROOT)}:{node.lineno}: import {alias.name}")
                elif isinstance(node, ast.ImportFrom) and node.module:
                    if node.module.split(".")[0] in forbidden:
                        violations.append(f"{py_file.relative_to(REPO_ROOT)}:{node.lineno}: from {node.module} import ...")
        except Exception as e:
            violations.append(f"{py_file.name}: AST parse error: {e}")

    if violations:
        return False, f"Domain Layer Violations ({len(violations)}):\n  " + "\n  ".join(violations[:5])
    return True, "0 framework imports in app/domain/"


def check_frontend_ui_invariants() -> tuple[bool, str]:
    """ADR-0006: components/ui must never import from features or pages."""
    ui_dir = FRONTEND_DIR / "src" / "components" / "ui"
    if not ui_dir.exists():
        return True, "components/ui not present"

    violations = []
    for ts_file in [f for f in ui_dir.rglob("*") if f.suffix in {".ts", ".tsx"}]:
        try:
            content = ts_file.read_text(encoding="utf-8")
            for idx, line in enumerate(content.splitlines(), start=1):
                if "import" in line and ("features/" in line or "pages/" in line):
                    violations.append(f"{ts_file.relative_to(REPO_ROOT)}:{idx}: {line.strip()}")
        except Exception as e:
            violations.append(f"{ts_file.name}: read error: {e}")

    if violations:
        return False, f"UI Isolation Violations ({len(violations)}):\n  " + "\n  ".join(violations[:5])
    return True, "0 feature imports in components/ui/"


def find_python() -> list[str]:
    """Finds Python 3.11 executable for backend pytest."""
    if sys.version_info >= (3, 11):
        return [sys.executable]
    py311_path = Path("C:/Program Files/Python311/python.exe")
    if py311_path.exists():
        return [str(py311_path)]
    # Fallback to py launcher
    return ["py", "-3.11"]


def run_backend_tests() -> tuple[bool, str]:
    """Runs pytest using Python 3.11."""
    cmd = find_python() + ["-m", "pytest", "-c", "backend/pytest.ini", "backend", "-q"]
    t0 = time.time()
    try:
        proc = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=120)
        dur = round(time.time() - t0, 2)
        if proc.returncode == 0:
            last_line = [ln for ln in proc.stdout.splitlines() if ln.strip()][-1] if proc.stdout else "All passed"
            return True, f"{last_line} ({dur}s)"
        error_lines = [ln for ln in proc.stdout.splitlines() if "FAILED" in ln or "ERROR" in ln]
        summary = error_lines[-1] if error_lines else "Pytest failed"
        return False, f"{summary} ({dur}s)"
    except Exception as e:
        return False, f"Pytest execution failed: {e}"


def run_frontend_lint() -> tuple[bool, str]:
    """Runs npm run lint (oxlint)."""
    t0 = time.time()
    try:
        proc = subprocess.run(
            ["npm", "run", "lint"],
            cwd=str(FRONTEND_DIR),
            capture_output=True,
            text=True,
            shell=True,
            timeout=30,
        )
        dur = round(time.time() - t0, 2)
        if proc.returncode == 0:
            return True, f"Lint passed ({dur}s)"
        err = proc.stdout.strip() or proc.stderr.strip()
        first_line = err.splitlines()[0] if err else "Lint failed"
        return False, f"{first_line} ({dur}s)"
    except Exception as e:
        return False, f"Lint execution failed: {e}"


def run_frontend_build() -> tuple[bool, str]:
    """Runs npm run build (tsc -b && vite build)."""
    t0 = time.time()
    try:
        proc = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(FRONTEND_DIR),
            capture_output=True,
            text=True,
            shell=True,
            timeout=120,
        )
        dur = round(time.time() - t0, 2)
        if proc.returncode == 0:
            return True, f"Typecheck & Vite build passed ({dur}s)"
        err_output = proc.stdout + "\n" + proc.stderr
        errors = [ln.strip() for ln in err_output.splitlines() if "error TS" in ln or "Error:" in ln]
        detail = errors[0] if errors else "Build error"
        return False, f"{detail} ({dur}s)"
    except Exception as e:
        return False, f"Build execution failed: {e}"


def main():
    parser = argparse.ArgumentParser(description="Cricket Quality Gate Audit Runner")
    parser.add_argument("--baseline", action="store_true", help="Check baseline health before starting work")
    parser.add_argument("--quick", action="store_true", help="Fast check (AST + pytest unit only)")
    parser.add_argument("--full", action="store_true", help="Full quality gate (AST + tests + build)")
    args = parser.parse_args()

    mode = "FULL AUDIT" if args.full else ("BASELINE" if args.baseline else "QUICK CHECK")
    print(f"=== CRICBUZZ QUALITY GATE [{mode}] ===")

    all_passed = True
    results = []

    # 1. AST Invariants
    dom_ok, dom_msg = check_domain_ast_invariants()
    results.append(("Backend Domain Isolation (ADR-0001)", dom_ok, dom_msg))
    if not dom_ok:
        all_passed = False

    ui_ok, ui_msg = check_frontend_ui_invariants()
    results.append(("Frontend UI Layer Isolation (ADR-0006)", ui_ok, ui_msg))
    if not ui_ok:
        all_passed = False

    # 2. Backend Tests
    be_ok, be_msg = run_backend_tests()
    results.append(("Backend Test Suite", be_ok, be_msg))
    if not be_ok:
        all_passed = False

    # 3. Frontend Lint & Build (Full & Baseline modes)
    if args.full or args.baseline:
        lint_ok, lint_msg = run_frontend_lint()
        results.append(("Frontend Lint (oxlint)", lint_ok, lint_msg))
        if not lint_ok:
            all_passed = False

        fe_ok, fe_msg = run_frontend_build()
        results.append(("Frontend Typecheck & Build", fe_ok, fe_msg))
        if not fe_ok:
            all_passed = False

    # Print Report
    for name, ok, msg in results:
        status_tag = "[PASS]" if ok else "[FAIL]"
        print(f"{status_tag} {name}: {msg}")

    print("---------------------------------------")
    if all_passed:
        print("OVERALL STATUS: GREEN (Ready for review/commit)")
        sys.exit(0)
    else:
        print("OVERALL STATUS: RED (Resolve failures before proceeding)")
        sys.exit(1)


if __name__ == "__main__":
    main()
