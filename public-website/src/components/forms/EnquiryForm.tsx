'use client';

import { useState, FormEvent } from 'react';
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { submitLead } from '@/lib/api';
import { useSchemes } from '@/lib/use-public-data';
import { CtaButton } from '../ui/Cta';
import { cn } from '@/lib/utils';

export function EnquiryForm({
  preselectedSchemeId,
  heading = 'Send an Enquiry',
  submitLabel = 'Submit Enquiry',
}: {
  preselectedSchemeId?: string;
  heading?: string;
  submitLabel?: string;
}) {
  const { data: schemes } = useSchemes();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage(null);

    const form = new FormData(e.currentTarget);
    const result = await submitLead({
      full_name: String(form.get('full_name') ?? ''),
      phone: String(form.get('phone') ?? ''),
      email: String(form.get('email') ?? '') || undefined,
      interested_scheme_id: String(form.get('interested_scheme_id') ?? '') || undefined,
      message: String(form.get('message') ?? '') || undefined,
      website: String(form.get('website') ?? ''), // honeypot
    });

    if (result.ok) {
      setStatus('success');
      (e.target as HTMLFormElement).reset();
    } else {
      setStatus('error');
      setErrorMessage(result.error ?? 'Something went wrong. Please try again or call us directly.');
    }
  };

  if (status === 'success') {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        <p className="text-lg font-semibold text-foreground">Thank you — we&apos;ve received your enquiry.</p>
        <p className="text-sm text-muted">Our team will get back to you shortly. For anything urgent, please call us directly.</p>
        <button onClick={() => setStatus('idle')} className="mt-2 text-sm font-medium text-brand underline underline-offset-2">
          Submit another enquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8" noValidate>
      <h3 className="mb-5 text-lg font-semibold text-foreground">{heading}</h3>

      {/* Honeypot — visually and functionally hidden from real visitors and screen readers. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full Name" htmlFor="full_name" required>
          <input id="full_name" name="full_name" type="text" required autoComplete="name" className={inputClass} />
        </Field>
        <Field label="Phone Number" htmlFor="phone" required>
          <input id="phone" name="phone" type="tel" required autoComplete="tel" className={inputClass} />
        </Field>
        <Field label="Email" htmlFor="email">
          <input id="email" name="email" type="email" autoComplete="email" className={inputClass} />
        </Field>
        {schemes && schemes.length > 0 && (
          <Field label="Interested Scheme" htmlFor="interested_scheme_id">
            <select id="interested_scheme_id" name="interested_scheme_id" defaultValue={preselectedSchemeId ?? ''} className={inputClass}>
              <option value="">Select a scheme (optional)</option>
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        )}
        <div className="sm:col-span-2">
          <Field label="Message" htmlFor="message">
            <textarea id="message" name="message" rows={4} className={inputClass} placeholder="Tell us what you're looking for…" />
          </Field>
        </div>
      </div>

      {status === 'error' && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <CtaButton type="submit" size="lg" className="mt-6 w-full sm:w-auto" disabled={status === 'submitting'}>
        {status === 'submitting' && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </CtaButton>

      <p className="mt-3 text-xs text-muted">
        By submitting, you agree to be contacted by NACHIYAR CHIT &amp; FINANCE regarding your enquiry.
      </p>
    </form>
  );
}

function Field({ label, htmlFor, required, children }: { label: string; htmlFor: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
        {label} {required && <span className="text-brand">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass = cn(
  'w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70',
  'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
);
