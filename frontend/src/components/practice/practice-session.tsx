"use client";

import { Board } from "@/components/chess/board";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useAnswerCard,
  useEndStudySession,
  useNextStudyCard,
  useStartStudySession,
} from "@/lib/hooks";
import { usePracticeStore } from "@/stores/practice";
import { Chess, type Square } from "chess.js";
import { clsx } from "clsx";
import { useCallback, useEffect, useRef } from "react";

type PracticeSessionProps = {
  sessionType?: "repertoire" | "tactics" | "endgame" | "review";
};

export function PracticeSession({ sessionType = "repertoire" }: PracticeSessionProps) {
  const {
    sessionId,
    currentCard,
    lastResult,
    cardsAnswered,
    cardsCorrect,
    startTime,
    showingResult,
    startSession,
    setCurrentCard,
    setLastResult,
    incrementAnswered,
    setShowingResult,
    resetSession,
  } = usePracticeStore();

  const startMutation = useStartStudySession();
  const endMutation = useEndStudySession();
  const answerMutation = useAnswerCard();
  const cardStartTime = useRef<number>(0);

  const { data: nextCard, refetch: refetchNextCard } = useNextStudyCard(sessionId || "");

  // Start session
  const handleStart = useCallback(async () => {
    const session = await startMutation.mutateAsync({
      session_type: sessionType,
      max_cards: 20,
    });
    startSession(session.id);
  }, [sessionType, startMutation, startSession]);

  // Load next card when session starts or after answering
  useEffect(() => {
    if (sessionId && nextCard && !showingResult) {
      setCurrentCard(nextCard);
      cardStartTime.current = Date.now();
    }
  }, [sessionId, nextCard, showingResult, setCurrentCard]);

  // Handle move on board
  const handleMove = useCallback(
    (move: { from: Square; to: Square; promotion?: string }) => {
      if (!currentCard || showingResult) return false;

      const game = new Chess(currentCard.fen);
      const moveResult = game.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });

      if (!moveResult) return false;

      const userMove = moveResult.san;
      const timeToAnswer = Date.now() - cardStartTime.current;

      answerMutation.mutate(
        {
          cardId: currentCard.id,
          data: {
            user_move: userMove,
            time_to_answer_ms: timeToAnswer,
          },
        },
        {
          onSuccess: (result) => {
            setLastResult(result);
            incrementAnswered(result.is_correct);
          },
        },
      );

      return true;
    },
    [currentCard, showingResult, answerMutation, setLastResult, incrementAnswered],
  );

  // Continue to next card
  const handleContinue = useCallback(() => {
    setShowingResult(false);
    refetchNextCard();
  }, [setShowingResult, refetchNextCard]);

  // End session
  const handleEnd = useCallback(async () => {
    if (!sessionId) return;
    await endMutation.mutateAsync(sessionId);
    resetSession();
  }, [sessionId, endMutation, resetSession]);

  // No active session - show start screen
  if (!sessionId) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <h2 className="mb-4 text-2xl font-bold">Ready to Practice?</h2>
        <p className="mb-6 text-neutral-400">Test your opening knowledge with spaced repetition.</p>
        <Button onClick={handleStart} loading={startMutation.isPending} size="lg">
          Start Session
        </Button>
      </Card>
    );
  }

  // No more cards - show completion
  if (!currentCard && !showingResult && sessionId) {
    const accuracy = cardsAnswered > 0 ? Math.round((cardsCorrect / cardsAnswered) * 100) : 0;
    const duration = startTime ? Math.round((Date.now() - startTime) / 1000 / 60) : 0;

    return (
      <Card className="mx-auto max-w-md text-center">
        <h2 className="mb-4 text-2xl font-bold">Session Complete!</h2>
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div>
            <p className="text-3xl font-bold text-white">{cardsAnswered}</p>
            <p className="text-sm text-neutral-400">Cards</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-500">{accuracy}%</p>
            <p className="text-sm text-neutral-400">Accuracy</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{duration}m</p>
            <p className="text-sm text-neutral-400">Time</p>
          </div>
        </div>
        <Button onClick={handleEnd} loading={endMutation.isPending}>
          Finish
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Progress bar */}
      <div className="mb-4 flex items-center justify-between text-sm text-neutral-400">
        <span>
          {cardsAnswered} cards reviewed ({cardsCorrect} correct)
        </span>
        <Button variant="ghost" size="sm" onClick={handleEnd}>
          End Session
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Board */}
        <div>
          <Board
            fen={currentCard?.fen}
            orientation={currentCard?.fen.includes(" b ") ? "black" : "white"}
            onMove={handleMove}
            interactive={!showingResult}
          />
        </div>

        {/* Result/Instructions */}
        <div className="flex flex-col justify-center">
          {showingResult && lastResult ? (
            <Card
              className={clsx(
                "border-2",
                lastResult.is_correct ? "border-green-600" : "border-red-600",
              )}
            >
              <div className="mb-4 flex items-center gap-3">
                {lastResult.is_correct ? (
                  <div className="rounded-full bg-green-600 p-2">
                    <CheckIcon className="h-6 w-6 text-white" />
                  </div>
                ) : (
                  <div className="rounded-full bg-red-600 p-2">
                    <XIcon className="h-6 w-6 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">
                    {lastResult.is_correct ? "Correct!" : "Incorrect"}
                  </p>
                  {!lastResult.is_correct && (
                    <p className="text-sm text-neutral-400">
                      The correct move was{" "}
                      <span className="font-mono font-bold text-white">
                        {lastResult.correct_move}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {lastResult.explanation && (
                <p className="mb-4 text-sm text-neutral-300">{lastResult.explanation}</p>
              )}

              {lastResult.next_review_days !== null && (
                <p className="mb-4 text-xs text-neutral-500">
                  Next review in {lastResult.next_review_days} day(s)
                </p>
              )}

              <div className="flex gap-2">
                <Button onClick={handleContinue} className="flex-1">
                  Continue
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <h3 className="mb-2 text-lg font-semibold">Your Move</h3>
              <p className="text-neutral-400">
                Find the best move in this position. Drag a piece to make your move.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
