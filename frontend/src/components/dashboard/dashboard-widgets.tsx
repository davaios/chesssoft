"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useDailyStudyGoal, useGameStats, useRepertoireStats } from "@/lib/hooks";
import Link from "next/link";

export function TodayWidget() {
  const { data: daily, isLoading } = useDailyStudyGoal();

  if (isLoading) {
    return <WidgetSkeleton />;
  }

  return (
    <Card>
      <CardHeader
        title="Today"
        action={
          <Link href="/practice">
            <Button size="sm">Practice Now</Button>
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-3xl font-bold text-white">{daily?.cards_due_today || 0}</p>
          <p className="text-sm text-neutral-400">Cards due</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-green-500">{daily?.streak_days || 0}</p>
          <p className="text-sm text-neutral-400">Day streak</p>
        </div>
      </div>
      {daily && daily.cards_completed_today > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Today&apos;s progress</span>
            <span className="text-white">
              {daily.cards_completed_today}/{daily.target_cards}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full bg-green-600 transition-all"
              style={{
                width: `${Math.min(100, (daily.cards_completed_today / daily.target_cards) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

export function RepertoireWidget() {
  const { data: stats, isLoading } = useRepertoireStats();

  if (isLoading) {
    return <WidgetSkeleton />;
  }

  return (
    <Card>
      <CardHeader
        title="Repertoire Coverage"
        action={
          <Link href="/repertoire">
            <Button variant="ghost" size="sm">
              View
            </Button>
          </Link>
        }
      />
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">White</span>
            <span className="text-white">{stats?.white_coverage || 0}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full bg-white transition-all"
              style={{ width: `${stats?.white_coverage || 0}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-neutral-500">{stats?.white_lines || 0} lines</p>
        </div>
        <div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Black</span>
            <span className="text-white">{stats?.black_coverage || 0}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full bg-neutral-600 transition-all"
              style={{ width: `${stats?.black_coverage || 0}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-neutral-500">{stats?.black_lines || 0} lines</p>
        </div>
      </div>
    </Card>
  );
}

export function GameStatsWidget() {
  const { data: stats, isLoading } = useGameStats();

  if (isLoading) {
    return <WidgetSkeleton />;
  }

  const winRate = stats?.win_rate || 0;

  return (
    <Card>
      <CardHeader
        title="Performance"
        action={
          <Link href="/games">
            <Button variant="ghost" size="sm">
              View Games
            </Button>
          </Link>
        }
      />
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-green-500">{stats?.wins || 0}</p>
          <p className="text-xs text-neutral-400">Wins</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-neutral-400">{stats?.draws || 0}</p>
          <p className="text-xs text-neutral-400">Draws</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-red-500">{stats?.losses || 0}</p>
          <p className="text-xs text-neutral-400">Losses</p>
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-neutral-400">Win Rate</p>
        <p className="text-3xl font-bold text-white">{winRate}%</p>
      </div>
      {stats?.avg_acpl && (
        <div className="mt-2 text-center">
          <p className="text-sm text-neutral-400">Avg ACPL</p>
          <p className="text-lg font-semibold text-white">{stats.avg_acpl}</p>
        </div>
      )}
    </Card>
  );
}

export function CoachTipWidget() {
  return (
    <Card className="bg-gradient-to-br from-green-900/30 to-neutral-900">
      <CardHeader title="Coach Says" />
      <p className="text-neutral-300">
        Based on your recent games, you should focus on improving your endgame technique. Try
        practicing king and pawn endgames this week.
      </p>
      <div className="mt-4">
        <Link href="/coach">
          <Button variant="secondary" size="sm">
            Get Full Analysis
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function WidgetSkeleton() {
  return (
    <Card>
      <div className="animate-pulse">
        <div className="mb-4 h-6 w-32 rounded bg-neutral-800" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-neutral-800" />
          <div className="h-4 w-3/4 rounded bg-neutral-800" />
        </div>
      </div>
    </Card>
  );
}
