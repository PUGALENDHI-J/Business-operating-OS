'use client';

import { useEffect, useRef } from 'react';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { useFaqs } from '@/lib/use-public-data';

export function FaqListClient() {
  const { data: faqs, loading, error } = useFaqs();
  const injectedRef = useRef(false);

  useEffect(() => {
    if (!faqs || faqs.length === 0 || injectedRef.current) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
    document.head.appendChild(script);
    injectedRef.current = true;
    return () => {
      document.head.removeChild(script);
      injectedRef.current = false;
    };
  }, [faqs]);

  if (loading) return <LoadingState label="Loading FAQs…" />;
  if (error) return <ErrorState message="We're unable to load FAQs right now. Please contact us directly with any questions." />;
  if (!faqs || faqs.length === 0) {
    return <p className="text-sm text-muted">FAQ content is being prepared. Please contact us directly with any questions.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl divide-y divide-border rounded-2xl border border-border bg-white">
      {faqs.map((faq) => (
        <details key={faq.id} className="group p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground">
            {faq.question}
            <span className="ml-4 shrink-0 text-brand transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
