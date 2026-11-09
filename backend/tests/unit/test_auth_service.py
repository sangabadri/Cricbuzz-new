import pytest
from app.domain.exceptions import RuleViolationError
from app.schemas.auth import UserLogin, UserRegister
from app.services.auth import AuthService
from tests.conftest import InMemoryStore, InMemoryUserRepository, sync


@pytest.fixture
def auth_fixture():
    store = InMemoryStore()
    user_repo = InMemoryUserRepository(store)
    auth_service = AuthService(user_repo)
    return auth_service, user_repo


@sync
async def test_user_registration_and_login_success(auth_fixture):
    auth_service, user_repo = auth_fixture

    # Register
    reg_in = UserRegister(
        username="cricket_scorer",
        email="scorer@example.com",
        password="SuperPassword123!",
    )
    user, access_token, refresh_token = await auth_service.register(reg_in)
    assert user.id is not None
    assert user.username == "cricket_scorer"
    assert access_token is not None
    assert refresh_token is not None

    # Login
    login_in = UserLogin(username="cricket_scorer", password="SuperPassword123!")
    logged_in_user, new_access, new_refresh = await auth_service.login(login_in)
    assert logged_in_user.id == user.id
    assert new_access is not None
    assert new_refresh is not None


@sync
async def test_registration_duplicate_username_and_email_rejected(auth_fixture):
    auth_service, _ = auth_fixture

    reg_1 = UserRegister(
        username="scorer_one",
        email="unique1@example.com",
        password="Password123!",
    )
    await auth_service.register(reg_1)

    # Duplicate username
    reg_dup_user = UserRegister(
        username="scorer_one",
        email="different@example.com",
        password="Password123!",
    )
    with pytest.raises(RuleViolationError, match="already taken"):
        await auth_service.register(reg_dup_user)

    # Duplicate email
    reg_dup_email = UserRegister(
        username="scorer_two",
        email="unique1@example.com",
        password="Password123!",
    )
    with pytest.raises(RuleViolationError, match="already registered"):
        await auth_service.register(reg_dup_email)


@sync
async def test_login_invalid_password_rejected(auth_fixture):
    auth_service, _ = auth_fixture

    reg_in = UserRegister(
        username="valid_user",
        email="valid@example.com",
        password="CorrectPassword123!",
    )
    await auth_service.register(reg_in)

    # Wrong password
    login_in = UserLogin(username="valid_user", password="WrongPassword999!")
    with pytest.raises(RuleViolationError, match="Invalid username or password"):
        await auth_service.login(login_in)


@sync
async def test_refresh_token_rotation_and_invalid_token(auth_fixture):
    auth_service, _ = auth_fixture

    reg_in = UserRegister(
        username="token_tester",
        email="token@example.com",
        password="Password123!",
    )
    _, _, refresh_token = await auth_service.register(reg_in)

    # Rotate refresh token
    user, next_access, next_refresh = await auth_service.refresh_tokens(refresh_token)
    assert user.username == "token_tester"
    assert next_access is not None
    assert next_refresh != refresh_token

    # Invalid token rejection
    with pytest.raises(RuleViolationError, match="Invalid or expired"):
        await auth_service.refresh_tokens("invalid.malformed.token")
