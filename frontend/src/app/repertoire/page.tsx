"use client";

import { Board } from "@/components/chess/board";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { RepertoireTreeView } from "@/components/repertoire/repertoire-tree";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type { RepertoireTreeNode } from "@/lib/api";
import { useCreateLine, useDeleteLine, useRepertoireStats, useRepertoireTree } from "@/lib/hooks";
import { Chess, type Square } from "chess.js";
import { clsx } from "clsx";
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

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Repertoire Builder</h1>
        <p className="mt-1 text-neutral-400">Build and practice your opening repertoire</p>
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

        {/* Tree */}
        <Card className="max-h-[600px] overflow-auto">
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
