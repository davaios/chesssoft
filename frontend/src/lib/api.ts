/**
 * API client for ChessForge backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown,
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, response.statusText, data);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; display_name?: string }) =>
    request<{ id: string; email: string }>("/api/v1/auth/register", {
      method: "POST",
      body: data,
    }),

  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; token_type: string; expires_in: number }>(
      "/api/v1/auth/login",
      { method: "POST", body: data },
    ),

  me: () => request<User>("/api/v1/auth/me"),

  updateMe: (data: {
    display_name?: string;
    avatar_url?: string;
    settings?: Record<string, unknown>;
  }) => request<User>("/api/v1/auth/me", { method: "PATCH", body: data }),
};

// Platform API
export const platformApi = {
  list: () => request<PlatformAccount[]>("/api/v1/platforms"),

  connect: (data: { platform: string; username: string }) =>
    request<PlatformAccount>("/api/v1/platforms", { method: "POST", body: data }),

  disconnect: (id: string) => request<void>(`/api/v1/platforms/${id}`, { method: "DELETE" }),

  sync: (id: string) => request<SyncResult>(`/api/v1/platforms/${id}/sync`, { method: "POST" }),
};

// Games API
export const gamesApi = {
  list: (params?: GameListParams) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return request<GameList>(`/api/v1/games${query ? `?${query}` : ""}`);
  },

  get: (id: string) => request<GameDetail>(`/api/v1/games/${id}`),

  stats: () => request<GameStats>("/api/v1/games/stats"),

  delete: (id: string) => request<void>(`/api/v1/games/${id}`, { method: "DELETE" }),
};

// Repertoire API
export const repertoireApi = {
  stats: () => request<RepertoireStats>("/api/v1/repertoire/stats"),

  tree: (color: "white" | "black") => request<RepertoireTree>(`/api/v1/repertoire/tree/${color}`),

  listLines: (params?: { color?: string; fen?: string; due_only?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return request<RepertoireLine[]>(`/api/v1/repertoire/lines${query ? `?${query}` : ""}`);
  },

  createLine: (data: CreateLineData) =>
    request<RepertoireLine>("/api/v1/repertoire/lines", { method: "POST", body: data }),

  updateLine: (id: string, data: UpdateLineData) =>
    request<RepertoireLine>(`/api/v1/repertoire/lines/${id}`, { method: "PATCH", body: data }),

  deleteLine: (id: string) => request<void>(`/api/v1/repertoire/lines/${id}`, { method: "DELETE" }),
};

// Study API
export const studyApi = {
  daily: () => request<DailyStudyGoal>("/api/v1/study/daily"),

  startSession: (data: { session_type: string; max_cards?: number }) =>
    request<StudySession>("/api/v1/study/sessions", { method: "POST", body: data }),

  endSession: (sessionId: string) =>
    request<StudySessionSummary>(`/api/v1/study/sessions/${sessionId}/end`, { method: "POST" }),

  getNextCard: (sessionId: string) =>
    request<StudyCard | null>(`/api/v1/study/sessions/${sessionId}/next-card`),

  answerCard: (cardId: string, data: CardAnswer) =>
    request<CardResult>(`/api/v1/study/cards/${cardId}/answer`, { method: "POST", body: data }),

  listSessions: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : "";
    return request<StudySession[]>(`/api/v1/study/sessions${query}`);
  },
};

// Coach API
export const coachApi = {
  chat: (data: { message: string; context?: string; conversation_history?: ChatMessage[] }) =>
    request<{ response: string }>("/api/v1/coach/chat", { method: "POST", body: data }),

  explainMove: (data: {
    fen: string;
    played_move: string;
    best_move: string;
    eval_before: number;
    eval_after: number;
  }) =>
    request<{ explanation: string }>("/api/v1/coach/explain-move", { method: "POST", body: data }),

  weeklyPlan: () => request<WeeklyPlan>("/api/v1/coach/weekly-plan"),

  explainOpening: (data: { opening_name: string; eco_code?: string; player_color?: string }) =>
    request<{ explanation: string }>("/api/v1/coach/explain-opening", {
      method: "POST",
      body: data,
    }),
};

// Types
export type User = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  subscription: string;
  coach_id: string | null;
  created_at: string;
  settings: Record<string, unknown>;
};

export type PlatformAccount = {
  id: string;
  platform: string;
  username: string;
  sync_enabled: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
  ratings: Record<string, { rating: number; games: number }>;
  created_at: string;
};

export type SyncResult = {
  account_id: string;
  new_games: number;
  total_games: number;
  errors: string[];
  duration_seconds: number;
};

export type GameListParams = {
  page?: number;
  per_page?: number;
  platform?: string;
  time_control?: string;
  result?: string;
  color?: string;
  analyzed_only?: boolean;
};

export type Game = {
  id: string;
  platform: string;
  platform_game_id: string;
  played_at: string;
  time_control: string;
  user_color: string;
  result: string;
  opponent_username: string;
  opponent_rating: number | null;
  user_rating: number | null;
  opening_eco: string | null;
  opening_name: string | null;
  acpl: number | null;
  accuracy: number | null;
  analysis_status: string;
  analyzed_at: string | null;
  created_at: string;
};

export type GameDetail = Game & {
  pgn: string;
  analysis: unknown | null;
};

export type GameList = {
  items: Game[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
};

export type GameStats = {
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  avg_acpl: number | null;
  by_time_control: Record<string, { total: number; wins: number; losses: number; draws: number }>;
  by_platform: Record<string, { total: number; wins: number }>;
};

export type RepertoireStats = {
  white_lines: number;
  black_lines: number;
  white_coverage: number;
  black_coverage: number;
  total_due_today: number;
  streak_days: number;
};

export type RepertoireTreeNode = {
  id: string;
  fen: string;
  move_san: string;
  engine_eval: number | null;
  coverage_prob: number | null;
  mastery_level: string;
  children: RepertoireTreeNode[];
};

export type RepertoireTree = {
  color: string;
  total_lines: number;
  lines_mastered: number;
  lines_learning: number;
  lines_new: number;
  coverage_percentage: number;
  root_moves: RepertoireTreeNode[];
};

export type RepertoireLine = {
  id: string;
  color: string;
  fen: string;
  move_san: string;
  move_uci: string | null;
  parent_id: string | null;
  ply: number;
  annotation: string | null;
  priority: number;
  coverage_prob: number | null;
  expected_in_games: number | null;
  engine_eval: number | null;
  srs_data: Record<string, unknown>;
  source: string;
  created_at: string;
  updated_at: string;
};

export type CreateLineData = {
  color: string;
  fen: string;
  move_san: string;
  move_uci?: string;
  parent_id?: string;
  annotation?: string;
  priority?: number;
};

export type UpdateLineData = {
  annotation?: string;
  priority?: number;
  move_san?: string;
};

export type DailyStudyGoal = {
  cards_due_today: number;
  cards_completed_today: number;
  streak_days: number;
  target_cards: number;
  on_track: boolean;
};

export type StudySession = {
  id: string;
  session_type: string;
  started_at: string;
  ended_at: string | null;
  cards_reviewed: number;
  cards_correct: number;
  cards_incorrect: number;
  total_time_seconds: number | null;
  accuracy: number;
  is_complete: boolean;
};

export type StudySessionSummary = {
  session_id: string;
  session_type: string;
  duration_minutes: number;
  cards_reviewed: number;
  accuracy: number;
  streak_maintained: boolean;
  new_streak_days: number;
  xp_earned: number;
};

export type StudyCard = {
  id: string;
  card_type: string;
  fen: string;
  source_type: string | null;
  hint_available: boolean;
};

export type CardAnswer = {
  user_move: string;
  time_to_answer_ms: number;
  srs_rating?: number;
};

export type CardResult = {
  is_correct: boolean;
  correct_move: string;
  user_move: string;
  explanation: string | null;
  next_review_days: number | null;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type WeeklyPlan = {
  plan: string;
  weaknesses: string[];
  repertoire_gaps: string[];
};
