"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authApi,
  coachApi,
  gamesApi,
  platformApi,
  repertoireApi,
  studyApi,
  type CardAnswer,
  type CreateLineData,
  type GameListParams,
  type UpdateLineData,
} from "./api";

// Auth hooks
export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: authApi.me,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      localStorage.setItem("token", data.access_token);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: authApi.register,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return () => {
    localStorage.removeItem("token");
    queryClient.setQueryData(["currentUser"], null);
    queryClient.invalidateQueries();
  };
}

// Platform hooks
export function usePlatformAccounts() {
  return useQuery({
    queryKey: ["platformAccounts"],
    queryFn: platformApi.list,
  });
}

export function useConnectPlatform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: platformApi.connect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platformAccounts"] });
    },
  });
}

export function useDisconnectPlatform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: platformApi.disconnect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platformAccounts"] });
    },
  });
}

export function useSyncPlatform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: platformApi.sync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["gameStats"] });
    },
  });
}

// Games hooks
export function useGames(params?: GameListParams) {
  return useQuery({
    queryKey: ["games", params],
    queryFn: () => gamesApi.list(params),
  });
}

export function useGame(id: string) {
  return useQuery({
    queryKey: ["game", id],
    queryFn: () => gamesApi.get(id),
    enabled: !!id,
  });
}

export function useGameStats() {
  return useQuery({
    queryKey: ["gameStats"],
    queryFn: gamesApi.stats,
  });
}

export function useDeleteGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: gamesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["gameStats"] });
    },
  });
}

// Repertoire hooks
export function useRepertoireStats() {
  return useQuery({
    queryKey: ["repertoireStats"],
    queryFn: repertoireApi.stats,
  });
}

export function useRepertoireTree(color: "white" | "black") {
  return useQuery({
    queryKey: ["repertoireTree", color],
    queryFn: () => repertoireApi.tree(color),
  });
}

export function useRepertoireLines(params?: { color?: string; fen?: string; due_only?: boolean }) {
  return useQuery({
    queryKey: ["repertoireLines", params],
    queryFn: () => repertoireApi.listLines(params),
  });
}

export function useCreateLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLineData) => repertoireApi.createLine(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repertoireTree"] });
      queryClient.invalidateQueries({ queryKey: ["repertoireLines"] });
      queryClient.invalidateQueries({ queryKey: ["repertoireStats"] });
    },
  });
}

export function useUpdateLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLineData }) =>
      repertoireApi.updateLine(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repertoireTree"] });
      queryClient.invalidateQueries({ queryKey: ["repertoireLines"] });
    },
  });
}

export function useDeleteLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: repertoireApi.deleteLine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repertoireTree"] });
      queryClient.invalidateQueries({ queryKey: ["repertoireLines"] });
      queryClient.invalidateQueries({ queryKey: ["repertoireStats"] });
    },
  });
}

// Study hooks
export function useDailyStudyGoal() {
  return useQuery({
    queryKey: ["dailyStudyGoal"],
    queryFn: studyApi.daily,
  });
}

export function useStudySessions(limit?: number) {
  return useQuery({
    queryKey: ["studySessions", limit],
    queryFn: () => studyApi.listSessions(limit),
  });
}

export function useStartStudySession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: studyApi.startSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studySessions"] });
    },
  });
}

export function useEndStudySession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: studyApi.endSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studySessions"] });
      queryClient.invalidateQueries({ queryKey: ["dailyStudyGoal"] });
    },
  });
}

export function useNextStudyCard(sessionId: string) {
  return useQuery({
    queryKey: ["nextStudyCard", sessionId],
    queryFn: () => studyApi.getNextCard(sessionId),
    enabled: !!sessionId,
  });
}

export function useAnswerCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, data }: { cardId: string; data: CardAnswer }) =>
      studyApi.answerCard(cardId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["nextStudyCard"] });
      queryClient.invalidateQueries({ queryKey: ["repertoireLines"] });
    },
  });
}

// Coach hooks
export function useCoachChat() {
  return useMutation({
    mutationFn: coachApi.chat,
  });
}

export function useExplainMove() {
  return useMutation({
    mutationFn: coachApi.explainMove,
  });
}

export function useWeeklyPlan() {
  return useQuery({
    queryKey: ["weeklyPlan"],
    queryFn: coachApi.weeklyPlan,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: false,
  });
}

export function useExplainOpening() {
  return useMutation({
    mutationFn: coachApi.explainOpening,
  });
}
