"use client";

import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCoachChat, useWeeklyPlan } from "@/lib/hooks";
import type { ChatMessage } from "@/lib/api";
import { clsx } from "clsx";

export default function CoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = useCoachChat();
  const { data: weeklyPlan, isLoading: planLoading, error: planError } = useWeeklyPlan();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await chatMutation.mutateAsync({
        message: input.trim(),
        conversation_history: messages,
      });

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    }
  };

  const suggestedQuestions = [
    "What should I focus on to improve?",
    "Explain the Italian Game opening",
    "How do I improve my endgame?",
    "What are common mistakes at my level?",
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">AI Coach</h1>
        <p className="mt-1 text-neutral-400">
          Get personalized chess advice and explanations
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chat */}
        <div className="lg:col-span-2">
          <Card className="flex h-[600px] flex-col">
            <CardHeader title="Chat with Coach" />

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-neutral-400 mb-4">
                    Ask me anything about chess!
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestedQuestions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleSuggestedQuestion(q)}
                        className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={clsx(
                      "max-w-[85%] rounded-lg px-4 py-2",
                      msg.role === "user"
                        ? "ml-auto bg-green-600 text-white"
                        : "bg-neutral-800 text-neutral-100"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))
              )}
              {chatMutation.isPending && (
                <div className="max-w-[85%] rounded-lg bg-neutral-800 px-4 py-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-500" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-500 [animation-delay:0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-500 [animation-delay:0.2s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about openings, tactics, strategy..."
                className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-white placeholder-neutral-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                disabled={chatMutation.isPending}
              />
              <Button type="submit" disabled={!input.trim() || chatMutation.isPending}>
                Send
              </Button>
            </form>
          </Card>
        </div>

        {/* Weekly Plan */}
        <div>
          <Card>
            <CardHeader
              title="Weekly Plan"
              description="Personalized improvement plan based on your games"
            />

            {planLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-full rounded bg-neutral-800" />
                <div className="h-4 w-3/4 rounded bg-neutral-800" />
                <div className="h-4 w-5/6 rounded bg-neutral-800" />
              </div>
            ) : planError ? (
              <div className="text-sm text-neutral-500">
                Play some games to get a personalized weekly plan.
              </div>
            ) : weeklyPlan ? (
              <div className="space-y-4">
                {/* Weaknesses */}
                {weeklyPlan.weaknesses.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-400 mb-2">
                      Areas to Improve
                    </h4>
                    <ul className="space-y-1">
                      {weeklyPlan.weaknesses.map((w, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-red-500">•</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Repertoire Gaps */}
                {weeklyPlan.repertoire_gaps.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-400 mb-2">
                      Repertoire Gaps
                    </h4>
                    <ul className="space-y-1">
                      {weeklyPlan.repertoire_gaps.map((g, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-yellow-500">•</span>
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Plan */}
                <div>
                  <h4 className="text-sm font-medium text-neutral-400 mb-2">
                    Your Plan
                  </h4>
                  <div className="text-sm whitespace-pre-wrap text-neutral-300">
                    {weeklyPlan.plan}
                  </div>
                </div>
              </div>
            ) : null}
          </Card>

          {/* Quick Actions */}
          <Card className="mt-4">
            <CardHeader title="Quick Help" />
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSuggestedQuestion("Analyze my recent games and tell me what to work on")}
                className="w-full rounded-lg border border-neutral-700 px-3 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                Analyze my games
              </button>
              <button
                type="button"
                onClick={() => handleSuggestedQuestion("What openings should I play as white for an attacking style?")}
                className="w-full rounded-lg border border-neutral-700 px-3 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                Opening recommendations
              </button>
              <button
                type="button"
                onClick={() => handleSuggestedQuestion("Give me a tactical puzzle to solve")}
                className="w-full rounded-lg border border-neutral-700 px-3 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                Practice tactics
              </button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
