import express from 'express';
import cors from 'cors';
import { pool, initDb } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize database schema
initDb().catch(err => {
  console.error('Could not initialize DB on startup:', err);
});

// GET /api/transactions - Get all transactions ordered by date descending
app.get('/api/transactions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
    const txs = result.rows.map(row => {
      // Parse date to ISO format
      let formattedDate = row.date;
      if (row.date instanceof Date) {
        formattedDate = row.date.toISOString();
      } else if (row.date) {
        formattedDate = new Date(row.date).toISOString();
      }
      
      // Parse issue_date to YYYY-MM-DD
      let formattedIssueDate = row.issue_date;
      if (row.issue_date instanceof Date) {
        formattedIssueDate = row.issue_date.toISOString().split('T')[0];
      } else if (typeof row.issue_date === 'string') {
        formattedIssueDate = row.issue_date.split('T')[0];
      } else if (row.issue_date) {
        formattedIssueDate = new Date(row.issue_date).toISOString().split('T')[0];
      }

      return {
        id: row.id,
        cardNo: row.card_no,
        unit: parseFloat(row.unit),
        quantity: parseFloat(row.quantity),
        date: formattedDate,
        issueDate: formattedIssueDate,
        item: row.item,
      };
    });
    res.json(txs);
  } catch (err) {
    const error = err as Error;
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/transactions - Add a transaction
app.post('/api/transactions', async (req, res) => {
  const { id, cardNo, unit, quantity, date, issueDate, item } = req.body;
  try {
    const query = `
      INSERT INTO transactions (id, card_no, unit, quantity, date, issue_date, item)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [id, cardNo, unit, quantity, date, issueDate, item]);
    const row = result.rows[0];
    
    let formattedDate = row.date;
    if (row.date instanceof Date) {
      formattedDate = row.date.toISOString();
    }
    
    let formattedIssueDate = row.issue_date;
    if (row.issue_date instanceof Date) {
      formattedIssueDate = row.issue_date.toISOString().split('T')[0];
    }

    res.status(201).json({
      id: row.id,
      cardNo: row.card_no,
      unit: parseFloat(row.unit),
      quantity: parseFloat(row.quantity),
      date: formattedDate,
      issueDate: formattedIssueDate,
      item: row.item,
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/transactions/:id - Delete a transaction
app.delete('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/transactions/delete-bulk - Bulk delete transactions
app.post('/api/transactions/delete-bulk', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array is required and must not be empty' });
  }
  try {
    await pool.query('DELETE FROM transactions WHERE id = ANY($1)', [ids]);
    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    console.error('Error bulk deleting transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/transactions/sync - Sync local transactions to database
app.post('/api/transactions/sync', async (req, res) => {
  const { transactions } = req.body;
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: 'transactions array is required' });
  }
  
  if (transactions.length === 0) {
    return res.json({ success: true, syncedCount: 0 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const query = `
      INSERT INTO transactions (id, card_no, unit, quantity, date, issue_date, item)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `;
    
    let syncedCount = 0;
    for (const tx of transactions) {
      const result = await client.query(query, [
        tx.id,
        tx.cardNo,
        tx.unit,
        tx.quantity,
        tx.date,
        tx.issueDate,
        tx.item
      ]);
      if (result.rowCount && result.rowCount > 0) {
        syncedCount++;
      }
    }
    
    await client.query('COMMIT');
    res.json({ success: true, syncedCount });
  } catch (err) {
    await client.query('ROLLBACK');
    const error = err as Error;
    console.error('Error syncing transactions:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// For local running
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

export default app;
