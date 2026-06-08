import crypto from 'node:crypto';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { pool, initDb } from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

initDb().catch(err => {
  console.error('Could not initialize DB on startup:', err);
});

type Role = 'owner' | 'worker';

type SessionUser = {
  username: string;
  role: Role;
};

type AuthenticatedRequest = Request & {
  user?: SessionUser;
};

const SESSION_COOKIE = 'ration_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const SESSION_SECRET = process.env.SESSION_SECRET || 'local-ration-shop-session-secret';

const users: Array<SessionUser & { password: string }> = [
  {
    username: process.env.OWNER_USER || '123456',
    password: process.env.OWNER_PASSWORD || 'Mahesh@123',
    role: 'owner',
  },
  {
    username: process.env.WORKER_USER || '123456',
    password: process.env.WORKER_PASSWORD || '123456',
    role: 'worker',
  },
];

const parseCookies = (header?: string) => {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  for (const pair of header.split(';')) {
    const index = pair.indexOf('=');
    if (index === -1) continue;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }

  return cookies;
};

const signPayload = (payload: string) =>
  crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');

const createSessionToken = (user: SessionUser) => {
  const payload = Buffer.from(
    JSON.stringify({
      username: user.username,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    })
  ).toString('base64url');
  return `${payload}.${signPayload(payload)}`;
};

const readSessionUser = (req: Request): SessionUser | null => {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature || signPayload(payload) !== signature) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      username: string;
      role: Role;
      exp: number;
    };

    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    if (!users.some(user => user.username === decoded.username && user.role === decoded.role)) {
      return null;
    }

    return { username: decoded.username, role: decoded.role };
  } catch {
    return null;
  }
};

