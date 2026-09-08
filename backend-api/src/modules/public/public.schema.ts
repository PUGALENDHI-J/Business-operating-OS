import { z } from 'zod';

export const publicLeadSchema = z.object({
  full_name: z.string().trim().min(1, 'Please enter your name').max(150),
  phone: z.string().trim().min(6, 'Please enter a valid phone number').max(20),
  email: z.string().trim().email('Please enter a valid email').optional().or(z.literal('')),
  interested_scheme_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  message: z.string().trim().max(2000).optional(),
  // Honeypot field: a real visitor never fills this in (it's visually
  // hidden on the website). Any non-empty value here means a bot filled
  // every field it could find. Deliberately NOT constrained to an empty
  // string here — the route handler decides what to do with a non-empty
  // value (pretend success, don't persist), rather than Zod rejecting it
  // with a validation error that would tip the bot off its guess was wrong.
  website: z.string().max(500).optional(),
});
