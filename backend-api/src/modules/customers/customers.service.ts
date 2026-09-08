import { query } from '@/db/pool';
import { NotFoundError } from '@/utils/errors';
import { PaginationQuery, buildPaginationMeta, safeSortColumn } from '@/utils/pagination';

const LIST_SELECT = `
  c.id, c.full_name, c.phone, c.email, c.city, c.state, c.kyc_status, c.is_active,
  c.branch_id, b.name AS branch_name,
  c.assigned_staff_id, su.full_name AS assigned_staff_name,
  c.created_at, c.updated_at`;

const SORTABLE = ['full_name', 'created_at', 'kyc_status'];

export async function listCustomers(q: PaginationQuery & { kycStatus?: string; branchId?: string }) {
  const where = ['c.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (q.kycStatus) { params.push(q.kycStatus); where.push(`c.kyc_status = $${params.length}`); }
  if (q.branchId) { params.push(q.branchId); where.push(`c.branch_id = $${params.length}`); }
  if (q.search) {
    params.push(`%${q.search}%`);
    where.push(`(c.full_name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const sortColumn = 'c.' + safeSortColumn(q.sortBy, SORTABLE, 'created_at');
  const from = `FROM customers c LEFT JOIN branches b ON b.id = c.branch_id LEFT JOIN staff st ON st.id = c.assigned_staff_id LEFT JOIN users su ON su.id = st.user_id`;

  const countResult = await query<{ count: string }>(`SELECT count(*) ${from} ${whereSql}`, params);
  const dataParams = [...params, q.pageSize, (q.page - 1) * q.pageSize];
  const dataResult = await query(
    `SELECT ${LIST_SELECT} ${from} ${whereSql} ORDER BY ${sortColumn} ${q.sortDir.toUpperCase()}
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );
  return { data: dataResult.rows, meta: buildPaginationMeta(q.page, q.pageSize, parseInt(countResult.rows[0].count, 10)) };
}

async function getCustomerCore(id: string) {
  const result = await query(
    `SELECT c.*, b.name AS branch_name, su.full_name AS assigned_staff_name
       FROM customers c
       LEFT JOIN branches b ON b.id = c.branch_id
       LEFT JOIN staff st ON st.id = c.assigned_staff_id
       LEFT JOIN users su ON su.id = st.user_id
      WHERE c.id = $1 AND c.deleted_at IS NULL`,
    [id],
  );
  if (!result.rows[0]) throw new NotFoundError('Customer');
  return result.rows[0];
}

export async function getCustomerById(id: string) {
  return getCustomerCore(id);
}

export async function createCustomer(input: Record<string, unknown>) {
  const columns = Object.keys(input);
  const values = Object.values(input);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  const result = await query<{ id: string }>(
    `INSERT INTO customers (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`,
    values,
  );
  return getCustomerCore(result.rows[0].id);
}

export async function updateCustomer(id: string, input: Record<string, unknown>) {
  const columns = Object.keys(input);
  if (columns.length === 0) return getCustomerCore(id);
  const values = Object.values(input);
  const setSql = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const result = await query(
    `UPDATE customers SET ${setSql} WHERE id = $${columns.length + 1} AND deleted_at IS NULL RETURNING id`,
    [...values, id],
  );
  if (!result.rows[0]) throw new NotFoundError('Customer');
  return getCustomerCore(id);
}

export async function deleteCustomer(id: string): Promise<void> {
  const result = await query(`UPDATE customers SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [id]);
  if (!result.rows[0]) throw new NotFoundError('Customer');
}

// ---------------------------------------------------------------------
// Profile sub-resources — matches the CRM customer detail page spec:
// Documents, Chit Memberships, Payment History, Outstanding Amount,
// Auction History, Follow-ups, WhatsApp History, Activity.
// ---------------------------------------------------------------------

export async function getCustomerDocuments(customerId: string) {
  await getCustomerCore(customerId); // 404s if customer doesn't exist
  const result = await query(
    `SELECT cd.id, cd.document_type, cd.file_url, cd.status, cd.rejection_reason,
            cd.verified_by, vu.full_name AS verified_by_name, cd.verified_at, cd.uploaded_at
       FROM customer_documents cd
       LEFT JOIN staff vs ON vs.id = cd.verified_by
       LEFT JOIN users vu ON vu.id = vs.user_id
      WHERE cd.customer_id = $1 AND cd.deleted_at IS NULL
      ORDER BY cd.uploaded_at DESC`,
    [customerId],
  );
  return result.rows;
}

export async function addCustomerDocument(customerId: string, documentType: string, fileUrl: string) {
  await getCustomerCore(customerId);
  const result = await query(
    `INSERT INTO customer_documents (customer_id, document_type, file_url) VALUES ($1, $2, $3)
     RETURNING id, document_type, file_url, status, uploaded_at`,
    [customerId, documentType, fileUrl],
  );
  return result.rows[0];
}

export async function reviewCustomerDocument(
  documentId: string,
  reviewerStaffId: string,
  status: 'verified' | 'rejected',
  rejectionReason?: string,
) {
  const result = await query(
    `UPDATE customer_documents
        SET status = $1, verified_by = $2, verified_at = now(), rejection_reason = $3
      WHERE id = $4 AND deleted_at IS NULL
      RETURNING id, document_type, file_url, status, rejection_reason, verified_at`,
    [status, reviewerStaffId, rejectionReason ?? null, documentId],
  );
  if (!result.rows[0]) throw new NotFoundError('Document');
  return result.rows[0];
}

export async function getCustomerMemberships(customerId: string) {
  await getCustomerCore(customerId);
  const result = await query(
    `SELECT cm.id, cm.member_serial_no, cm.status, cm.join_date, cm.exit_date,
            cg.id AS chit_group_id, cg.group_code, cg.status AS group_status, cg.start_date, cg.end_date,
            cs.name AS scheme_name, cs.chit_amount, cs.installment_amount, cs.frequency
       FROM chit_members cm
       JOIN chit_groups cg ON cg.id = cm.chit_group_id
       JOIN chit_schemes cs ON cs.id = cg.scheme_id
      WHERE cm.customer_id = $1 AND cm.deleted_at IS NULL
      ORDER BY cm.join_date DESC`,
    [customerId],
  );
  return result.rows;
}

export async function getCustomerPaymentHistory(customerId: string) {
  await getCustomerCore(customerId);
  const result = await query(
    `SELECT p.id, p.amount, p.payment_method, p.reference_number, p.payment_date, p.status,
            i.cycle_number, cg.group_code, cs.name AS scheme_name,
            pr.receipt_number
       FROM payments p
       JOIN installments i ON i.id = p.installment_id
       JOIN chit_members cm ON cm.id = p.chit_member_id
       JOIN chit_groups cg ON cg.id = cm.chit_group_id
       JOIN chit_schemes cs ON cs.id = cg.scheme_id
       LEFT JOIN payment_receipts pr ON pr.payment_id = p.id
      WHERE cm.customer_id = $1
      ORDER BY p.payment_date DESC`,
    [customerId],
  );
  return result.rows;
}

/** Sum of (due_amount - paid_amount) across every non-waived installment for this customer. */
export async function getCustomerOutstanding(customerId: string) {
  await getCustomerCore(customerId);
  const result = await query<{ outstanding: string; overdue: string }>(
    `SELECT
        COALESCE(SUM(i.due_amount - i.paid_amount) FILTER (WHERE i.status IN ('pending','partial','overdue')), 0) AS outstanding,
        COALESCE(SUM(i.due_amount - i.paid_amount) FILTER (WHERE i.status = 'overdue'), 0) AS overdue
       FROM installments i
       JOIN chit_members cm ON cm.id = i.chit_member_id
      WHERE cm.customer_id = $1`,
    [customerId],
  );
  return {
    outstandingAmount: parseFloat(result.rows[0].outstanding),
    overdueAmount: parseFloat(result.rows[0].overdue),
  };
}

export async function getCustomerAuctionHistory(customerId: string) {
  await getCustomerCore(customerId);
  const result = await query(
    `SELECT a.id, a.cycle_number, a.scheduled_at, a.status, a.winning_bid_percent, a.prize_amount,
            cg.group_code, cs.name AS scheme_name,
            (a.winning_member_id = cm.id) AS won_by_this_customer
       FROM auctions a
       JOIN chit_groups cg ON cg.id = a.chit_group_id
       JOIN chit_schemes cs ON cs.id = cg.scheme_id
       JOIN chit_members cm ON cm.chit_group_id = cg.id AND cm.customer_id = $1
      ORDER BY a.scheduled_at DESC`,
    [customerId],
  );
  return result.rows;
}

export async function getCustomerFollowups(customerId: string) {
  await getCustomerCore(customerId);
  const result = await query(
    `SELECT f.id, f.due_date, f.status, f.notes, f.completed_at,
            f.assigned_staff_id, su.full_name AS assigned_staff_name
       FROM followups f
       LEFT JOIN staff st ON st.id = f.assigned_staff_id
       LEFT JOIN users su ON su.id = st.user_id
      WHERE f.related_type = 'customer' AND f.related_id = $1 AND f.deleted_at IS NULL
      ORDER BY f.due_date DESC`,
    [customerId],
  );
  return result.rows;
}

export async function getCustomerWhatsappHistory(customerId: string) {
  await getCustomerCore(customerId);
  const result = await query(
    `SELECT wm.id, wm.recipient_phone, wm.status, wm.related_entity_type, wm.sent_at, wm.delivered_at, wm.read_at,
            wt.template_name
       FROM whatsapp_messages wm
       LEFT JOIN whatsapp_templates wt ON wt.id = wm.template_id
      WHERE wm.recipient_customer_id = $1
      ORDER BY wm.created_at DESC`,
    [customerId],
  );
  return result.rows;
}

export async function getCustomerActivity(customerId: string) {
  await getCustomerCore(customerId);
  const result = await query(
    `SELECT al.id, al.action, al.description, al.created_at, au.full_name AS actor_name
       FROM activity_logs al
       LEFT JOIN users au ON au.id = al.actor_user_id
      WHERE al.entity_type = 'customer' AND al.entity_id = $1
      ORDER BY al.created_at DESC
      LIMIT 100`,
    [customerId],
  );
  return result.rows;
}
