import { PoolClient } from 'pg';
import { query, withTransaction } from '@/db/pool';
import { NotFoundError, ConflictError } from '@/utils/errors';
import { PaginationQuery, buildPaginationMeta, safeSortColumn } from '@/utils/pagination';

const SELECT = `
  p.id, p.amount, p.payment_method, p.reference_number, p.payment_date, p.status, p.notes,
  p.installment_id, i.cycle_number, i.due_amount, i.due_date,
  p.chit_member_id, c.full_name AS customer_name, cg.group_code, cs.name AS scheme_name,
  p.collected_by, su.full_name AS collected_by_name,
  pr.receipt_number,
  p.created_at`;
const FROM = `
  FROM payments p
  JOIN installments i ON i.id = p.installment_id
  JOIN chit_members cm ON cm.id = p.chit_member_id
  JOIN customers c ON c.id = cm.customer_id
  JOIN chit_groups cg ON cg.id = cm.chit_group_id
  JOIN chit_schemes cs ON cs.id = cg.scheme_id
  LEFT JOIN staff st ON st.id = p.collected_by
  LEFT JOIN users su ON su.id = st.user_id
  LEFT JOIN payment_receipts pr ON pr.payment_id = p.id`;
const SORTABLE = ['payment_date', 'amount', 'created_at'];

export async function listPayments(
  q: PaginationQuery & { status?: string; chitMemberId?: string; fromDate?: string; toDate?: string },
) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (q.status) { params.push(q.status); where.push(`p.status = $${params.length}`); }
  if (q.chitMemberId) { params.push(q.chitMemberId); where.push(`p.chit_member_id = $${params.length}`); }
  if (q.fromDate) { params.push(q.fromDate); where.push(`p.payment_date >= $${params.length}`); }
  if (q.toDate) { params.push(q.toDate); where.push(`p.payment_date <= $${params.length}`); }
  if (q.search) { params.push(`%${q.search}%`); where.push(`(c.full_name ILIKE $${params.length} OR p.reference_number ILIKE $${params.length})`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortColumn = 'p.' + safeSortColumn(q.sortBy, SORTABLE, 'payment_date');

  const countResult = await query<{ count: string }>(`SELECT count(*) ${FROM} ${whereSql}`, params);
  const dataParams = [...params, q.pageSize, (q.page - 1) * q.pageSize];
  const dataResult = await query(
    `SELECT ${SELECT} ${FROM} ${whereSql} ORDER BY ${sortColumn} ${q.sortDir.toUpperCase()} LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );
  return { data: dataResult.rows, meta: buildPaginationMeta(q.page, q.pageSize, parseInt(countResult.rows[0].count, 10)) };
}

export async function getPaymentById(id: string) {
  const result = await query(`SELECT ${SELECT} ${FROM} WHERE p.id = $1`, [id]);
  if (!result.rows[0]) throw new NotFoundError('Payment');
  return result.rows[0];
}

async function nextReceiptNumber(client: PoolClient): Promise<string> {
  const result = await client.query<{ count: string }>(`SELECT count(*) FROM payment_receipts`);
  const n = parseInt(result.rows[0].count, 10) + 1;
  return `RCPT-${String(n).padStart(6, '0')}`;
}

interface RecordPaymentInput {
  installment_id: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  payment_date?: string;
  notes?: string;
}

/**
 * Records a payment against an installment. Runs as a single transaction:
 * 1. Lock the installment row (FOR UPDATE) so two concurrent payments
 *    against the same installment can't both pass the "won't exceed due
 *    amount" check.
 * 2. Insert the payment.
 * 3. Update installment.paid_amount and derive its status.
 * 4. Generate a receipt.
 * Staff performing the collection is taken from the authenticated user's
 * linked staff profile — passed in by the route handler, not the client.
 */
export async function recordPayment(input: RecordPaymentInput, collectedByStaffId: string | null) {
  const paymentId = await withTransaction(async (client: PoolClient) => {
    const instResult = await client.query<{
      id: string; chit_member_id: string; due_amount: string; paid_amount: string; status: string;
    }>(`SELECT id, chit_member_id, due_amount, paid_amount, status FROM installments WHERE id = $1 FOR UPDATE`, [input.installment_id]);
    const installment = instResult.rows[0];
    if (!installment) throw new NotFoundError('Installment');

    const dueAmount = parseFloat(installment.due_amount);
    const alreadyPaid = parseFloat(installment.paid_amount);
    const newPaidAmount = alreadyPaid + input.amount;

    if (newPaidAmount > dueAmount) {
      throw new ConflictError(
        `Payment of ${input.amount} would exceed the remaining balance of ${(dueAmount - alreadyPaid).toFixed(2)} on this installment`,
      );
    }

    const paymentResult = await client.query<{ id: string }>(
      `INSERT INTO payments (installment_id, chit_member_id, amount, payment_method, reference_number, payment_date, status, collected_by, notes)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()), 'success', $7, $8) RETURNING id`,
      [
        installment.id, installment.chit_member_id, input.amount, input.payment_method,
        input.reference_number ?? null, input.payment_date ?? null, collectedByStaffId, input.notes ?? null,
      ],
    );
    const paymentId = paymentResult.rows[0].id;

    const newStatus = newPaidAmount >= dueAmount ? 'paid' : 'partial';
    await client.query(`UPDATE installments SET paid_amount = $1, status = $2 WHERE id = $3`, [newPaidAmount, newStatus, installment.id]);

    const receiptNumber = await nextReceiptNumber(client);
    await client.query(
      `INSERT INTO payment_receipts (payment_id, receipt_number, issued_by) VALUES ($1, $2, $3)`,
      [paymentId, receiptNumber, collectedByStaffId],
    );

    return paymentId;
  });

  // Read AFTER commit — see the comment in chit-members.service.ts for why
  // this can't be the pool-backed getPaymentById called from inside the
  // transaction above.
  return getPaymentById(paymentId);
}

/**
 * Reverses a payment: marks it `reversed` (never deleted — see Phase 2
 * design notes), and rolls back the installment's paid_amount/status to
 * reflect the reversal, all in one transaction.
 */
export async function reversePayment(paymentId: string, reason: string) {
  await withTransaction(async (client: PoolClient) => {
    const paymentResult = await client.query<{ id: string; installment_id: string; amount: string; status: string; notes: string | null }>(
      `SELECT id, installment_id, amount, status, notes FROM payments WHERE id = $1 FOR UPDATE`,
      [paymentId],
    );
    const payment = paymentResult.rows[0];
    if (!payment) throw new NotFoundError('Payment');
    if (payment.status !== 'success') throw new ConflictError(`Only successful payments can be reversed (current status: ${payment.status})`);

    await client.query(
      `UPDATE payments SET status = 'reversed', notes = COALESCE(notes || ' | ', '') || $1 WHERE id = $2`,
      [`Reversed: ${reason}`, paymentId],
    );

    const instResult = await client.query<{ paid_amount: string; due_amount: string }>(
      `SELECT paid_amount, due_amount FROM installments WHERE id = $1 FOR UPDATE`,
      [payment.installment_id],
    );
    const installment = instResult.rows[0];
    const newPaidAmount = Math.max(0, parseFloat(installment.paid_amount) - parseFloat(payment.amount));
    const newStatus = newPaidAmount <= 0 ? 'pending' : newPaidAmount >= parseFloat(installment.due_amount) ? 'paid' : 'partial';
    await client.query(`UPDATE installments SET paid_amount = $1, status = $2 WHERE id = $3`, [newPaidAmount, newStatus, payment.installment_id]);
  });

  return getPaymentById(paymentId);
}
