import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
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
    rejectUnauthorized: false,
  },
});

type CardSeed = {
  cardNo: string;
  cardType: string;
};

const seedCardHolders = async (client: pg.PoolClient) => {
  const seedPath = fileURLToPath(new URL('./cardSeed.json', import.meta.url));
  let rawSeed: string;
  try {
    rawSeed = await fs.readFile(seedPath, 'utf8');
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      console.log('No local card seed file found. Using card holders already stored in database.');
      return;
    }
    throw err;
  }
  const cards = JSON.parse(rawSeed) as CardSeed[];

  const chunkSize = 500;
  for (let start = 0; start < cards.length; start += chunkSize) {
    const chunk = cards.slice(start, start + chunkSize);
    const params: unknown[] = [];
    const values = chunk.map((card, index) => {
      const offset = index * 2;
      params.push(card.cardNo, card.cardType);
      return `($${offset + 1}, $${offset + 2})`;
    });

    await client.query(
      `
        INSERT INTO card_holders (
          card_no,
          card_type
        )
        VALUES ${values.join(', ')}
        ON CONFLICT (card_no) DO NOTHING
      `,
      params
    );
  }

  console.log(`Card holder seed checked: ${cards.length} cards available in seed file.`);
};

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

      CREATE TABLE IF NOT EXISTS card_holders (
        card_no TEXT PRIMARY KEY,
        card_type TEXT,
        rice_entitlement_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
        ragi_entitlement_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
        source_sheet TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_card_holders_active ON card_holders(is_active);
      CREATE INDEX IF NOT EXISTS idx_card_holders_card_type ON card_holders(card_type);

      CREATE TABLE IF NOT EXISTS inventory_months (
        month TEXT PRIMARY KEY,
        rice_total_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
        ragi_total_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ration_issues (
        id UUID PRIMARY KEY,
        card_no TEXT NOT NULL REFERENCES card_holders(card_no) ON UPDATE CASCADE,
        month TEXT NOT NULL,
        unit NUMERIC(10, 2) NOT NULL DEFAULT 0,
        rice_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
        ragi_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'distributed')),
        issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        issued_by TEXT NOT NULL,
        distributed_at TIMESTAMP WITH TIME ZONE,
        distributed_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_ration_issues_month ON ration_issues(month);
      CREATE INDEX IF NOT EXISTS idx_ration_issues_status ON ration_issues(status);
      CREATE INDEX IF NOT EXISTS idx_ration_issues_card_month ON ration_issues(card_no, month);
    `);

    await seedCardHolders(client);
    console.log('Database schema checked/created successfully.');
  } catch (err) {
    console.error('Failed to initialize database schema', err);
    throw err;
  } finally {
    client.release();
  }
};
