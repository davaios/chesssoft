"use client";

import { Board } from "@/components/chess/board";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { RepertoireTreeView } from "@/components/repertoire/repertoire-tree";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type { OpeningMove, RepertoireTreeNode } from "@/lib/api";
import {
  useCreateLine,
  useDeleteLine,
  useOpeningSuggestions,
  useRepertoireStats,
  useRepertoireTree,
} from "@/lib/hooks";
import { Chess, type Square } from "chess.js";
import { clsx } from "clsx";
import Link from "next/link";
import { useCallback, useState } from "react";

export default function RepertoirePage() {
  const [selectedColor, setSelectedColor] = useState<"white" | "black">("white");
  const [selectedNode, setSelectedNode] = useState<RepertoireTreeNode | null>(null);
  const [currentFen, setCurrentFen] = useState(
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  );
  const [game] = useState(() => new Chess());

  const { data: tree, isLoading } = useRepertoireTree(selectedColor);
  const { data: stats } = useRepertoireStats();
  const { data: suggestions, isLoading: suggestionsLoading } = useOpeningSuggestions(currentFen);
  const createLine = useCreateLine();
  const deleteLine = useDeleteLine();

  const handleSelectNode = useCallback((node: RepertoireTreeNode) => {
    setSelectedNode(node);
    setCurrentFen(node.fen);
  }, []);

  const handleMove = useCallback(
    (move: { from: Square; to: Square; promotion?: string }) => {
      const tempGame = new Chess(currentFen);
      const result = tempGame.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });

      if (!result) return false;

      // Add this move to repertoire
      createLine.mutate({
        color: selectedColor,
        fen: currentFen,
        move_san: result.san,
        move_uci: `${move.from}${move.to}${move.promotion || ""}`,
        parent_id: selectedNode?.id,
      });

      setCurrentFen(tempGame.fen());
      return true;
    },
    [currentFen, selectedColor, selectedNode, createLine],
  );

  const handleReset = useCallback(() => {
    setCurrentFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    setSelectedNode(null);
    game.reset();
  }, [game]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedNode) return;
    if (!confirm("Delete this line and all its variations?")) return;
    deleteLine.mutate(selectedNode.id);
    setSelectedNode(null);
  }, [selectedNode, deleteLine]);

  const handleAddSuggestedMove = useCallback(
    (move: OpeningMove) => {
      const tempGame = new Chess(currentFen);
      const result = tempGame.move(move.san);

      if (!result) return;

      createLine.mutate({
        color: selectedColor,
        fen: currentFen,
        move_san: result.san,
        move_uci: move.uci || `${result.from}${result.to}${result.promotion || ""}`,
        parent_id: selectedNode?.id,
      });

      setCurrentFen(tempGame.fen());
    },
    [currentFen, selectedColor, selectedNode, createLine],
  );

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Repertoire Builder</h1>
          <p className="mt-1 text-neutral-400">Build and practice your opening repertoire</p>
        </div>
        {stats && stats.total_due_today > 0 && (
          <Link href="/practice">
            <Button variant="primary">
              Practice ({stats.total_due_today} due)
            </Button>
          </Link>
        )}
      </div>

      {/* Color Toggle */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={selectedColor === "white" ? "primary" : "secondary"}
          onClick={() => {
            setSelectedColor("white");
            handleReset();
          }}
        >
          White
        </Button>
        <Button
          variant={selectedColor === "black" ? "primary" : "secondary"}
          onClick={() => {
            setSelectedColor("black");
            handleReset();
          }}
        >
          Black
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-white">
              {selectedColor === "white" ? stats.white_lines : stats.black_lines}
            </p>
            <p className="text-sm text-neutral-400">Total Lines</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-green-500">
              {selectedColor === "white" ? stats.white_coverage : stats.black_coverage}%
            </p>
            <p className="text-sm text-neutral-400">Coverage</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-yellow-500">{stats.total_due_today}</p>
            <p className="text-sm text-neutral-400">Due Today</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-white">{stats.streak_days}</p>
            <p className="text-sm text-neutral-400">Day Streak</p>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Board */}
        <div>
          <Board
            fen={currentFen}
            orientation={selectedColor}
            onMove={handleMove}
            interactive={true}
          />
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={handleReset}>
              Reset
            </Button>
            {selectedNode && (
              <Button
                variant="danger"
                onClick={handleDeleteSelected}
                loading={deleteLine.isPending}
              >
                Delete Line
              </Button>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Opening Suggestions */}
          <Card>
            <CardHeader
              title="Suggested Moves"
              description={
                suggestions?.opening
                  ? `${suggestions.eco ? `${suggestions.eco}: ` : ""}${suggestions.opening}`
                  : "Popular moves in this position from master games"
              }
            />
            {suggestionsLoading ? (
              <div className="animate-pulse space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 rounded bg-neutral-800" />
                ))}
              </div>
            ) : suggestions?.moves && suggestions.moves.length > 0 ? (
              <div className="space-y-2">
                {suggestions.moves.slice(0, 5).map((move) => (
                  <button
                    key={move.san}
                    onClick={() => handleAddSuggestedMove(move)}
                    className="flex w-full items-center justify-between rounded-lg bg-neutral-800 p-3 text-left transition-colors hover:bg-neutral-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-bold text-white">{move.san}</span>
                      <span className="text-sm text-neutral-400">
                        {move.total_games.toLocaleString()} games
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-500">{move.white_wins}%</span>
                      <span className="text-neutral-400">{move.draws}%</span>
                      <span className="text-red-500">{move.black_wins}%</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                No suggestions available for this position
              </p>
            )}
          </Card>

          {/* Repertoire Tree */}
          <Card className="max-h-[400px] overflow-auto">
            <CardHeader
              title={`${selectedColor === "white" ? "White" : "Black"} Repertoire`}
              description="Click a move to navigate, or make moves on the board to add"
            />
            {isLoading ? (
              <div className="animate-pulse space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 rounded bg-neutral-800" />
                ))}
              </div>
            ) : tree ? (
              <>
                <div className="mb-4 flex gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-600" /> Mastered (
                    {tree.lines_mastered})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-600" /> Learning (
                    {tree.lines_learning})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-neutral-600" /> New ({tree.lines_new})
                  </span>
                </div>
                <RepertoireTreeView
                  nodes={tree.root_moves}
                  onSelectNode={handleSelectNode}
                  selectedNodeId={selectedNode?.id}
                />
              </>
            ) : null}
          </Card>
        </div>
      </div>

      {/* Selected Node Info */}
      {selectedNode && (
        <Card className="mt-6">
          <CardHeader title="Selected Position" />
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-neutral-400">Move</p>
              <p className="font-mono font-medium">{selectedNode.move_san}</p>
            </div>
            <div>
              <p className="text-neutral-400">Engine Eval</p>
              <p
                className={clsx(
                  "font-medium",
                  selectedNode.engine_eval && selectedNode.engine_eval > 0.3
                    ? "text-green-500"
                    : selectedNode.engine_eval && selectedNode.engine_eval < -0.3
                      ? "text-red-500"
                      : "text-white",
                )}
              >
                {selectedNode.engine_eval !== null
                  ? `${selectedNode.engine_eval > 0 ? "+" : ""}${selectedNode.engine_eval.toFixed(2)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-neutral-400">Coverage</p>
              <p className="font-medium">
                {selectedNode.coverage_prob !== null
                  ? `${(selectedNode.coverage_prob * 100).toFixed(1)}%`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-neutral-400">Mastery</p>
              <p className="font-medium capitalize">{selectedNode.mastery_level}</p>
            </div>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}
