export async function provisionTenantSchema(pool, schema) {

  await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".customers (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      phone       VARCHAR(20),
      email       VARCHAR(255),
      balance     NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at  DATE NOT NULL DEFAULT CURRENT_DATE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".suppliers (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      phone       VARCHAR(20),
      email       VARCHAR(255),
      balance     NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at  DATE NOT NULL DEFAULT CURRENT_DATE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".transactions (
      id            SERIAL PRIMARY KEY,
      party_type    VARCHAR(10) NOT NULL CHECK (party_type IN ('customer','supplier')),
      party_id      INTEGER NOT NULL,
      type          VARCHAR(10) NOT NULL CHECK (type IN ('cash_in','cash_out')),
      amount        NUMERIC(12,2) NOT NULL,
      note          TEXT,
      txn_date      DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at    DATE NOT NULL DEFAULT CURRENT_DATE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".cashbook (
      id            SERIAL PRIMARY KEY,
      type          VARCHAR(10) NOT NULL CHECK (type IN ('cash_in','cash_out')),
      amount        NUMERIC(12,2) NOT NULL,
      category      VARCHAR(100),
      note          TEXT,
      entry_date    DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at    DATE NOT NULL DEFAULT CURRENT_DATE
    )
  `);

  // Trigger to auto-update part balances on transaction insert
  await pool.query(`
    CREATE OR REPLACE FUNCTION "${schema}".update_party_balance()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.party_type = 'customer' THEN
        UPDATE "${schema}".customers
        SET balance = balance + CASE
          WHEN NEW.type = 'cash_in'  THEN  NEW.amount -- You Got (Money/Value)
          WHEN NEW.type = 'cash_out' THEN -NEW.amount -- You Gave (Money/Value)
        END
        WHERE id = NEW.party_id;
      ELSIF NEW.party_type = 'supplier' THEN
        UPDATE "${schema}".suppliers
        SET balance = balance + CASE
          WHEN NEW.type = 'cash_in'  THEN  NEW.amount -- You Got Goods/Ref (Liability Increases)
          WHEN NEW.type = 'cash_out' THEN -NEW.amount -- You Gave Payment (Liability Decreases)
        END
        WHERE id = NEW.party_id;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS trg_update_party_balance ON "${schema}".transactions;
    CREATE TRIGGER trg_update_party_balance
    AFTER INSERT ON "${schema}".transactions
    FOR EACH ROW EXECUTE FUNCTION "${schema}".update_party_balance();
  `);

  console.log(`✅ Tenant schema provisioned: ${schema}`);
  return schema;
}
