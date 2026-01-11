"""User-related Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    display_name: Optional[str] = Field(None, max_length=100)


class UserRead(BaseModel):
    """Schema for user response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    display_name: Optional[str]
    avatar_url: Optional[str]
    subscription: str
    coach_id: Optional[str]
    created_at: datetime
    settings: dict


class UserUpdate(BaseModel):
    """Schema for user profile update."""

    display_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)
    settings: Optional[dict] = None


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class Token(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    """JWT token payload."""

    sub: str  # User ID
    exp: datetime
    iat: datetime
    type: str = "access"
