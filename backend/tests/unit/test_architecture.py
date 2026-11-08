import ast
from pathlib import Path
import pytest

FORBIDDEN_FRAMEWORK_MODULES = {"fastapi", "sqlalchemy", "pydantic"}


def find_domain_python_files() -> list[Path]:
    domain_dir = Path(__file__).resolve().parent.parent.parent / "app" / "domain"
    assert domain_dir.exists(), f"Domain directory not found at {domain_dir}"
    return [p for p in domain_dir.rglob("*.py") if p.is_file() and not p.name.startswith(".")]


@pytest.mark.parametrize("file_path", find_domain_python_files(), ids=lambda p: p.name)
def test_domain_layer_has_zero_framework_dependencies(file_path: Path):
    """
    Automated Architecture Invariant Test (inspired by DDD Library / ArchUnit).
    Enforces that the pure cricket domain layer remains completely decoupled from
    framework, ORM, and schema libraries (FastAPI, SQLAlchemy, Pydantic).
    """
    source_code = file_path.read_text(encoding="utf-8")
    tree = ast.parse(source_code, filename=str(file_path))

    violations = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root_pkg = alias.name.split(".")[0]
                if root_pkg in FORBIDDEN_FRAMEWORK_MODULES:
                    violations.append((node.lineno, f"import {alias.name}"))
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root_pkg = node.module.split(".")[0]
                if root_pkg in FORBIDDEN_FRAMEWORK_MODULES:
                    violations.append((node.lineno, f"from {node.module} import ..."))

    assert not violations, (
        f"Architectural Rule Violation in {file_path.name}: "
        f"Domain layer must not depend on {FORBIDDEN_FRAMEWORK_MODULES}. "
        f"Found violations: {violations}"
    )
