"use client";

import { Board } from "@/components/chess/board";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useDeleteGame, useGame } from "@/lib/hooks";
import { clsx } from "clsx";
import { useParams, useRouter } from "next/navigation";

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const { data: game, isLoading, error } = useGame(gameId);
  const deleteMutation = useDeleteGame();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this game?")) return;
    await deleteMutation.mutateAsync(gameId);
    router.push("/games");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-64 rounded bg-neutral-800" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="aspect-square rounded-lg bg-neutral-800" />
            <div className="space-y-4">
              <div className="h-32 rounded-lg bg-neutral-800" />
              <div className="h-48 rounded-lg bg-neutral-800" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !game) {
    return (
      <DashboardLayout>
        <Card className="py-12 text-center">
          <p className="text-neutral-400">Game not found</p>
          <Button variant="secondary" className="mt-4" onClick={() => router.push("/games")}>
            Back to Games
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  const resultColor = {
    win: "text-green-500",
    loss: "text-red-500",
    draw: "text-neutral-400",
  }[game.result];

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-2 text-sm text-neutral-400 hover:text-white"
          >
            ← Back to Games
          </button>
          <h1 className="text-2xl font-bold">
            <span className={resultColor}>
              {game.result === "win" ? "Victory" : game.result === "loss" ? "Defeat" : "Draw"}
            </span>{" "}
            vs {game.opponent_username}
          </h1>
          <p className="mt-1 text-neutral-400">
            {new Date(game.played_at).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={handleDelete}
          loading={deleteMutation.isPending}
        >
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Board */}
        <div>
          <Board
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
            orientation={game.user_color as "white" | "black"}
            interactive={false}
          />
        </div>

        {/* Game Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Game Details" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-neutral-400">Platform</p>
                <p className="font-medium capitalize">{game.platform}</p>
              </div>
              <div>
                <p className="text-neutral-400">Time Control</p>
                <p className="font-medium capitalize">{game.time_control}</p>
              </div>
              <div>
                <p className="text-neutral-400">Your Rating</p>
                <p className="font-medium">{game.user_rating || "—"}</p>
              </div>
              <div>
                <p className="text-neutral-400">Opponent Rating</p>
                <p className="font-medium">{game.opponent_rating || "—"}</p>
              </div>
              <div>
                <p className="text-neutral-400">Color</p>
                <p className="font-medium capitalize">{game.user_color}</p>
              </div>
              <div>
                <p className="text-neutral-400">Result</p>
                <p className={clsx("font-medium capitalize", resultColor)}>{game.result}</p>
              </div>
            </div>
          </Card>

          {game.opening_name && (
            <Card>
              <CardHeader title="Opening" />
              <div className="text-sm">
                {game.opening_eco && (
                  <span className="mr-2 rounded bg-neutral-800 px-2 py-1 font-mono">
                    {game.opening_eco}
                  </span>
                )}
                <span>{game.opening_name}</span>
              </div>
            </Card>
          )}

          {game.acpl !== null && (
            <Card>
              <CardHeader title="Analysis" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-neutral-400 text-sm">Average Centipawn Loss</p>
                  <p
                    className={clsx(
                      "text-2xl font-bold",
                      game.acpl < 30
                        ? "text-green-500"
                        : game.acpl < 50
                          ? "text-yellow-500"
                          : "text-red-500",
                    )}
                  >
                    {game.acpl.toFixed(1)}
                  </p>
                </div>
                {game.accuracy && (
                  <div>
                    <p className="text-neutral-400 text-sm">Accuracy</p>
                    <p className="text-2xl font-bold text-white">{game.accuracy.toFixed(1)}%</p>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Status: {game.analysis_status}
                {game.analyzed_at &&
                  ` • Analyzed ${new Date(game.analyzed_at).toLocaleDateString()}`}
              </p>
            </Card>
          )}

          {/* PGN */}
          <Card>
            <CardHeader title="PGN" />
            <pre className="max-h-48 overflow-auto rounded bg-neutral-950 p-3 text-xs text-neutral-300">
              {game.pgn}
            </pre>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
