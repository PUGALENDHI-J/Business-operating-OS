import { useState, useEffect, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileBottomNav } from "./MobileBottomNav";
import { QuickAddModal } from "./QuickAddModal";
import { ToastContainer } from "../ui/Toast";
import { runNotificationSweep, maybeRequestNotificationPermission } from "../../lib/notifications";
import { sweepOverdueInvoices } from "../../lib/cascades";

export function AppShell({ children, primaryAction }: { children: ReactNode; primaryAction?: { label: string; onClick: () => void } }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    sweepOverdueInvoices();
    runNotificationSweep();
    maybeRequestNotificationPermission();
    const interval = setInterval(() => {
      sweepOverdueInvoices();
      runNotificationSweep();
    }, 5 * 60 * 1000); // re-check every 5 minutes while the app is open
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-[240px] min-w-0">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} primaryAction={primaryAction} />
        <main className="flex-1 p-4 md:p-edge-margin-desktop pb-24 lg:pb-12 bg-surface">
          <div className="max-w-container-max mx-auto space-y-stack-lg">{children}</div>
        </main>
      </div>
      <MobileBottomNav />
      <QuickAddModal />
      <ToastContainer />
    </div>
  );
}
