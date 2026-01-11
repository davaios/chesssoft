"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PracticeSession } from "@/components/practice/practice-session";

export default function PracticePage() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Practice</h1>
        <p className="mt-1 text-neutral-400">
          Train your opening repertoire with spaced repetition.
        </p>
      </div>

      <PracticeSession sessionType="repertoire" />
    </DashboardLayout>
  );
}
