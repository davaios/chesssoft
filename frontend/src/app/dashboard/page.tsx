"use client";

import {
  CoachTipWidget,
  GameStatsWidget,
  RepertoireWidget,
  TodayWidget,
} from "@/components/dashboard/dashboard-widgets";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-neutral-400">
          Welcome back! Here&apos;s your chess improvement overview.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <TodayWidget />
        <RepertoireWidget />
        <GameStatsWidget />
      </div>

      <div className="mt-6">
        <CoachTipWidget />
      </div>
    </DashboardLayout>
  );
}
