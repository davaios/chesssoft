"use client";

import Link from "next/link";
import { clsx } from "clsx";
import type { Game } from "@/lib/api";

type GameCardProps = {
  game: Game;
};

export function GameCard({ game }: GameCardProps) {
  const resultColor = {
    win: "text-green-500",
    loss: "text-red-500",
    draw: "text-neutral-400",
  }[game.result];

  const resultText = {
    win: "Won",
    loss: "Lost",
    draw: "Draw",
  }[game.result];

  const timeControlLabel = {
    bullet: "Bullet",
    blitz: "Blitz",
    rapid: "Rapid",
    classical: "Classical",
    daily: "Daily",
  }[game.time_control] || game.time_control;

  const platformIcon = game.platform === "chess.com" ? "chess.com" : "lichess";

  return (
    <Link href={`/games/${game.id}`}>
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:border-neutral-700 hover:bg-neutral-800/50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={clsx("font-semibold", resultColor)}>{resultText}</span>
              <span className="text-neutral-500">vs</span>
              <span className="font-medium text-white">{game.opponent_username}</span>
              {game.opponent_rating && (
                <span className="text-sm text-neutral-500">({game.opponent_rating})</span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-400">
              <span className="rounded bg-neutral-800 px-2 py-0.5">{timeControlLabel}</span>
              <span className="capitalize">{game.user_color}</span>
              <span>{platformIcon}</span>
              {game.opening_name && (
                <span className="truncate max-w-[200px]">{game.opening_name}</span>
              )}
            </div>
          </div>

          <div className="text-right">
            {game.acpl !== null && (
              <div className="text-sm">
                <span className="text-neutral-500">ACPL</span>{" "}
                <span
                  className={clsx(
                    "font-medium",
                    game.acpl < 30
                      ? "text-green-500"
                      : game.acpl < 50
                        ? "text-yellow-500"
                        : "text-red-500"
                  )}
                >
                  {game.acpl.toFixed(1)}
                </span>
              </div>
            )}
            <div className="mt-1 text-xs text-neutral-500">
              {new Date(game.played_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-5 w-48 rounded bg-neutral-800" />
          <div className="mt-2 flex gap-2">
            <div className="h-5 w-16 rounded bg-neutral-800" />
            <div className="h-5 w-16 rounded bg-neutral-800" />
          </div>
        </div>
        <div className="h-8 w-16 rounded bg-neutral-800" />
      </div>
    </div>
  );
}
