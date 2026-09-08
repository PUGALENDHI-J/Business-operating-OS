"use client";

import { useState, FormEvent } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input, Label } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth, errorMessage } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      showToast("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your account and security preferences." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile" />
          <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
            <div><dt className="text-xs text-muted">Full Name</dt><dd className="mt-0.5 font-medium text-slate-800">{user?.full_name}</dd></div>
            <div><dt className="text-xs text-muted">Phone</dt><dd className="mt-0.5 font-medium text-slate-800">{user?.phone}</dd></div>
            <div><dt className="text-xs text-muted">Email</dt><dd className="mt-0.5 font-medium text-slate-800">{user?.email ?? "—"}</dd></div>
            <div>
              <dt className="text-xs text-muted">Roles</dt>
              <dd className="mt-0.5 flex flex-wrap gap-1">
                {user?.roles.map((r) => <Badge key={r} tone="brand">{r}</Badge>)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Change Password" />
          <form onSubmit={handleChangePassword} className="space-y-4 p-5">
            <div>
              <Label htmlFor="current_password">Current password</Label>
              <Input id="current_password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="new_password">New password</Label>
              <Input id="new_password" type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <Input id="confirm_password" type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}
            <Button type="submit" loading={saving}>Change Password</Button>
          </form>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="System Settings" />
        <div className="p-5">
          <p className="text-sm text-muted">
            Application-wide configuration (default commission percentages, WhatsApp reminder lead times, etc.) is modeled
            in the database but not yet exposed through the API in Phase 3 — there is no <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">/settings</code> endpoint
            to manage it from here yet. This section will be built out once that endpoint exists.
          </p>
        </div>
      </Card>
    </div>
  );
}
