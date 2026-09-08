"use client";

import { CheckCheck, Bell } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useResourceList } from "@/lib/use-resource-list";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api-client";
import { cn, formatDateTime, titleCase } from "@/lib/utils";
import type { AppNotification } from "@/lib/types";

export default function NotificationsPage() {
  const { showToast } = useToast();
  const { data, loading, error, refetch } = useResourceList<AppNotification>("/notifications", { pageSize: 50 });

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      refetch();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update notification.", "error");
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("/notifications/mark-all-read", {});
      showToast("All notifications marked as read.");
      refetch();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update notifications.", "error");
    }
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="System alerts and reminders addressed to you."
        action={data.some((n) => !n.is_read) && (
          <Button variant="secondary" onClick={markAllRead}><CheckCheck className="h-4 w-4" /> Mark all as read</Button>
        )}
      />

      <Card>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : data.length === 0 ? (
          <EmptyState title="No notifications yet" description="You're all caught up." />
        ) : (
          <ul className="divide-y divide-border">
            {data.map((n) => (
              <li
                key={n.id}
                className={cn("flex items-start gap-3 px-5 py-4 cursor-pointer", !n.is_read && "bg-brand/[0.03]")}
                onClick={() => !n.is_read && markRead(n.id)}
              >
                <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", n.is_read ? "bg-slate-100 text-slate-400" : "bg-brand/10 text-brand")}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm", n.is_read ? "text-slate-600" : "font-semibold text-slate-900")}>{n.title}</p>
                    {!n.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted">{titleCase(n.type)} · {formatDateTime(n.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
