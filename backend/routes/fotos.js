const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { pool } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, req.params.obraId || 'temp');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + (file.originalname || 'foto').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// GET /api/obras/:obraId/fotos
router.get('/:obraId/fotos', requireAuth, async (req, res) => {
  try {
    const { obraId } = req.params;
    const result = await pool.query(
      `SELECT id, obra_id AS "obraId", autor_id AS "autorId", autor_nome AS "autorNome", descricao, file_name AS "fileName", file_path AS "storagePath", url, tamanho, tipo, criado_em AS "criadoEm"
       FROM fotos WHERE obra_id = $1 ORDER BY criado_em DESC`,
      [obraId]
    );
    const baseUrl = (req.protocol + '://' + req.get('host') + req.baseUrl).replace(/\/api\/obras.*/, '') + '/api/uploads/';
    const fotos = result.rows.map(r => ({
      id: r.id,
      obraId: r.obraId,
      autorId: r.autorId,
      autorNome: r.autorNome,
      descricao: r.descricao || '',
      fileName: r.fileName,
      storagePath: r.storagePath,
      url: r.url || (baseUrl + r.obraId + '/' + path.basename(r.storagePath || r.fileName)),
      tamanho: r.tamanho,
      tipo: r.tipo,
      criadoEm: r.criadoEm,
      dataISO: r.criadoEm
    }));
    return res.json(fotos);
  } catch (err) {
    console.error('Erro ao listar fotos:', err);
    return res.status(500).json({ error: 'Erro ao listar fotos.' });
  }
});

// POST /api/obras/:obraId/fotos - upload
router.post('/:obraId/fotos', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { obraId } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    const descricao = (req.body.descricao || '').trim();
    const autorNome = req.user.displayName || req.user.nome || 'Engenheiro';
    console.log('[fotos] Upload de imagem recebido', {
      obraId,
      autorId: req.user.id,
      autorNome,
      fileName: req.file.originalname,
      size: req.file.size
    });
    const relativePath = path.join(obraId, req.file.filename).replace(/\\/g, '/');
    const baseUrl = (req.protocol + '://' + req.get('host')) + '/api/uploads/';
    const url = baseUrl + relativePath;

    // Salvar metadados da foto
    const result = await pool.query(
      `INSERT INTO fotos (obra_id, autor_id, autor_nome, descricao, file_name, file_path, url, tamanho, tipo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, obra_id AS "obraId", autor_id AS "autorId", autor_nome AS "autorNome", descricao, file_name AS "fileName", file_path AS "storagePath", url, tamanho, tipo, criado_em AS "criadoEm"`,
      [obraId, req.user.id, autorNome, descricao, req.file.filename, relativePath, url, req.file.size, req.file.mimetype || '']
    );
    const r = result.rows[0];

    // Criar notificação de nova imagem para o proprietário da obra
    try {
      const obraResult = await pool.query(
        'SELECT id, engenheiro_id, proprietario_id FROM obras WHERE id = $1',
        [obraId]
      );
      if (obraResult.rows.length > 0) {
        const obra = obraResult.rows[0];
        const autorId = req.user.id;
        let destinatarioId = null;

        // Apenas engenheiro deve gerar notificação para o proprietário
        if (
          obra.engenheiro_id &&
          String(obra.engenheiro_id) === String(autorId)
        ) {
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

        if (
          destinatarioId &&
          String(destinatarioId) !== String(autorId)
        ) {
          console.log('[fotos] Criando notificação de imagem', {
            obraId,
            tipo: 'imagem',
            remetenteId: autorId,
            destinatarioId
          });
          await pool.query(
            `INSERT INTO notifications (obra_id, user_id, tipo)
             VALUES ($1, $2, 'imagem')`,
            [obraId, destinatarioId]
          );
        } else {
          console.log('[fotos] Não foi possível determinar destinatário da notificação de imagem', {
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
      console.warn('Falha ao registrar notificação de imagem (não crítico):', notifyErr);
    }

    return res.status(201).json({
      id: r.id,
      obraId: r.obraId,
      autorId: r.autorId,
      autorNome: r.autorNome,
      descricao: r.descricao,
      fileName: r.fileName,
      storagePath: r.storagePath,
      url: r.url,
      tamanho: r.tamanho,
      tipo: r.tipo,
      criadoEm: r.criadoEm,
      dataISO: r.criadoEm
    });
  } catch (err) {
    console.error('Erro ao fazer upload:', err);
    return res.status(500).json({ error: 'Erro ao fazer upload da foto.' });
  }
});

// DELETE /api/obras/foto/:fotoId (evita conflito com GET /api/obras/:id)
router.delete('/foto/:fotoId', requireAuth, async (req, res) => {
  try {
    const { fotoId } = req.params;
    const result = await pool.query('SELECT file_path FROM fotos WHERE id = $1', [fotoId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Foto não encontrada.' });
    }
    const filePath = path.join(UPLOAD_DIR, result.rows[0].file_path.replace(/\//g, path.sep));
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) { console.warn('Erro ao remover arquivo:', e); }
    }
    await pool.query('DELETE FROM fotos WHERE id = $1', [fotoId]);
    return res.status(204).send();
  } catch (err) {
    console.error('Erro ao deletar foto:', err);
    return res.status(500).json({ error: 'Erro ao deletar foto.' });
  }
});

module.exports = router;
