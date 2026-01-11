"use client";

import { type ReactNode } from "react";
import { clsx } from "clsx";
import { Sidebar } from "./sidebar";
import { useUIStore } from "@/stores/ui";

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-neutral-950">
      <Sidebar />
      <main
        className={clsx(
          "min-h-screen transition-all duration-300",
          sidebarOpen ? "ml-64" : "ml-16"
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
