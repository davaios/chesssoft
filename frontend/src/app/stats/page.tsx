"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader } from "@/components/ui/card";
import { useGameStats, useRepertoireStats, useStudySessions, useGames } from "@/lib/hooks";
import { clsx } from "clsx";

export default function StatsPage() {
  const { data: gameStats, isLoading: gamesLoading } = useGameStats();
  const { data: repertoireStats } = useRepertoireStats();
  const { data: sessions } = useStudySessions(30);
  const { data: recentGames } = useGames({ per_page: 50 });

  // Calculate rating trend from recent games
  const ratingTrend = recentGames?.items
    .filter((g) => g.user_rating)
    .slice(0, 20)
    .reverse()
    .map((g) => g.user_rating as number) || [];

  const minRating = Math.min(...ratingTrend, 0);
  const maxRating = Math.max(...ratingTrend, 100);
  const ratingRange = maxRating - minRating || 100;

  // Calculate study stats
  const totalCardsReviewed = sessions?.reduce((acc, s) => acc + s.cards_reviewed, 0) || 0;
  const avgAccuracy =
    sessions && sessions.length > 0
      ? sessions.reduce((acc, s) => acc + s.accuracy, 0) / sessions.length
      : 0;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Statistics</h1>
        <p className="mt-1 text-neutral-400">Track your chess improvement over time</p>
      </div>

      {/* Overview Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-3xl font-bold text-white">{gameStats?.total_games || 0}</p>
          <p className="text-sm text-neutral-400">Games Played</p>
        </Card>
        <Card className="p-4">
          <p className="text-3xl font-bold text-green-500">{gameStats?.win_rate || 0}%</p>
          <p className="text-sm text-neutral-400">Win Rate</p>
        </Card>
        <Card className="p-4">
          <p className="text-3xl font-bold text-white">
            {gameStats?.avg_acpl?.toFixed(1) || "—"}
          </p>
          <p className="text-sm text-neutral-400">Avg ACPL</p>
        </Card>
        <Card className="p-4">
          <p className="text-3xl font-bold text-white">{totalCardsReviewed}</p>
          <p className="text-sm text-neutral-400">Cards Studied</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Rating Chart */}
        <Card>
          <CardHeader title="Rating Trend" description="Your rating over recent games" />
          {ratingTrend.length > 1 ? (
            <div className="h-48 flex items-end gap-1">
              {ratingTrend.map((rating, i) => {
                const height = ((rating - minRating) / ratingRange) * 100;
                const isUp = i > 0 && rating > ratingTrend[i - 1];
                const isDown = i > 0 && rating < ratingTrend[i - 1];
                return (
                  <div
                    key={i}
                    className={clsx(
                      "flex-1 rounded-t transition-all",
                      isUp ? "bg-green-600" : isDown ? "bg-red-600" : "bg-neutral-600"
                    )}
                    style={{ height: `${Math.max(5, height)}%` }}
                    title={`${rating}`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-neutral-500">
              Play more games to see your rating trend
            </div>
          )}
          {ratingTrend.length > 0 && (
            <div className="mt-2 flex justify-between text-xs text-neutral-500">
              <span>Oldest</span>
              <span>Current: {ratingTrend[ratingTrend.length - 1]}</span>
            </div>
          )}
        </Card>

        {/* Win/Loss Distribution */}
        <Card>
          <CardHeader title="Results" description="Win/Loss/Draw breakdown" />
          {gamesLoading ? (
            <div className="h-48 animate-pulse bg-neutral-800 rounded" />
          ) : gameStats && gameStats.total_games > 0 ? (
            <div className="space-y-4">
              <div className="h-8 flex rounded-lg overflow-hidden">
                <div
                  className="bg-green-600 flex items-center justify-center text-xs font-medium"
                  style={{ width: `${(gameStats.wins / gameStats.total_games) * 100}%` }}
                >
                  {gameStats.wins > 0 && gameStats.wins}
                </div>
                <div
                  className="bg-neutral-500 flex items-center justify-center text-xs font-medium"
                  style={{ width: `${(gameStats.draws / gameStats.total_games) * 100}%` }}
                >
                  {gameStats.draws > 0 && gameStats.draws}
                </div>
                <div
                  className="bg-red-600 flex items-center justify-center text-xs font-medium"
                  style={{ width: `${(gameStats.losses / gameStats.total_games) * 100}%` }}
                >
                  {gameStats.losses > 0 && gameStats.losses}
                </div>
              </div>
              <div className="flex justify-center gap-6 text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-green-600" /> Wins
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-neutral-500" /> Draws
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-red-600" /> Losses
                </span>
              </div>

              {/* By Time Control */}
              <div className="pt-4 border-t border-neutral-800">
                <h4 className="text-sm font-medium text-neutral-400 mb-3">By Time Control</h4>
                <div className="space-y-2">
                  {Object.entries(gameStats.by_time_control).map(([tc, data]) => (
                    <div key={tc} className="flex items-center gap-2">
                      <span className="w-20 text-sm capitalize">{tc}</span>
                      <div className="flex-1 h-4 bg-neutral-800 rounded overflow-hidden">
                        <div
                          className="h-full bg-green-600"
                          style={{ width: `${(data.wins / data.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-neutral-500 w-16 text-right">
                        {Math.round((data.wins / data.total) * 100)}% ({data.total})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-neutral-500">
              No games played yet
            </div>
          )}
        </Card>

        {/* Repertoire Progress */}
        <Card>
          <CardHeader title="Repertoire Mastery" description="Opening preparation progress" />
          {repertoireStats ? (
            <div className="space-y-6">
              {/* White */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>White Repertoire</span>
                  <span>{repertoireStats.white_lines} lines</span>
                </div>
                <div className="h-4 bg-neutral-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-white"
                    style={{ width: `${repertoireStats.white_coverage}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {repertoireStats.white_coverage}% coverage
                </p>
              </div>

              {/* Black */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Black Repertoire</span>
                  <span>{repertoireStats.black_lines} lines</span>
                </div>
                <div className="h-4 bg-neutral-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-neutral-400"
                    style={{ width: `${repertoireStats.black_coverage}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {repertoireStats.black_coverage}% coverage
                </p>
              </div>

              {/* Summary */}
              <div className="pt-4 border-t border-neutral-800 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-yellow-500">
                    {repertoireStats.total_due_today}
                  </p>
                  <p className="text-xs text-neutral-500">Lines due today</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">
                    {repertoireStats.streak_days}
                  </p>
                  <p className="text-xs text-neutral-500">Day streak</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-neutral-500">
              Add lines to your repertoire to track progress
            </div>
          )}
        </Card>

        {/* Study Activity */}
        <Card>
          <CardHeader title="Study Activity" description="Recent practice sessions" />
          {sessions && sessions.length > 0 ? (
            <div className="space-y-4">
              {/* Activity grid (last 28 days) */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 28 }).map((_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (27 - i));
                  const dateStr = date.toISOString().split("T")[0];
                  const daySession = sessions.find(
                    (s) => s.started_at.split("T")[0] === dateStr
                  );
                  const intensity = daySession
                    ? Math.min(4, Math.floor(daySession.cards_reviewed / 10))
                    : 0;

                  return (
                    <div
                      key={i}
                      className={clsx(
                        "aspect-square rounded-sm",
                        intensity === 0 && "bg-neutral-800",
                        intensity === 1 && "bg-green-900",
                        intensity === 2 && "bg-green-700",
                        intensity === 3 && "bg-green-500",
                        intensity >= 4 && "bg-green-400"
                      )}
                      title={`${dateStr}: ${daySession?.cards_reviewed || 0} cards`}
                    />
                  );
                })}
              </div>
              <p className="text-xs text-neutral-500 text-center">Last 4 weeks</p>

              {/* Stats */}
              <div className="pt-4 border-t border-neutral-800 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-white">{sessions.length}</p>
                  <p className="text-xs text-neutral-500">Sessions</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{totalCardsReviewed}</p>
                  <p className="text-xs text-neutral-500">Cards</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-green-500">{avgAccuracy.toFixed(0)}%</p>
                  <p className="text-xs text-neutral-500">Accuracy</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-neutral-500">
              Complete practice sessions to see activity
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
