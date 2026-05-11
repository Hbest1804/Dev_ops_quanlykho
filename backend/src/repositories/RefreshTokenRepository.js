import { createHash, randomBytes } from 'crypto';
import { pool } from '../db/Pool.js';

const REFRESH_TOKEN_DAYS = 7;

export function generateToken() {
  return randomBytes(64).toString('hex');
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export const RefreshTokenRepository = {
  async create(userId, { userAgent, ipAddress } = {}) {
    const raw   = generateToken();
    const hash  = hashToken(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 86_400_000);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, hash, expiresAt, userAgent ?? null, ipAddress ?? null]
    );

    return raw; // trả raw token cho client, DB chỉ lưu hash
  },

  async findValid(raw) {
    const hash = hashToken(raw);
    const { rows } = await pool.query(
      `SELECT * FROM refresh_tokens
       WHERE token = $1 AND is_revoked = FALSE AND expires_at > NOW()`,
      [hash]
    );
    return rows[0] ?? null;
  },

  // Token rotation: thu hồi token cũ, ghi nhận replaced_by
  async rotate(oldRaw, userId, meta = {}) {
    const oldHash = hashToken(oldRaw);
    const newRaw  = generateToken();
    const newHash = hashToken(newRaw);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 86_400_000);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE refresh_tokens SET is_revoked = TRUE, replaced_by = $1 WHERE token = $2`,
        [newHash, oldHash]
      );
      await client.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at, user_agent, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, newHash, expiresAt, meta.userAgent ?? null, meta.ipAddress ?? null]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return newRaw;
  },

  async findByRaw(raw) {
    const hash = hashToken(raw);
    const { rows } = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1',
      [hash]
    );
    return rows[0] ?? null;
  },

  async revoke(raw) {
    const hash = hashToken(raw);
    await pool.query(
      `UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1`,
      [hash]
    );
  },

  async revokeAllForUser(userId) {
    await pool.query(
      `UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1`,
      [userId]
    );
  },
};
