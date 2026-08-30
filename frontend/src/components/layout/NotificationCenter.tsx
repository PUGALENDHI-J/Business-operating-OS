import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../ui/Icon";
import { ContactActions } from "../ui/ContactActions";
import { useStore } from "../../lib/store";
import { formatDate } from "../../lib/format";
import type { AppNotification, NotificationType } from "../../types";

const TYPE_ICON: Record<NotificationType, { icon: string; className: string }> = {
  alert: { icon: "error", className: "text-error" },
  warning: { icon: "warning", className: "text-status-warning-text" },
  success: { icon: "check_circle", className: "text-status-active-text" },
  info: { icon: "info", className: "text-on-surface-variant" },
};

/**
 * Makes the topbar bell functional (spec Section 30): unread/read tabs,
 * mark-as-read / mark-all-as-read, and a Call button inline for follow-up
 * notifications since that's the one action people take most from here.
 */
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, clients, updateEntity } = useStore();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const visible = (tab === "unread" ? notifications.filter((n) => !n.read) : notifications).slice(0, 30);

  function markRead(n: AppNotification) {
    updateEntity<AppNotification>("notifications", n.id, { read: true });
  }

  function markAllRead() {
    notifications.filter((n) => !n.read).forEach((n) => updateEntity<AppNotification>("notifications", n.id, { read: true }));
  }

  function openNotification(n: AppNotification) {
    markRead(n);
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors relative"
        aria-label="Notifications"
      >
        <Icon name="notifications" />
        {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-secondary-container rounded-full" />}
      </button>

      {open && (
        <div className="absolute top-12 right-0 w-[360px] max-w-[calc(100vw-2rem)] max-h-[70vh] bg-surface-container-lowest border border-outline-variant rounded-lg shadow-soft-hover z-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant flex-shrink-0">
            <div className="flex items-center gap-1 text-label-sm font-label-sm">
              <button
                onClick={() => setTab("unread")}
                className={`px-2.5 py-1 rounded-full ${tab === "unread" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"}`}
              >
                Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
              </button>
              <button
                onClick={() => setTab("all")}
                className={`px-2.5 py-1 rounded-full ${tab === "all" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"}`}
              >
                All
              </button>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-bold text-primary hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="px-4 py-8 text-center text-body-sm font-body-sm text-on-surface-variant">
                {tab === "unread" ? "You're all caught up." : "No notifications yet."}
              </div>
            ) : (
              visible.map((n) => {
                const tone = TYPE_ICON[n.type];
                // Follow-up notifications link to /crm/clients/:id — resolve contact details for the inline Call/WhatsApp buttons.
                let contact: { whatsapp?: string | null; phone?: string | null } | null = null;
                if (n.entity_type === "FollowUp" && n.link) {
                  const clientIdMatch = n.link.match(/\/crm\/clients\/(.+)/);
                  if (clientIdMatch) {
                    const c = clients.find((cl) => cl.id === clientIdMatch[1]);
                    if (c) contact = { whatsapp: c.whatsapp || c.phone, phone: c.phone };
                  }
                }
                return (
                  <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-outline-variant/60 last:border-0 ${!n.read ? "bg-primary/5" : ""}`}>
                    <Icon name={tone.icon} size={20} className={`${tone.className} flex-shrink-0 mt-0.5`} />
                    <button className="flex-1 min-w-0 text-left" onClick={() => openNotification(n)}>
                      <div className="text-body-sm font-body-sm font-semibold text-on-surface">{n.title}</div>
                      <div className="text-xs text-on-surface-variant mt-0.5">{n.body}</div>
                      <div className="text-[10px] text-outline mt-1">{formatDate(n.created_at)}</div>
                    </button>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {contact && <ContactActions whatsapp={contact.whatsapp} phone={contact.phone} size="sm" />}
                      {!n.read && (
                        <button onClick={() => markRead(n)} className="text-[11px] text-primary hover:underline whitespace-nowrap">
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
