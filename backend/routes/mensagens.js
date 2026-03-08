const express = require('express');
const { pool } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/obras/:obraId/mensagens
router.get('/:obraId/mensagens', requireAuth, async (req, res) => {
  try {
    const { obraId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const result = await pool.query(
      `SELECT id, obra_id AS "obraId", autor_id AS "autorId", autor_nome AS "autorNome", texto, criado_em AS "criadoEm"
       FROM mensagens WHERE obra_id = $1 ORDER BY criado_em ASC LIMIT $2`,
      [obraId, limit]
    );
    const mensagens = result.rows.map(r => ({
      id: r.id,
      obraId: r.obraId,
      autorId: r.autorId,
      autorNome: r.autorNome,
      texto: r.texto,
      criadoEm: r.criadoEm,
      dataISO: r.criadoEm,
      ts: new Date(r.criadoEm).getTime()
    }));
    return res.json(mensagens);
  } catch (err) {
    console.error('Erro ao listar mensagens:', err);
    return res.status(500).json({ error: 'Erro ao listar mensagens.' });
  }
});

// POST /api/obras/:obraId/mensagens
router.post('/:obraId/mensagens', requireAuth, async (req, res) => {
  try {
    const { obraId } = req.params;
    const { texto } = req.body;
    if (!texto || !texto.trim()) {
      return res.status(400).json({ error: 'Texto da mensagem é obrigatório.' });
    }
    const autorNome = req.user.displayName || req.user.nome || 'Usuário';
    const result = await pool.query(
      `INSERT INTO mensagens (obra_id, autor_id, autor_nome, texto) VALUES ($1, $2, $3, $4)
       RETURNING id, obra_id AS "obraId", autor_id AS "autorId", autor_nome AS "autorNome", texto, criado_em AS "criadoEm"`,
      [obraId, req.user.id, autorNome, texto.trim()]
    );
    const r = result.rows[0];
    return res.status(201).json({
      id: r.id,
      obraId: r.obraId,
      autorId: r.autorId,
      autorNome: r.autorNome,
      texto: r.texto,
      criadoEm: r.criadoEm,
      dataISO: r.criadoEm
    });
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    return res.status(500).json({ error: 'Erro ao enviar mensagem.' });
  }
});

module.exports = router;
