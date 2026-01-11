"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { GameCard, GameCardSkeleton } from "@/components/games/game-card";
import { useGames, useGameStats, usePlatformAccounts, useSyncPlatform } from "@/lib/hooks";

const platformOptions = [
  { value: "", label: "All Platforms" },
  { value: "chess.com", label: "Chess.com" },
  { value: "lichess", label: "Lichess" },
];

const timeControlOptions = [
  { value: "", label: "All Time Controls" },
  { value: "bullet", label: "Bullet" },
  { value: "blitz", label: "Blitz" },
  { value: "rapid", label: "Rapid" },
  { value: "classical", label: "Classical" },
];

const resultOptions = [
  { value: "", label: "All Results" },
  { value: "win", label: "Wins" },
  { value: "loss", label: "Losses" },
  { value: "draw", label: "Draws" },
];

const colorOptions = [
  { value: "", label: "Both Colors" },
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
];

export default function GamesPage() {
  const [page, setPage] = useState(1);
  const [platform, setPlatform] = useState("");
  const [timeControl, setTimeControl] = useState("");
  const [result, setResult] = useState("");
  const [color, setColor] = useState("");

  const { data: games, isLoading } = useGames({
    page,
    per_page: 20,
    platform: platform || undefined,
    time_control: timeControl || undefined,
    result: result || undefined,
    color: color || undefined,
  });

  const { data: stats } = useGameStats();
  const { data: accounts } = usePlatformAccounts();
  const syncMutation = useSyncPlatform();

  const handleSync = async () => {
    if (!accounts || accounts.length === 0) return;
    for (const account of accounts) {
      await syncMutation.mutateAsync(account.id);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Games</h1>
          <p className="mt-1 text-neutral-400">
            {stats ? `${stats.total_games} games imported` : "Loading..."}
          </p>
        </div>
        <Button
          onClick={handleSync}
          loading={syncMutation.isPending}
          disabled={!accounts || accounts.length === 0}
        >
          Sync Games
        </Button>
      </div>

      {/* Stats Summary */}
      {stats && stats.total_games > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-white">{stats.total_games}</p>
            <p className="text-sm text-neutral-400">Total Games</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-green-500">{stats.win_rate}%</p>
            <p className="text-sm text-neutral-400">Win Rate</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-white">
              {stats.avg_acpl?.toFixed(1) || "—"}
            </p>
            <p className="text-sm text-neutral-400">Avg ACPL</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-white">{stats.wins}</p>
            <p className="text-sm text-neutral-400">Wins</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader title="Filters" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Select
            options={platformOptions}
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value);
              setPage(1);
            }}
          />
          <Select
            options={timeControlOptions}
            value={timeControl}
            onChange={(e) => {
              setTimeControl(e.target.value);
              setPage(1);
            }}
          />
          <Select
            options={resultOptions}
            value={result}
            onChange={(e) => {
              setResult(e.target.value);
              setPage(1);
            }}
          />
          <Select
            options={colorOptions}
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {/* Games List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <GameCardSkeleton key={i} />)
        ) : games?.items.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-neutral-400">No games found</p>
            {(!accounts || accounts.length === 0) && (
              <p className="mt-2 text-sm text-neutral-500">
                Connect your Chess.com or Lichess account to import games
              </p>
            )}
          </Card>
        ) : (
          games?.items.map((game) => <GameCard key={game.id} game={game} />)
        )}
      </div>

      {/* Pagination */}
      {games && games.pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="px-4 text-sm text-neutral-400">
            Page {page} of {games.pages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page === games.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
}
