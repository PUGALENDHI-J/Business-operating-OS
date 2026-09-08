import type { Faq, PublicScheme } from './types';

export const demoSchemes: PublicScheme[] = [
  {
    id: 'demo-silver-1', name: 'Silver Scheme - 1', slug: 'silver-scheme-1', scheme_code: 'SILVER-1',
    chit_amount: '25000.00', member_count: 10, duration_periods: 10, frequency: 'monthly', installment_amount: '2500.00',
    short_description: 'A simple monthly savings plan for first-time members.', highlights: ['10 monthly installments', 'Transparent auction process', 'Local branch support'], hero_image_url: null, is_featured: false,
  },
  {
    id: 'demo-gold-a1', name: 'Gold Scheme - A1 (1L)', slug: 'gold-scheme-a1-1l', scheme_code: 'GOLD-A1-1L',
    chit_amount: '100000.00', member_count: 10, duration_periods: 10, frequency: 'monthly', installment_amount: '10000.00',
    short_description: 'A popular monthly scheme for disciplined savings and planned credit.', highlights: ['1 lakh chit value', '10 members', 'Monthly auction cycle'], hero_image_url: null, is_featured: true,
  },
  {
    id: 'demo-platinum', name: 'Platinum Scheme (25L)', slug: 'platinum-scheme-25l', scheme_code: 'PLATINUM-25L',
    chit_amount: '2500000.00', member_count: 50, duration_periods: 50, frequency: 'monthly', installment_amount: '50000.00',
    short_description: 'A higher-value scheme for established savings goals.', highlights: ['25 lakh chit value', '50 monthly cycles', 'Dedicated support'], hero_image_url: null, is_featured: false,
  },
];

export const demoFaqs: Faq[] = [
  { id: 'demo-faq-1', question: 'What is a chit fund with NACHIYAR?', answer: 'A chit is a group savings and credit scheme where members contribute a fixed amount each cycle and one member receives the pooled amount through a schedule or auction.' },
  { id: 'demo-faq-2', question: 'How does the auction process work?', answer: 'Members can participate in a transparent live auction. Bids may go up to 30% of the chit value, with a formal 5% commission as per company policy.' },
  { id: 'demo-faq-3', question: 'Where is NACHIYAR located?', answer: 'NACHIYAR CHIT & FINANCE PVT LTD is located in Velpadi, Vellore, Tamil Nadu. Call 9043420099 or use the enquiry form.' },
];
