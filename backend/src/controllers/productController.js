import { pool } from '../db/pool.js';

export const getProducts = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  const { code, name, category, unit, description, stock } = req.body;
  
  if (!code || !name || !category || !unit) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO products (code, name, category, unit, description, stock) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [code, name, category, unit, description, stock || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation for 'code'
      return res.status(400).json({ message: 'Product code already exists' });
    }
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  const { id } = req.params;
  const { code, name, category, unit, description, stock } = req.body;

  try {
    const result = await pool.query(
      'UPDATE products SET code = $1, name = $2, category = $3, unit = $4, description = $5, stock = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
      [code, name, category, unit, description, stock, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Product code already exists' });
    }
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};
