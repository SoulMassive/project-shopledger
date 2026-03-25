import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

function getAccessSecret() {
  return process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
}

function getAccessExpiry() {
  return process.env.JWT_ACCESS_EXPIRES_IN || '15m';
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function signAccessToken(shop) {
  return jwt.sign(
    {
      name: shop.name,
      email: shop.owner_email || shop.email,
      status: shop.status,
      role: shop.role || 'shop',
      schema_name: shop.schema_name,
    },
    getAccessSecret(),
    { subject: String(shop.id), expiresIn: getAccessExpiry() }
  );
}

export async function issueRefreshToken(shopId, ip, userAgent) {
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(raw);

  await pool.query(
    `INSERT INTO public.refresh_tokens (shop_id, token_hash, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
    [shopId, tokenHash, ip || null, userAgent || null]
  );

  return raw;
}

export async function rotateRefreshToken(rawToken, ip, userAgent) {
  const oldHash = hashToken(rawToken);

  const { rows } = await pool.query(
    `SELECT id, shop_id, revoked, expires_at
     FROM public.refresh_tokens
     WHERE token_hash = $1`,
    [oldHash]
  );

  if (!rows.length) throw { status: 401, message: 'Invalid refresh token' };

  const current = rows[0];
  if (current.revoked) throw { status: 401, message: 'Refresh token revoked' };
  if (new Date(current.expires_at) <= new Date()) {
    throw { status: 401, message: 'Refresh token expired' };
  }

  const newRaw = crypto.randomBytes(48).toString('hex');
  const newHash = hashToken(newRaw);

  await pool.query(
    `UPDATE public.refresh_tokens
     SET token_hash = $1,
         ip_address = $2,
         user_agent = $3
     WHERE id = $4`,
    [newHash, ip || null, userAgent || null, current.id]
  );

  return newRaw;
}

export async function revokeRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  await pool.query(
    `UPDATE public.refresh_tokens
     SET revoked = TRUE
     WHERE token_hash = $1 AND revoked = FALSE`,
    [tokenHash]
  );
}
