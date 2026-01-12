"use client";

import { Board } from "@/components/chess/board";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { RepertoireTreeView } from "@/components/repertoire/repertoire-tree";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type { RepertoireTreeNode } from "@/lib/api";
import {
  useCreateLine,
  useDeleteLine,
  useExplainOpening,
  useRepertoireStats,
  useRepertoireTree,
} from "@/lib/hooks";
import { Chess, type Square } from "chess.js";
import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";

// Common opening database for quick detection
const OPENINGS_DB: Record<string, { name: string; eco: string; moves: string[] }> = {
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1": {
    name: "King's Pawn Opening",
    eco: "B00",
    moves: ["e5", "c5", "e6", "c6", "d6", "d5", "Nf6"],
  },
  "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1": {
    name: "Queen's Pawn Opening",
    eco: "A40",
    moves: ["d5", "Nf6", "e6", "f5", "g6"],
  },
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2": {
    name: "Open Game",
    eco: "C20",
    moves: ["Nf3", "Nc3", "f4", "Bc4", "d4"],
  },
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2": {
    name: "King's Knight Opening",
    eco: "C40",
    moves: ["Nc6", "Nf6", "d6", "f5"],
  },
  "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3": {
    name: "Italian Game / Ruy Lopez",
    eco: "C50",
    moves: ["Bb5", "Bc4", "d4", "Nc3"],
  },
  "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2": {
    name: "Sicilian Defense",
    eco: "B20",
    moves: ["Nf3", "Nc3", "c3", "f4", "d4"],
  },
  "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2": {
    name: "Scandinavian Defense",
    eco: "B01",
    moves: ["exd5", "Nc3", "e5"],
  },
  "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2": {
    name: "French Defense",
    eco: "C00",
    moves: ["d4", "Nc3", "Nf3", "e5"],
  },
  "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2": {
    name: "Caro-Kann Defense",
    eco: "B10",
    moves: ["d4", "Nc3", "Nf3", "c4"],
  },
  "rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2": {
    name: "Modern Defense",
    eco: "B06",
    moves: ["d4", "Nc3", "Nf3", "f4"],
  },
  "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2": {
    name: "Queen's Gambit",
    eco: "D00",
    moves: ["c4", "Nf3", "Bf4", "e3"],
  },
  "rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2": {
    name: "Indian Defense",
    eco: "A45",
    moves: ["c4", "Nf3", "Nc3", "Bg5"],
  },
};

