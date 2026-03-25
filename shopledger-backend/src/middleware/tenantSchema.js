export function tenantSchema(req, res, next) {
  // Prefer schema_name from the authenticated shop object
  let schema = req.shop?.schema_name;

  if (!schema) {
    // Fallback logic for cases where shop might not be in JWT yet (e.g. initial setup/admin actions)
    const rawId = req.shop?.id || req.headers['x-tenant-id'];
    if (!rawId) {
      return res.status(400).json({ success: false, error: 'Tenant context missing' });
    }
    const safe = String(rawId).replace(/[^a-zA-Z0-9_]/g, '');
    schema = `tenant_${safe}`;
  }

  req.tenantSchema = schema;
  console.log(`[Tenant Context] Schema: ${req.tenantSchema}`);
  next();
}
