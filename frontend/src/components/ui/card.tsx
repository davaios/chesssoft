import { clsx } from "clsx";
import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <div className={clsx("rounded-xl border border-neutral-800 bg-neutral-900 p-6", className)}>
      {children}
    </div>
  );
}

type CardHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {description && <p className="mt-1 text-sm text-neutral-400">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string | number;
  change?: {
    value: number;
    positive: boolean;
  };
  icon?: ReactNode;
};

export function StatCard({ label, value, change, icon }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-400">{label}</p>
          <p className="mt-1 text-3xl font-bold text-white">{value}</p>
          {change && (
            <p
              className={clsx("mt-1 text-sm", change.positive ? "text-green-500" : "text-red-500")}
            >
              {change.positive ? "+" : ""}
              {change.value}%
            </p>
          )}
        </div>
        {icon && <div className="rounded-lg bg-neutral-800 p-3 text-neutral-400">{icon}</div>}
      </div>
    </Card>
  );
}
