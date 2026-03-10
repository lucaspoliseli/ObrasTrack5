const express = require('express');
const { pool } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications/unread
// Retorna contagem de notificações não lidas por obra/tipo para o usuário logado
router.get('/unread', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[notifications] GET /unread para usuário', userId);
    const result = await pool.query(
      `SELECT obra_id AS "obraId", tipo, COUNT(*)::INT AS count
       FROM notifications
       WHERE user_id = $1 AND lida = false
       GROUP BY obra_id, tipo`,
      [userId]
    );

    const byObra = {};
    let total = 0;
    for (const row of result.rows) {
      if (!byObra[row.obraId]) byObra[row.obraId] = {};
      byObra[row.obraId][row.tipo] = row.count;
      total += row.count;
    }

    console.log('[notifications] Resumo de não lidas', { userId, total, obras: Object.keys(byObra).length });
    return res.json({ byObra, total });
  } catch (err) {
    console.error('Erro ao buscar notificações não lidas:', err);
    return res.status(500).json({ error: 'Erro ao buscar notificações.' });
  }
});

// POST /api/notifications/mark-read
// Body: { obraId, tipo?: 'mensagem' | 'imagem' }
router.post('/mark-read', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { obraId, tipo } = req.body || {};

    if (!obraId) {
      return res.status(400).json({ error: 'obraId é obrigatório.' });
    }

    const values = [userId, obraId];
    let sql =
      'UPDATE notifications SET lida = true WHERE user_id = $1 AND obra_id = $2 AND lida = false';

    if (tipo === 'mensagem' || tipo === 'imagem') {
      values.push(tipo);
      sql += ' AND tipo = $3';
    }

    console.log('[notifications] POST /mark-read', {
      userId,
      obraId,
      tipo: tipo || 'todas',
      sql
    });

    const result = await pool.query(sql, values);
    console.log('[notifications] Notificações marcadas como lidas', {
      userId,
      obraId,
      tipo: tipo || 'todas',
      updated: result.rowCount
    });
    return res.json({ updated: result.rowCount });
  } catch (err) {
    console.error('Erro ao marcar notificações como lidas:', err);
    return res.status(500).json({ error: 'Erro ao marcar notificações como lidas.' });
  }
});

module.exports = router;

