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
    console.log('[mensagens] Nova mensagem recebida', {
      obraId,
      autorId: req.user.id,
      autorNome,
      texto: texto.trim()
    });

    // Salvar mensagem
    const result = await pool.query(
      `INSERT INTO mensagens (obra_id, autor_id, autor_nome, texto) VALUES ($1, $2, $3, $4)
       RETURNING id, obra_id AS "obraId", autor_id AS "autorId", autor_nome AS "autorNome", texto, criado_em AS "criadoEm"`,
      [obraId, req.user.id, autorNome, texto.trim()]
    );
    const r = result.rows[0];

    // Criar notificação para o outro participante da obra (se existir)
    try {
      const obraResult = await pool.query(
        'SELECT id, engenheiro_id, proprietario_id, proprietario_email, owner_email FROM obras WHERE id = $1',
        [obraId]
      );
      if (obraResult.rows.length > 0) {
        const obra = obraResult.rows[0];
        const autorId = req.user.id;
        let destinatarioId = null;

        // Se autor é engenheiro → notificar proprietário
        if (obra.engenheiro_id && String(obra.engenheiro_id) === String(autorId)) {
          destinatarioId = obra.proprietario_id || null;
          // Fallback por email caso proprietario_id ainda esteja nulo
          if (!destinatarioId && (obra.proprietario_email || obra.owner_email)) {
            const email = (obra.proprietario_email || obra.owner_email || '').toLowerCase();
            const userRes = await pool.query(
              'SELECT id FROM users WHERE LOWER(email) = $1',
              [email]
            );
            if (userRes.rows.length > 0) {
              destinatarioId = userRes.rows[0].id;
            }
          }
        }
        // Se autor é proprietário → notificar engenheiro
        else if (obra.proprietario_id && String(obra.proprietario_id) === String(autorId)) {
          destinatarioId = obra.engenheiro_id || null;
        }

        if (destinatarioId && String(destinatarioId) !== String(autorId)) {
          console.log('[mensagens] Criando notificação de mensagem', {
            obraId,
            tipo: 'mensagem',
            remetenteId: autorId,
            destinatarioId
          });
          await pool.query(
            `INSERT INTO notifications (obra_id, user_id, tipo)
             VALUES ($1, $2, 'mensagem')`,
            [obraId, destinatarioId]
          );
        } else {
          console.log('[mensagens] Não foi possível determinar destinatário da notificação', {
            obraId,
            autorId,
            engenheiroId: obra.engenheiro_id,
            proprietarioId: obra.proprietario_id,
            proprietarioEmail: obra.proprietario_email,
            ownerEmail: obra.owner_email
          });
        }
      }
    } catch (notifyErr) {
      console.warn('Falha ao registrar notificação de mensagem (não crítico):', notifyErr);
    }

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
