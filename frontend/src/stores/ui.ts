import { create } from "zustand";

type BoardTheme = "green" | "brown" | "blue" | "purple";
type PieceSet = "standard" | "neo" | "alpha" | "chess7";

type UIState = {
  sidebarOpen: boolean;
  boardTheme: BoardTheme;
  pieceSet: PieceSet;
  showCoordinates: boolean;
  soundEnabled: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setBoardTheme: (theme: BoardTheme) => void;
  setPieceSet: (set: PieceSet) => void;
  setShowCoordinates: (show: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
};

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  boardTheme: "green",
  pieceSet: "standard",
  showCoordinates: true,
  soundEnabled: true,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setBoardTheme: (theme) => set({ boardTheme: theme }),
  setPieceSet: (set_) => set({ pieceSet: set_ }),
  setShowCoordinates: (show) => set({ showCoordinates: show }),
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
}));
