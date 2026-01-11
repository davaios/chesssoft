"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useConnectPlatform,
  useCurrentUser,
  useDisconnectPlatform,
  usePlatformAccounts,
} from "@/lib/hooks";
import { useLogout } from "@/lib/hooks";
import { useState } from "react";

export default function SettingsPage() {
  const { data: user } = useCurrentUser();
  const { data: accounts, isLoading: accountsLoading } = usePlatformAccounts();
  const connectPlatform = useConnectPlatform();
  const disconnectPlatform = useDisconnectPlatform();
  const logout = useLogout();

  const [newPlatform, setNewPlatform] = useState<"chess.com" | "lichess">("chess.com");
  const [newUsername, setNewUsername] = useState("");
  const [connectError, setConnectError] = useState("");

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectError("");

    if (!newUsername.trim()) {
      setConnectError("Please enter a username");
      return;
    }

    try {
      await connectPlatform.mutateAsync({
        platform: newPlatform,
        username: newUsername.trim(),
      });
      setNewUsername("");
    } catch {
      setConnectError("Failed to connect account. Please check the username.");
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm("Disconnect this account? Your imported games will remain.")) return;
    await disconnectPlatform.mutateAsync(accountId);
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-neutral-400">Manage your account and connected platforms</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader title="Profile" />
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-400">Email</p>
              <p className="font-medium">{user?.email || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Display Name</p>
              <p className="font-medium">{user?.display_name || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Subscription</p>
              <p className="font-medium capitalize">{user?.subscription || "Free"}</p>
            </div>
          </div>
        </Card>

        {/* Connected Platforms */}
        <Card>
          <CardHeader
            title="Connected Platforms"
            description="Link your Chess.com and Lichess accounts to import games"
          />

          {/* Existing accounts */}
          {accountsLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-12 rounded bg-neutral-800" />
            </div>
          ) : accounts && accounts.length > 0 ? (
            <div className="mb-6 space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4"
                >
                  <div>
                    <p className="font-medium">
                      <span className="capitalize">{account.platform}</span>
                      <span className="mx-2 text-neutral-500">•</span>
                      {account.username}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {account.last_sync_at
                        ? `Last synced ${new Date(account.last_sync_at).toLocaleDateString()}`
                        : "Never synced"}
                      {account.last_sync_error && (
                        <span className="ml-2 text-red-500">Error: {account.last_sync_error}</span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDisconnect(account.id)}
                    loading={disconnectPlatform.isPending}
                  >
                    Disconnect
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-6 text-sm text-neutral-500">No accounts connected yet</p>
          )}

          {/* Add new account */}
          <form onSubmit={handleConnect} className="space-y-4">
            <p className="text-sm font-medium text-neutral-300">Connect a new account</p>

            {connectError && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
                {connectError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewPlatform("chess.com")}
                className={`flex-1 rounded-lg border p-3 text-sm transition-colors ${
                  newPlatform === "chess.com"
                    ? "border-green-500 bg-green-500/10"
                    : "border-neutral-700 hover:border-neutral-600"
                }`}
              >
                Chess.com
              </button>
              <button
                type="button"
                onClick={() => setNewPlatform("lichess")}
                className={`flex-1 rounded-lg border p-3 text-sm transition-colors ${
                  newPlatform === "lichess"
                    ? "border-green-500 bg-green-500/10"
                    : "border-neutral-700 hover:border-neutral-600"
                }`}
              >
                Lichess
              </button>
            </div>

            <Input
              placeholder={`Your ${newPlatform} username`}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
            />

            <Button type="submit" loading={connectPlatform.isPending}>
              Connect Account
            </Button>
          </form>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-900/50">
          <CardHeader title="Account Actions" />
          <Button variant="danger" onClick={logout}>
            Sign Out
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}
