"""Authentication API endpoints."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from chesstoire.config import settings
from chesstoire.core import create_access_token, hash_password, verify_password
from chesstoire.core.deps import CurrentUser, DbSession
from chesstoire.models import User
from chesstoire.schemas.user import Token, UserCreate, UserLogin, UserRead, UserUpdate

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, session: DbSession) -> User:
    """Register a new user account."""
    # Check if email already exists
    result = await session.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
    )
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(data: UserLogin, session: DbSession) -> dict:
    """Authenticate and get access token."""
    result = await session.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.jwt_access_token_expire_minutes * 60,
    }


@router.get("/me", response_model=UserRead)
async def get_current_user_info(user: CurrentUser) -> User:
    """Get current authenticated user information."""
    return user


@router.patch("/me", response_model=UserRead)
async def update_current_user(
    data: UserUpdate,
    user: CurrentUser,
    session: DbSession,
) -> User:
    """Update current user profile."""
    if data.display_name is not None:
        user.display_name = data.display_name
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url
    if data.settings is not None:
        user.settings = {**user.settings, **data.settings}

    await session.flush()
    await session.refresh(user)
    return user
