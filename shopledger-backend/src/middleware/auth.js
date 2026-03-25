import jwt from 'jsonwebtoken';

function getAccessSecret() {
  return process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
}

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const queryToken = req.query.token;
  const token = headerToken || queryToken;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, getAccessSecret());
    req.shop = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      status: payload.status,
      role: payload.role || 'shop',
      schema_name: payload.schema_name,
    };
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
