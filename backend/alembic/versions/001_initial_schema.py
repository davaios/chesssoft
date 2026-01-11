"""Initial database schema.

Revision ID: 001_initial
Revises: None
Create Date: 2026-01-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("display_name", sa.String(100), nullable=True),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("subscription", sa.String(20), nullable=False, default="free"),
        sa.Column(
            "coach_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("settings", postgresql.JSONB, nullable=False, default={}),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )

    # Platform accounts table
    op.create_table(
        "platform_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("platform", sa.String(20), nullable=False, index=True),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("access_token", sa.String(500), nullable=True),
        sa.Column("refresh_token", sa.String(500), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sync_enabled", sa.Boolean, nullable=False, default=True),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sync_error", sa.String(500), nullable=True),
        sa.Column("ratings", postgresql.JSONB, nullable=False, default={}),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("platform", "username", name="uq_platform_username"),
    )

    # Games table
    op.create_table(
        "games",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("platform", sa.String(20), nullable=False, index=True),
        sa.Column("platform_game_id", sa.String(100), nullable=False),
        sa.Column("pgn", sa.Text, nullable=False),
        sa.Column("played_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("time_control", sa.String(20), nullable=False, index=True),
        sa.Column("time_control_seconds", sa.Integer, nullable=True),
        sa.Column("increment_seconds", sa.Integer, nullable=True),
        sa.Column("user_color", sa.String(5), nullable=False),
        sa.Column("result", sa.String(10), nullable=False),
        sa.Column("opponent_username", sa.String(100), nullable=False),
        sa.Column("opponent_rating", sa.Integer, nullable=True),
        sa.Column("user_rating", sa.Integer, nullable=True),
        sa.Column("opening_eco", sa.String(10), nullable=True),
        sa.Column("opening_name", sa.String(200), nullable=True),
        sa.Column("acpl", sa.Numeric(5, 2), nullable=True),
        sa.Column("accuracy", sa.Numeric(5, 2), nullable=True),
        sa.Column("analysis", postgresql.JSONB, nullable=True),
        sa.Column("analysis_status", sa.String(20), nullable=False, default="pending"),
        sa.Column("analyzed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("platform", "platform_game_id", name="uq_platform_game"),
    )

    # Repertoire lines table
    op.create_table(
        "repertoire_lines",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("color", sa.String(5), nullable=False, index=True),
        sa.Column("fen", sa.String(100), nullable=False, index=True),
        sa.Column("move_san", sa.String(10), nullable=False),
        sa.Column("move_uci", sa.String(10), nullable=True),
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("repertoire_lines.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
        sa.Column("ply", sa.Integer, nullable=False, default=0),
        sa.Column("annotation", sa.Text, nullable=True),
        sa.Column("priority", sa.Integer, nullable=False, default=0),
        sa.Column("coverage_prob", sa.Numeric(5, 4), nullable=True),
        sa.Column("expected_in_games", sa.Integer, nullable=True),
        sa.Column("engine_eval", sa.Numeric(6, 2), nullable=True),
        sa.Column("master_stats", postgresql.JSONB, nullable=True),
        sa.Column("srs_data", postgresql.JSONB, nullable=False, default={}),
        sa.Column("source", sa.String(20), nullable=False, default="manual"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "user_id", "color", "fen", "move_san", name="uq_user_position_move"
        ),
    )

    # Study sessions table
    op.create_table(
        "study_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("session_type", sa.String(20), nullable=False),
        sa.Column("cards_reviewed", sa.Integer, nullable=False, default=0),
        sa.Column("cards_correct", sa.Integer, nullable=False, default=0),
        sa.Column("cards_incorrect", sa.Integer, nullable=False, default=0),
        sa.Column("total_time_seconds", sa.Integer, nullable=True),
        sa.Column("metadata", postgresql.JSONB, nullable=False, default={}),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )

    # Study cards table
    op.create_table(
        "study_cards",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("study_sessions.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("card_type", sa.String(30), nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("source_type", sa.String(30), nullable=True),
        sa.Column("fen", sa.String(100), nullable=False),
        sa.Column("correct_move", sa.String(10), nullable=False),
        sa.Column("user_move", sa.String(10), nullable=True),
        sa.Column("is_correct", sa.Boolean, nullable=True),
        sa.Column("shown_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("time_to_answer_ms", sa.Integer, nullable=True),
        sa.Column("srs_rating", sa.Integer, nullable=True),
        sa.Column("hint_shown", sa.Boolean, nullable=False, default=False),
        sa.Column("explanation", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )

    # Create indexes for common queries
    op.create_index(
        "ix_games_user_played",
        "games",
        ["user_id", "played_at"],
    )
    op.create_index(
        "ix_repertoire_user_color",
        "repertoire_lines",
        ["user_id", "color"],
    )
    op.create_index(
        "ix_study_sessions_user_started",
        "study_sessions",
        ["user_id", "started_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_study_sessions_user_started")
    op.drop_index("ix_repertoire_user_color")
    op.drop_index("ix_games_user_played")
    op.drop_table("study_cards")
    op.drop_table("study_sessions")
    op.drop_table("repertoire_lines")
    op.drop_table("games")
    op.drop_table("platform_accounts")
    op.drop_table("users")
