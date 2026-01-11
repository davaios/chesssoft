import { create } from "zustand";
import type { StudyCard, CardResult } from "@/lib/api";

type PracticeState = {
  sessionId: string | null;
  currentCard: StudyCard | null;
  lastResult: CardResult | null;
  cardsAnswered: number;
  cardsCorrect: number;
  startTime: number | null;
  showingResult: boolean;

  startSession: (sessionId: string) => void;
  setCurrentCard: (card: StudyCard | null) => void;
  setLastResult: (result: CardResult) => void;
  incrementAnswered: (correct: boolean) => void;
  setShowingResult: (showing: boolean) => void;
  resetSession: () => void;
};

export const usePracticeStore = create<PracticeState>()((set) => ({
  sessionId: null,
  currentCard: null,
  lastResult: null,
  cardsAnswered: 0,
  cardsCorrect: 0,
  startTime: null,
  showingResult: false,

  startSession: (sessionId) =>
    set({
      sessionId,
      currentCard: null,
      lastResult: null,
      cardsAnswered: 0,
      cardsCorrect: 0,
      startTime: Date.now(),
      showingResult: false,
    }),

  setCurrentCard: (card) => set({ currentCard: card, showingResult: false }),

  setLastResult: (result) =>
    set({
      lastResult: result,
      showingResult: true,
    }),

  incrementAnswered: (correct) =>
    set((state) => ({
      cardsAnswered: state.cardsAnswered + 1,
      cardsCorrect: state.cardsCorrect + (correct ? 1 : 0),
    })),

  setShowingResult: (showing) => set({ showingResult: showing }),

  resetSession: () =>
    set({
      sessionId: null,
      currentCard: null,
      lastResult: null,
      cardsAnswered: 0,
      cardsCorrect: 0,
      startTime: null,
      showingResult: false,
    }),
}));
