"use client";

import { useCallback, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, type Square } from "chess.js";
import { clsx } from "clsx";

type BoardProps = {
  fen?: string;
  orientation?: "white" | "black";
  onMove?: (move: { from: Square; to: Square; promotion?: string }) => boolean;
  interactive?: boolean;
  showCoordinates?: boolean;
  highlightSquares?: Square[];
  lastMove?: { from: Square; to: Square };
  className?: string;
};

export function Board({
  fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  orientation = "white",
  onMove,
  interactive = true,
  showCoordinates = true,
  highlightSquares = [],
  lastMove,
  className,
}: BoardProps) {
  const [game] = useState(() => new Chess(fen));

  // Custom square styles for highlights
  const customSquareStyles: Record<string, React.CSSProperties> = {};

  // Highlight last move
  if (lastMove) {
    customSquareStyles[lastMove.from] = {
      backgroundColor: "rgba(255, 255, 0, 0.3)",
    };
    customSquareStyles[lastMove.to] = {
      backgroundColor: "rgba(255, 255, 0, 0.3)",
    };
  }

  // Highlight custom squares
  highlightSquares.forEach((square) => {
    customSquareStyles[square] = {
      backgroundColor: "rgba(0, 255, 0, 0.3)",
    };
  });

  const handleDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square) => {
      if (!interactive || !onMove) return false;

      // Check if it's a promotion
      const piece = game.get(sourceSquare);
      const isPromotion =
        piece?.type === "p" &&
        ((piece.color === "w" && targetSquare[1] === "8") ||
          (piece.color === "b" && targetSquare[1] === "1"));

      return onMove({
        from: sourceSquare,
        to: targetSquare,
        promotion: isPromotion ? "q" : undefined, // Default to queen
      });
    },
    [game, interactive, onMove]
  );

  return (
    <div className={clsx("aspect-square w-full max-w-[600px]", className)}>
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        onPieceDrop={handleDrop}
        arePiecesDraggable={interactive}
        showBoardNotation={showCoordinates}
        customSquareStyles={customSquareStyles}
        customBoardStyle={{
          borderRadius: "8px",
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
        }}
        customDarkSquareStyle={{
          backgroundColor: "#769656",
        }}
        customLightSquareStyle={{
          backgroundColor: "#eeeed2",
        }}
      />
    </div>
  );
}