const setSessionCookie = (res: Response, token: string) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`
  );
};

const clearSessionCookie = (res: Response) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
  );
};

const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = readSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  req.user = user;
  next();
};

const requireRole =
  (...roles: Role[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user || readSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: 'You do not have permission for this action' });
      return;
    }
    req.user = user;
    next();
  };

const isValidMonth = (month: unknown) => typeof month === 'string' && /^\d{4}-\d{2}$/.test(month);

const getRouteParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || '' : value || '';

const parseNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const kgFromInput = (amount: unknown, measure: unknown) => {
  const parsed = parseNumber(amount);
  if (!Number.isFinite(parsed) || parsed < 0) return NaN;
  return measure === 'quintal' ? parsed * 100 : parsed;
};

const numeric = (value: unknown) => Number(value || 0);

type DbRow = Record<string, unknown>;

const mapCardHolder = (row: DbRow) => ({
  cardNo: String(row.card_no || ''),
  cardType: String(row.card_type || ''),
  isActive: Boolean(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapIssue = (row: DbRow) => ({
  id: String(row.id || ''),
  cardNo: String(row.card_no || ''),
  month: String(row.month || ''),
  unit: numeric(row.unit),
  riceKg: numeric(row.rice_kg),
  ragiKg: numeric(row.ragi_kg),
  status: row.status as 'issued' | 'distributed',
  issuedAt: String(row.issued_at || ''),
  issuedBy: String(row.issued_by || ''),
  distributedAt: row.distributed_at ? String(row.distributed_at) : null,
  distributedBy: row.distributed_by ? String(row.distributed_by) : null,
  cardType: String(row.card_type || ''),
});

const getInventorySnapshot = async (client: typeof pool, month: string) => {
  const inventoryResult = await client.query(
    'SELECT * FROM inventory_months WHERE month = $1',
    [month]
  );
  const totals = inventoryResult.rows[0] || {
    month,
    rice_total_kg: 0,
    ragi_total_kg: 0,
  };
  const distributedResult = await client.query(
    `
      SELECT
        COALESCE(SUM(rice_kg), 0) AS rice_distributed_kg,
        COALESCE(SUM(ragi_kg), 0) AS ragi_distributed_kg,
        COUNT(*) AS distributed_count
      FROM ration_issues
      WHERE month = $1 AND status = 'distributed'
    `,
    [month]
  );
  const distributed = distributedResult.rows[0] || {};
  const riceTotalKg = numeric(totals.rice_total_kg);
  const ragiTotalKg = numeric(totals.ragi_total_kg);
  const riceDistributedKg = numeric(distributed.rice_distributed_kg);
  const ragiDistributedKg = numeric(distributed.ragi_distributed_kg);

  return {
    month,
    riceTotalKg,
    ragiTotalKg,
    riceDistributedKg,
    ragiDistributedKg,
    riceRemainingKg: riceTotalKg - riceDistributedKg,
    ragiRemainingKg: ragiTotalKg - ragiDistributedKg,
    distributedCount: Number(distributed.distributed_count || 0),
  };
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    candidate => candidate.username === username && candidate.password === password
  );

  if (!user) {
    res.status(401).json({ error: 'Invalid user id or password' });
    return;
  }

  const sessionUser: SessionUser = { username: user.username, role: user.role };
  setSessionCookie(res, createSessionToken(sessionUser));
  res.json({ user: sessionUser });
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: readSessionUser(req) });
});

app.get('/api/card-holders', requireAuth, requireRole('owner'), async (req: AuthenticatedRequest, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const includeInactive = req.query.includeInactive === 'true';
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const params: unknown[] = [];
  const where: string[] = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(card_no ILIKE $${params.length} OR COALESCE(card_type, '') ILIKE $${params.length})`);
  }

  if (!includeInactive) {
    where.push('is_active = TRUE');
  }

  params.push(limit);
  const query = `
    SELECT *
    FROM card_holders
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY card_no ASC
    LIMIT $${params.length}
  `;

  try {
    const result = await pool.query(query, params);
    res.json(result.rows.map(mapCardHolder));
  } catch (err) {
    const error = err as Error;
    console.error('Error fetching card holders:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/card-holders/:cardNo', requireAuth, requireRole('owner'), async (req, res) => {
  const cardNo = getRouteParam(req.params.cardNo);
  try {
    const result = await pool.query('SELECT * FROM card_holders WHERE card_no = $1', [
      cardNo,
    ]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Card holder not found' });
      return;
    }

    res.json(mapCardHolder(result.rows[0]));
  } catch (err) {
    const error = err as Error;
    console.error('Error fetching card holder:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/card-holders', requireAuth, requireRole('owner'), async (req, res) => {
  const { cardNo, cardType = '', isActive = true } = req.body;

  if (!cardNo || !/^\d{6,20}$/.test(String(cardNo))) {
    res.status(400).json({ error: 'A valid card number is required' });
    return;
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO card_holders (
          card_no,
          card_type,
          is_active
        )
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [String(cardNo), cardType, Boolean(isActive)]
    );
    res.status(201).json(mapCardHolder(result.rows[0]));
  } catch (err) {
    const error = err as Error;
    console.error('Error creating card holder:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/card-holders/:cardNo', requireAuth, requireRole('owner'), async (req, res) => {
  const originalCardNo = getRouteParam(req.params.cardNo);
  const { cardNo, cardType = '', isActive = true } = req.body;
  const nextCardNo = String(cardNo || originalCardNo);

  if (!/^\d{6,20}$/.test(nextCardNo)) {
    res.status(400).json({ error: 'A valid card number is required' });
    return;
  }

  try {
    const result = await pool.query(
      `
        UPDATE card_holders
        SET
          card_no = $1,
          card_type = $2,
          is_active = $3,
          updated_at = NOW()
        WHERE card_no = $4
        RETURNING *
      `,
      [nextCardNo, cardType, Boolean(isActive), originalCardNo]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Card holder not found' });
      return;
    }

    res.json(mapCardHolder(result.rows[0]));
  } catch (err) {
    const error = err as Error;
    console.error('Error updating card holder:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inventory/:month', requireAuth, requireRole('owner'), async (req, res) => {
  const month = getRouteParam(req.params.month);
  if (!isValidMonth(month)) {
    res.status(400).json({ error: 'Month must be in YYYY-MM format' });
    return;
  }

  try {
    const snapshot = await getInventorySnapshot(pool, month);
    res.json(snapshot);
  } catch (err) {
    const error = err as Error;
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/inventory/:month', requireAuth, requireRole('owner'), async (req, res) => {
  const month = getRouteParam(req.params.month);
  if (!isValidMonth(month)) {
    res.status(400).json({ error: 'Month must be in YYYY-MM format' });
    return;
  }

  const riceKg = kgFromInput(
    req.body.riceAmount ?? req.body.riceKg,
    req.body.riceMeasure ?? 'kg'
  );
  const ragiKg = kgFromInput(
    req.body.ragiAmount ?? req.body.ragiKg,
    req.body.ragiMeasure ?? 'kg'
  );

  if (!Number.isFinite(riceKg) || !Number.isFinite(ragiKg)) {
    res.status(400).json({ error: 'Inventory quantities must be zero or greater' });
    return;
  }

  try {
    await pool.query(
      `
        INSERT INTO inventory_months (month, rice_total_kg, ragi_total_kg)
        VALUES ($1, $2, $3)
        ON CONFLICT (month) DO UPDATE SET
          rice_total_kg = EXCLUDED.rice_total_kg,
          ragi_total_kg = EXCLUDED.ragi_total_kg,
          updated_at = NOW()
      `,
      [month, riceKg, ragiKg]
    );

    const snapshot = await getInventorySnapshot(pool, month);
    res.json(snapshot);
  } catch (err) {
    const error = err as Error;
    console.error('Error saving inventory:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/issues', requireAuth, async (req: AuthenticatedRequest, res) => {
  const month = typeof req.query.month === 'string' ? req.query.month : '';
  const search = typeof req.query.cardNo === 'string' ? req.query.cardNo.trim() : '';
  const requestedStatus = typeof req.query.status === 'string' ? req.query.status : '';

  if (!isValidMonth(month)) {
    res.status(400).json({ error: 'Month must be in YYYY-MM format' });
    return;
  }

  const params: unknown[] = [month];
  const where = ['ri.month = $1'];

  if (req.user?.role === 'worker') {
    where.push(`ri.status = 'issued'`);
  } else if (requestedStatus === 'issued' || requestedStatus === 'distributed') {
    params.push(requestedStatus);
    where.push(`ri.status = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    where.push(`ri.card_no ILIKE $${params.length}`);
  }

  try {
    const result = await pool.query(
      `
        SELECT
          ri.*,
          ch.card_type
        FROM ration_issues ri
        LEFT JOIN card_holders ch ON ch.card_no = ri.card_no
        WHERE ${where.join(' AND ')}
        ORDER BY ri.issued_at DESC
      `,
      params
    );
    res.json(result.rows.map(mapIssue));
  } catch (err) {
    const error = err as Error;
    console.error('Error fetching issues:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/issues', requireAuth, requireRole('owner'), async (req: AuthenticatedRequest, res) => {
  const { cardNo, month, unit, riceKg, ragiKg } = req.body;
  const parsedUnit = parseNumber(unit);
  const parsedRice = parseNumber(riceKg);
  const parsedRagi = parseNumber(ragiKg);

  if (!cardNo || !isValidMonth(month)) {
    res.status(400).json({ error: 'Card number and valid month are required' });
    return;
  }
  if (
    !Number.isFinite(parsedUnit) ||
    !Number.isFinite(parsedRice) ||
    !Number.isFinite(parsedRagi) ||
    parsedUnit < 0 ||
    parsedRice < 0 ||
    parsedRagi < 0
  ) {
    res.status(400).json({ error: 'Unit, rice kg, and ragi kg must be zero or greater' });
    return;
  }
  if (parsedRice === 0 && parsedRagi === 0) {
    res.status(400).json({ error: 'Enter rice kg or ragi kg before issuing ration' });
    return;
  }

  try {
    const cardResult = await pool.query(
      'SELECT card_no FROM card_holders WHERE card_no = $1 AND is_active = TRUE',
      [cardNo]
    );
    if (cardResult.rowCount === 0) {
      res.status(404).json({ error: 'Active card holder not found' });
      return;
    }

    const duplicateResult = await pool.query(
      'SELECT COUNT(*) AS count FROM ration_issues WHERE card_no = $1 AND month = $2',
      [cardNo, month]
    );
    const duplicateWarning = Number(duplicateResult.rows[0]?.count || 0) > 0;

    const id = crypto.randomUUID();
    const result = await pool.query(
      `
        INSERT INTO ration_issues (
          id,
          card_no,
          month,
          unit,
          rice_kg,
          ragi_kg,
          issued_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [id, cardNo, month, parsedUnit, parsedRice, parsedRagi, req.user?.username || 'owner']
    );

    const issueResult = await pool.query(
      `
        SELECT
          ri.*,
          ch.card_type
        FROM ration_issues ri
        LEFT JOIN card_holders ch ON ch.card_no = ri.card_no
        WHERE ri.id = $1
      `,
      [result.rows[0].id]
    );

    res.status(201).json({
      issue: mapIssue(issueResult.rows[0]),
      duplicateWarning,
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error creating issue:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/issues/:id', requireAuth, requireRole('owner'), async (req, res) => {
  const issueId = getRouteParam(req.params.id);
  const { cardNo, month, unit, riceKg, ragiKg } = req.body;
  const parsedUnit = parseNumber(unit);
  const parsedRice = parseNumber(riceKg);
  const parsedRagi = parseNumber(ragiKg);

  if (!cardNo || !isValidMonth(month)) {
    res.status(400).json({ error: 'Card number and valid month are required' });
    return;
  }
  if (
    !Number.isFinite(parsedUnit) ||
    !Number.isFinite(parsedRice) ||
    !Number.isFinite(parsedRagi) ||
    parsedUnit < 0 ||
    parsedRice < 0 ||
    parsedRagi < 0
  ) {
    res.status(400).json({ error: 'Unit, rice kg, and ragi kg must be zero or greater' });
    return;
  }

  try {
    const duplicateResult = await pool.query(
      `
        SELECT COUNT(*) AS count
        FROM ration_issues
        WHERE card_no = $1 AND month = $2 AND id <> $3
      `,
      [cardNo, month, issueId]
    );
    const duplicateWarning = Number(duplicateResult.rows[0]?.count || 0) > 0;

    const result = await pool.query(
      `
        UPDATE ration_issues
        SET
          card_no = $1,
          month = $2,
          unit = $3,
          rice_kg = $4,
          ragi_kg = $5,
          updated_at = NOW()
        WHERE id = $6 AND status = 'issued'
        RETURNING *
      `,
      [cardNo, month, parsedUnit, parsedRice, parsedRagi, issueId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Editable issued record not found' });
      return;
    }

    const issueResult = await pool.query(
      `
        SELECT
          ri.*,
          ch.card_type
        FROM ration_issues ri
        LEFT JOIN card_holders ch ON ch.card_no = ri.card_no
        WHERE ri.id = $1
      `,
      [issueId]
    );

    res.json({
      issue: mapIssue(issueResult.rows[0]),
      duplicateWarning,
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error updating issue:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/issues/month/:month', requireAuth, requireRole('owner'), async (req, res) => {
  const month = getRouteParam(req.params.month);
  if (!isValidMonth(month)) {
    res.status(400).json({ error: 'Month must be in YYYY-MM format' });
    return;
  }

  try {
    const result = await pool.query(
      'DELETE FROM ration_issues WHERE month = $1 RETURNING id',
      [month]
    );

    res.json({ success: true, deletedCount: result.rowCount || 0 });
  } catch (err) {
    const error = err as Error;
    console.error('Error clearing monthly issues:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/issues/:id', requireAuth, requireRole('owner'), async (req, res) => {
  const issueId = getRouteParam(req.params.id);
  try {
    const result = await pool.query(
      "DELETE FROM ration_issues WHERE id = $1 AND status = 'issued' RETURNING id",
      [issueId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Deletable issued record not found' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    console.error('Error deleting issue:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/issues/history/:cardNo', requireAuth, requireRole('owner'), async (req, res) => {
  const cardNo = getRouteParam(req.params.cardNo);
  try {
    const result = await pool.query(
      `
        SELECT
          ri.*,
          ch.card_type
        FROM ration_issues ri
        LEFT JOIN card_holders ch ON ch.card_no = ri.card_no
        WHERE ri.card_no = $1
        ORDER BY ri.month DESC, ri.issued_at DESC
      `,
      [cardNo]
    );
    res.json(result.rows.map(mapIssue));
  } catch (err) {
    const error = err as Error;
    console.error('Error fetching card history:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/issues/:id/distribute', requireAuth, requireRole('worker'), async (req: AuthenticatedRequest, res) => {
  const issueId = getRouteParam(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const issueResult = await client.query(
      "SELECT * FROM ration_issues WHERE id = $1 FOR UPDATE",
      [issueId]
    );

    if (issueResult.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Issued record not found' });
      return;
    }

    const issue = issueResult.rows[0];
    if (issue.status !== 'issued') {
      await client.query('ROLLBACK');
      res.status(409).json({ error: 'This card has already been distributed' });
      return;
    }

    const inventoryResult = await client.query(
      'SELECT * FROM inventory_months WHERE month = $1 FOR UPDATE',
      [issue.month]
    );

    if (inventoryResult.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Monthly stock has not been entered by owner' });
      return;
    }

    const snapshot = await getInventorySnapshot(client as unknown as typeof pool, issue.month);
    const riceNeeded = numeric(issue.rice_kg);
    const ragiNeeded = numeric(issue.ragi_kg);

    if (snapshot.riceRemainingKg < riceNeeded || snapshot.ragiRemainingKg < ragiNeeded) {
      await client.query('ROLLBACK');
      res.status(409).json({
        error: 'Not enough stock remaining for this distribution',
        inventory: snapshot,
      });
      return;
    }

    await client.query(
      `
        UPDATE ration_issues
        SET
          status = 'distributed',
          distributed_at = NOW(),
          distributed_by = $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [req.user?.username || 'worker', issueId]
    );

    await client.query('COMMIT');

    const updatedIssue = await pool.query(
      `
        SELECT
          ri.*,
          ch.card_type
        FROM ration_issues ri
        LEFT JOIN card_holders ch ON ch.card_no = ri.card_no
        WHERE ri.id = $1
      `,
      [issueId]
    );
    res.json({ issue: mapIssue(updatedIssue.rows[0]) });
  } catch (err) {
    await client.query('ROLLBACK');
    const error = err as Error;
    console.error('Error approving distribution:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

export default app;