export default function RepertoirePage() {
  const [selectedColor, setSelectedColor] = useState<"white" | "black">("white");
  const [selectedNode, setSelectedNode] = useState<RepertoireTreeNode | null>(null);
  const [currentFen, setCurrentFen] = useState(
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  );
  const [game] = useState(() => new Chess());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [openingExplanation, setOpeningExplanation] = useState<string | null>(null);

  const { data: tree, isLoading } = useRepertoireTree(selectedColor);
  const { data: stats } = useRepertoireStats();
  const createLine = useCreateLine();
  const deleteLine = useDeleteLine();
  const explainOpening = useExplainOpening();

  // Detect current opening based on FEN
  const detectedOpening = useMemo(() => {
    // Try exact match first
    if (OPENINGS_DB[currentFen]) {
      return OPENINGS_DB[currentFen];
    }

    // Try to match by FEN prefix (position only, ignoring move counters)
    const fenPosition = currentFen.split(" ").slice(0, 4).join(" ");
    for (const [fen, opening] of Object.entries(OPENINGS_DB)) {
      const dbFenPosition = fen.split(" ").slice(0, 4).join(" ");
      if (fenPosition === dbFenPosition) {
        return opening;
      }
    }

    // Calculate legal moves for suggestions
    const tempGame = new Chess(currentFen);
    const legalMoves = tempGame.moves({ verbose: true }).slice(0, 7);

    if (currentFen === "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") {
      return {
        name: "Starting Position",
        eco: "",
        moves: ["e4", "d4", "Nf3", "c4", "g3"],
      };
    }

    return {
      name: "Unknown Position",
      eco: "",
      moves: legalMoves.map((m) => m.san),
    };
  }, [currentFen]);

  // Request opening explanation from AI Coach
  const handleExplainOpening = useCallback(() => {
    if (!detectedOpening || detectedOpening.name === "Unknown Position") return;

    setOpeningExplanation(null);
    explainOpening.mutate(
      {
        opening_name: detectedOpening.name,
        eco_code: detectedOpening.eco,
        player_color: selectedColor,
      },
      {
        onSuccess: (data) => {
          setOpeningExplanation(data.explanation);
        },
      },
    );
  }, [detectedOpening, selectedColor, explainOpening]);

  // Reset explanation when position changes significantly
  useEffect(() => {
    setOpeningExplanation(null);
  }, [detectedOpening?.name]);

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
      setMoveHistory((prev) => [...prev, result.san]);
      return true;
    },
    [currentFen, selectedColor, selectedNode, createLine],
  );

  const handleReset = useCallback(() => {
    setCurrentFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    setSelectedNode(null);
    setMoveHistory([]);
    setOpeningExplanation(null);
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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

        {/* Live Tips Panel */}
        <Card className="h-fit">
          <CardHeader
            title="Live Tips"
            description="Real-time suggestions based on current position"
          />

          {/* Current Opening */}
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2">
              <BookOpenIcon className="h-5 w-5 text-green-500" />
              <span className="font-medium text-white">
                {detectedOpening?.name || "Unknown Position"}
              </span>
              {detectedOpening?.eco && (
                <span className="rounded bg-neutral-700 px-2 py-0.5 text-xs">
                  {detectedOpening.eco}
                </span>
              )}
            </div>

            {/* Move History */}
            {moveHistory.length > 0 && (
              <div className="mb-3 rounded bg-neutral-800 p-2">
                <p className="mb-1 text-xs text-neutral-400">Current line:</p>
                <p className="font-mono text-sm">
                  {moveHistory.map((move, i) => (
                    <span key={i}>
                      {i % 2 === 0 && <span className="text-neutral-500">{Math.floor(i / 2) + 1}. </span>}
                      <span className="text-white">{move} </span>
                    </span>
                  ))}
                </p>
              </div>
            )}
          </div>

          {/* Suggested Moves */}
          <div className="mb-4">
            <p className="mb-2 flex items-center gap-2 text-sm text-neutral-400">
              <LightbulbIcon className="h-4 w-4" />
              Suggested moves:
            </p>
            <div className="flex flex-wrap gap-2">
              {detectedOpening?.moves.map((move) => (
                <span
                  key={move}
                  className="rounded bg-green-900/30 px-2 py-1 font-mono text-sm text-green-400 transition-colors hover:bg-green-900/50"
                >
                  {move}
                </span>
              ))}
            </div>
          </div>

          {/* AI Explanation */}
          {detectedOpening?.name !== "Unknown Position" &&
            detectedOpening?.name !== "Starting Position" && (
              <div className="border-t border-neutral-800 pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExplainOpening}
                  loading={explainOpening.isPending}
                  className="mb-3 w-full"
                >
                  <SparklesIcon className="mr-2 h-4 w-4" />
                  Ask AI Coach about this opening
                </Button>

                {openingExplanation && (
                  <div className="rounded bg-neutral-800 p-3 text-sm leading-relaxed text-neutral-300">
                    {openingExplanation}
                  </div>
                )}
              </div>
            )}

          {/* Quick Tips */}
          <div className="mt-4 border-t border-neutral-800 pt-4">
            <p className="mb-2 text-xs font-medium text-neutral-400">QUICK TIPS</p>
            <ul className="space-y-1 text-xs text-neutral-500">
              <li>Make moves on the board to add them to your repertoire</li>
              <li>Click on moves in the tree to navigate</li>
              <li>Green moves are well-known theoretical lines</li>
            </ul>
          </div>
        </Card>

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

// Icon components
function BookOpenIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Book icon">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

function LightbulbIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Lightbulb icon">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

function SparklesIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Sparkles icon">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}
