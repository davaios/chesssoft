# ChessForge

An integrated chess improvement system that closes the loop between playing, analyzing, and training.

## Features

- **Platform Integration** - Import games from Chess.com and Lichess automatically
- **Repertoire Builder** - Build and organize your opening repertoire with an interactive tree view
- **Spaced Repetition Practice** - Train your openings using the SM-2 algorithm for optimal retention
- **AI Coach** - Get personalized advice, move explanations, and weekly improvement plans powered by Claude
- **Statistics Dashboard** - Track your progress with rating trends, win rates, and study activity

## Tech Stack

### Backend
- **FastAPI** - Modern async Python web framework
- **SQLAlchemy 2.x** - Async ORM with PostgreSQL
- **Pydantic 2.x** - Data validation and serialization
- **Alembic** - Database migrations
- **Anthropic SDK** - Claude AI integration

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **TailwindCSS 4** - Utility-first CSS
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **react-chessboard** - Chess board component

### Infrastructure
- **PostgreSQL 16** - Primary database
- **Redis 7** - Caching and sessions
- **Docker Compose** - Local development environment

## Project Structure

```
chessforge/
├── backend/
│   ├── src/chessforge/
│   │   ├── api/           # FastAPI routes
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   ├── config.py      # Configuration
│   │   └── main.py        # Application entry
│   ├── alembic/           # Database migrations
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   ├── components/    # React components
│   │   ├── lib/           # API client & hooks
│   │   └── stores/        # Zustand stores
│   └── package.json
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Run migrations
alembic upgrade head

# Start server
uvicorn chessforge.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### Docker Compose (Full Stack)

```bash
# Start all services
docker compose up -d

# Run backend migrations
docker compose exec backend alembic upgrade head
```

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/chessforge
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-secret-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## License

MIT
