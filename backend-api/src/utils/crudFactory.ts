import { Router, Request, Response } from 'express';
import { ZodType } from 'zod';
import { query } from '@/db/pool';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { paginationQuerySchema, safeSortColumn, buildPaginationMeta } from '@/utils/pagination';
import { NotFoundError } from '@/utils/errors';

export interface CrudConfig {
  /** Permission module name, e.g. 'branches'. Maps to authorize(module, action). */
  permissionModule: string;
  table: string;
  /** Columns returned to the client. Keep password/hash-type columns out at this layer. */
  selectColumns: string[];
  /** Columns eligible for ILIKE search via ?search=. */
  searchableColumns: string[];
  /** Columns eligible for ?sortBy=. */
  sortableColumns: string[];
  defaultSort: string;
  softDelete: boolean;
  createSchema: ZodType;
  updateSchema: ZodType;
}

/**
 * Builds a Router exposing GET (list), GET /:id, POST, PATCH /:id, DELETE
 * /:id for a single table, with pagination/search/sort, RBAC, and
 * (optionally) soft delete. Used for modules whose business logic is
 * genuinely just CRUD (branches, staff profile fields, chit_schemes,
 * notifications-read, whatsapp_templates). Modules with real workflow
 * logic (payments, auctions, leads conversion, customer aggregation)
 * have their own hand-written service instead of this factory.
 */
export function createCrudRouter(cfg: CrudConfig): Router {
  const router = Router();
  const idColumn = 'id';
  const deletedClause = cfg.softDelete ? 'AND deleted_at IS NULL' : '';

  router.get(
    '/',
    authenticate,
    authorize(cfg.permissionModule, 'read'),
    validate({ query: paginationQuerySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { page, pageSize, search, sortBy, sortDir } = req.query as unknown as {
        page: number;
        pageSize: number;
        search?: string;
        sortBy?: string;
        sortDir: 'asc' | 'desc';
      };

      const whereClauses: string[] = [];
      const params: unknown[] = [];

      if (cfg.softDelete) whereClauses.push('deleted_at IS NULL');

      if (search && cfg.searchableColumns.length > 0) {
        params.push(`%${search}%`);
        const idx = params.length;
        whereClauses.push('(' + cfg.searchableColumns.map((c) => `${c} ILIKE $${idx}`).join(' OR ') + ')');
      }

      const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const sortColumn = safeSortColumn(sortBy, cfg.sortableColumns, cfg.defaultSort);

      const countResult = await query<{ count: string }>(`SELECT count(*) FROM ${cfg.table} ${whereSql}`, params);
      const totalItems = parseInt(countResult.rows[0].count, 10);

      const limit = pageSize;
      const offset = (page - 1) * pageSize;
      const dataParams = [...params, limit, offset];
      const dataResult = await query(
        `SELECT ${cfg.selectColumns.join(', ')} FROM ${cfg.table} ${whereSql}
         ORDER BY ${sortColumn} ${sortDir.toUpperCase()}
         LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
        dataParams,
      );

      res.status(200).json({ data: dataResult.rows, meta: buildPaginationMeta(page, pageSize, totalItems) });
    }),
  );

  router.get(
    '/:id',
    authenticate,
    authorize(cfg.permissionModule, 'read'),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await query(
        `SELECT ${cfg.selectColumns.join(', ')} FROM ${cfg.table} WHERE ${idColumn} = $1 ${deletedClause}`,
        [(req.params.id as string)],
      );
      if (!result.rows[0]) throw new NotFoundError(cfg.table);
      res.status(200).json({ data: result.rows[0] });
    }),
  );

  router.post(
    '/',
    authenticate,
    authorize(cfg.permissionModule, 'write'),
    validate({ body: cfg.createSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const columns = Object.keys(req.body);
      const values = Object.values(req.body);
      const placeholders = columns.map((_, i) => `$${i + 1}`);
      const result = await query(
        `INSERT INTO ${cfg.table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})
         RETURNING ${cfg.selectColumns.join(', ')}`,
        values,
      );
      res.status(201).json({ data: result.rows[0] });
    }),
  );

  router.patch(
    '/:id',
    authenticate,
    authorize(cfg.permissionModule, 'write'),
    validate({ body: cfg.updateSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const columns = Object.keys(req.body);
      if (columns.length === 0) {
        const existing = await query(
          `SELECT ${cfg.selectColumns.join(', ')} FROM ${cfg.table} WHERE ${idColumn} = $1 ${deletedClause}`,
          [(req.params.id as string)],
        );
        if (!existing.rows[0]) throw new NotFoundError(cfg.table);
        res.status(200).json({ data: existing.rows[0] });
        return;
      }
      const values = Object.values(req.body);
      const setSql = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
      const result = await query(
        `UPDATE ${cfg.table} SET ${setSql} WHERE ${idColumn} = $${columns.length + 1} ${deletedClause}
         RETURNING ${cfg.selectColumns.join(', ')}`,
        [...values, (req.params.id as string)],
      );
      if (!result.rows[0]) throw new NotFoundError(cfg.table);
      res.status(200).json({ data: result.rows[0] });
    }),
  );

  router.delete(
    '/:id',
    authenticate,
    authorize(cfg.permissionModule, 'delete'),
    asyncHandler(async (req: Request, res: Response) => {
      const sql = cfg.softDelete
        ? `UPDATE ${cfg.table} SET deleted_at = now() WHERE ${idColumn} = $1 AND deleted_at IS NULL RETURNING ${idColumn}`
        : `DELETE FROM ${cfg.table} WHERE ${idColumn} = $1 RETURNING ${idColumn}`;
      const result = await query(sql, [(req.params.id as string)]);
      if (!result.rows[0]) throw new NotFoundError(cfg.table);
      res.status(204).send();
    }),
  );

  return router;
}
