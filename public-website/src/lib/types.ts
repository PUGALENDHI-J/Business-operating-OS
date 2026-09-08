export interface PublicScheme {
  id: string;
  name: string;
  slug: string;
  scheme_code: string;
  chit_amount: string;
  member_count: number;
  duration_periods: number;
  frequency: 'weekly' | 'monthly';
  installment_amount: string;
  short_description: string | null;
  highlights: string[];
  hero_image_url: string | null;
  is_featured: boolean;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
}
