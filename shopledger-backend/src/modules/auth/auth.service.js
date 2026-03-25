import bcrypt from 'bcrypt';
import { pool } from '../../config/db.js';
import { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../../utils/tokenUtils.js';

export const authService = {

  async register({ name, email, phone, password }) {
    const { rows: existing } = await pool.query(
      `SELECT id FROM public.shops WHERE owner_email = $1`, [email]
    );
    if (existing.length) throw { status: 409, message: 'Email already registered' };

    const password_hash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO public.shops
         (name, owner_email, phone, password_hash, email_verified)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [name, email, phone, password_hash]
    );

    return { message: 'Registered successfully. Awaiting admin approval.' };
  },

  async login({ email, password }, ip, userAgent) {
    const { rows } = await pool.query(
      `SELECT * FROM public.shops WHERE owner_email = $1`, [email]
    );
    if (!rows.length) throw { status: 401, message: 'Invalid email or password' };

    const shop = rows[0];

    if (shop.status === 'pending')
      throw { status: 403, message: 'Account pending admin approval' };
    if (shop.status === 'suspended')
      throw { status: 403, message: 'Account suspended. Contact support.' };

    const valid = await bcrypt.compare(password, shop.password_hash);
    if (!valid) throw { status: 401, message: 'Invalid email or password' };

    const accessToken  = signAccessToken(shop);
    const refreshToken = await issueRefreshToken(shop.id, ip, userAgent);

    return {
      accessToken,
      refreshToken,
      shop: {
        id:     shop.id,
        name:   shop.name,
        email:  shop.owner_email,
        status: shop.status,
        schema_name: shop.schema_name,
      }
    };
  },

  async refresh(rawToken, ip, userAgent) {
    const crypto = await import('crypto');
    const newRaw = await rotateRefreshToken(rawToken, ip, userAgent);
    const hashNew = crypto.createHash('sha256').update(newRaw).digest('hex');

    const { rows } = await pool.query(
      `SELECT s.* FROM public.refresh_tokens rt
       JOIN public.shops s ON s.id = rt.shop_id
       WHERE rt.token_hash = $1`,
      [hashNew]
    );

    const accessToken = signAccessToken(rows[0]);
    return { accessToken, refreshToken: newRaw };
  },

  async logout(rawToken) {
    await revokeRefreshToken(rawToken);
    return { message: 'Logged out successfully' };
  },

  async forgotPassword({ email }) {
    return { message: 'OTP feature coming soon.' };
  },

  async resetPassword({ email, otp, password }) {
    return { message: 'OTP feature coming soon.' };
  },

  async changePassword(shopId, { currentPassword, newPassword }) {
    const { rows } = await pool.query(
      `SELECT password_hash FROM public.shops WHERE id = $1`, [shopId]
    );

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) throw { status: 401, message: 'Current password is incorrect' };

    const password_hash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      `UPDATE public.shops SET password_hash = $1 WHERE id = $2`,
      [password_hash, shopId]
    );

    return { message: 'Password changed successfully' };
  },
};
