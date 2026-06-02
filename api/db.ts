import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('WARNING: DATABASE_URL environment variable is not defined.');
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false, // Required for Neon serverless connection over SSL
  },
});

export const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Initializing database schema...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY,
        card_no TEXT NOT NULL,
        unit NUMERIC(5, 2) NOT NULL,
        quantity NUMERIC(10, 2) NOT NULL,
        item VARCHAR(10) NOT NULL,
        date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        issue_date DATE NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_transactions_card_no ON transactions(card_no);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    `);
    console.log('Database schema checked/created successfully.');
  } catch (err) {
    console.error('Failed to initialize database schema', err);
    throw err;
  } finally {
    client.release();
  }
};
