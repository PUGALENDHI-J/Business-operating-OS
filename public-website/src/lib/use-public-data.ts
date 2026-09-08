'use client';

import { useEffect, useState } from 'react';
import type { PublicScheme, Faq } from './types';
import { demoFaqs, demoSchemes } from './demo-data';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

function useClientFetch<T>(path: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: false });

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/public${path}`)
      .then((res) => {
        if (!res.ok) throw new Error('Request failed');
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setState({ data: json.data, loading: false, error: false });
      })
      .catch(() => {
        if (!cancelled) {
          const demoData = path === '/faqs'
            ? demoFaqs
            : path.startsWith('/chit-schemes/')
              ? demoSchemes.find((scheme) => scheme.slug === path.split('/').pop()) ?? demoSchemes[0]
              : demoSchemes;
          setState({ data: demoData as T, loading: false, error: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}

export function useSchemes(): FetchState<PublicScheme[]> {
  return useClientFetch<PublicScheme[]>('/chit-schemes');
}

export function useScheme(slug: string): FetchState<PublicScheme> {
  return useClientFetch<PublicScheme>(`/chit-schemes/${slug}`);
}

export function useFaqs(): FetchState<Faq[]> {
  return useClientFetch<Faq[]>('/faqs');
}
