import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '@/db/pool';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validate';
import { NotFoundError } from '@/utils/errors';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';
import { publicLeadSchema } from './public.schema';

const router = Router();

// ---------------------------------------------------------------------
// GET /public/chit-schemes — website scheme catalogue.
// Only returns schemes marked show_on_website=true, and only the columns
// safe/appropriate for public display (no internal ids beyond what's
// needed to link to the detail page, no soft-deleted rows).
// ---------------------------------------------------------------------
const SCHEME_SELECT = `
  id, name, slug, scheme_code, chit_amount, member_count, duration_periods, frequency,
  installment_amount, short_description, highlights, hero_image_url, is_featured`;

router.get(
  '/chit-schemes',
  asyncHandler(async (_req, res) => {
    const result = await query(
      `SELECT ${SCHEME_SELECT} FROM chit_schemes
        WHERE is_active = TRUE AND show_on_website = TRUE AND deleted_at IS NULL
        ORDER BY display_order ASC, name ASC`,
    );
    res.status(200).json({ data: result.rows });
  }),
);

router.get(
  '/chit-schemes/:slug',
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT ${SCHEME_SELECT} FROM chit_schemes
        WHERE slug = $1 AND is_active = TRUE AND show_on_website = TRUE AND deleted_at IS NULL`,
      [req.params.slug],
    );
    if (!result.rows[0]) throw new NotFoundError('Scheme');
    res.status(200).json({ data: result.rows[0] });
  }),
);

// ---------------------------------------------------------------------
// GET /public/faqs
// ---------------------------------------------------------------------
router.get(
  '/faqs',
  asyncHandler(async (_req, res) => {
    const result = await query(
      `SELECT id, question, answer FROM faqs WHERE is_published = TRUE ORDER BY display_order ASC`,
    );
    res.status(200).json({ data: result.rows });
  }),
);

// ---------------------------------------------------------------------
// POST /public/leads — the website's enquiry/apply form submission.
// This is the only public *write* endpoint in the entire API, so it
// gets its own, much tighter rate limit than even /auth/*, plus a
// honeypot check, on top of normal Zod validation.
// ---------------------------------------------------------------------
const publicLeadLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many submissions. Please try again later or call us directly.' } },
});

router.post(
  '/leads',
  publicLeadLimiter,
  validate({ body: publicLeadSchema }),
  asyncHandler(async (req, res) => {
    const { full_name, phone, email, interested_scheme_id, message, website } = req.body;

    if (website) {
      logger.warn({ ip: req.ip }, 'public.leads.honeypot_tripped');
      res.status(201).json({ data: { success: true } });
      return;
    }

    await query(
      `INSERT INTO leads (full_name, phone, email, source, interested_scheme_id, notes, status)
       VALUES ($1, $2, $3, 'website', $4, $5, 'new')`,
      [full_name, phone, email || null, interested_scheme_id || null, message || null],
    );

    logger.info({ phone }, 'public.leads.created');
    res.status(201).json({ data: { success: true } });
  }),
);

export default router;
