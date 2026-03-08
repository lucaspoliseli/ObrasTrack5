const express = require('express');
const { pool } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    uid: row.id,
    email: row.email,
    nome: row.nome,
    sobrenome: row.sobrenome,
    displayName: row.display_name,
    telefone: row.telefone,
    funcao: row.funcao,
    criadoEm: row.criado_em,
    createdAt: row.criado_em,
    updatedAt: row.atualizado_em
  };
}

// GET /api/users - lista todos (uso admin ou interno)
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, nome, sobrenome, display_name, telefone, funcao, criado_em, atualizado_em FROM users ORDER BY criado_em DESC'
    );
    return res.json(result.rows.map(rowToUser));
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    return res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

// GET /api/users/email/:email - por email
router.get('/email/:email', requireAuth, async (req, res) => {
  try {
    const email = String(req.params.email).trim().toLowerCase();
    const result = await pool.query(
      'SELECT id, email, nome, sobrenome, display_name, telefone, funcao, criado_em, atualizado_em FROM users WHERE LOWER(email) = $1',
      [email]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
    return res.json(rowToUser(result.rows[0]));
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    return res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
});

// GET /api/users/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, nome, sobrenome, display_name, telefone, funcao, criado_em, atualizado_em FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
    return res.json(rowToUser(result.rows[0]));
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    return res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
});

// PUT /api/users/:id - atualizar (só o próprio usuário ou admin)
router.put('/:id', requireAuth, async (req, res) => {
  if (req.user.id !== req.params.id && req.user.funcao !== 'admin') {
    return res.status(403).json({ error: 'Sem permissão para editar este usuário.' });
  }
  try {
    const { nome, sobrenome, displayName, telefone } = req.body;
    const result = await pool.query(
      `UPDATE users SET nome = COALESCE($2, nome), sobrenome = COALESCE($3, sobrenome), display_name = COALESCE($4, display_name), telefone = COALESCE($5, telefone), atualizado_em = NOW()
       WHERE id = $1 RETURNING id, email, nome, sobrenome, display_name, telefone, funcao, criado_em, atualizado_em`,
      [req.params.id, nome || null, sobrenome || null, displayName || null, telefone || null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
    return res.json(rowToUser(result.rows[0]));
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

module.exports = router;
