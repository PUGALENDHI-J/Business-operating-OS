"use client";

import { useState, FormEvent } from "react";
import { useAuth, errorMessage } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Form";

export default function LoginPage() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(phone, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-brand text-xl font-bold text-white">
            N
          </div>
          <h1 className="text-lg font-semibold text-white">NACHIYAR CHIT &amp; FINANCE</h1>
          <p className="text-sm text-sidebar-text">Sign in to the CRM</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-xl">
          <div className="mb-4">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="username"
              placeholder="9000000001"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="mb-5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="mb-4 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-sidebar-text">Velpadi, Vellore, Tamil Nadu · 9043420099</p>
      </div>
    </div>
  );
}
