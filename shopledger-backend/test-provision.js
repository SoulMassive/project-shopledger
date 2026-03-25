import { pool } from './src/config/db.js';
import { provisionTenantSchema } from './src/modules/admin/provisionTenant.js';

const testId = 'b6a79b2e-da22-4ce1-91f1-4ef6943d0097';
const schemaName = `tenant_${testId.replace(/-/g, '')}`;

async function test() {
  try {
    console.log(`Attempting to provision ${schemaName}...`);
    await provisionTenantSchema(pool, schemaName);
    console.log('Success!');
  } catch (err) {
    console.error('FAILED with error:');
    console.error(err);
  } finally {
    await pool.end();
  }
}

test();
