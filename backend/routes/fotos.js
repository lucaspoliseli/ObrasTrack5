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
    const relativePath = path.join(obraId, req.file.filename).replace(/\\/g, '/');
    const baseUrl = (req.protocol + '://' + req.get('host')) + '/api/uploads/';
    const url = baseUrl + relativePath;

    const result = await pool.query(
      `INSERT INTO fotos (obra_id, autor_id, autor_nome, descricao, file_name, file_path, url, tamanho, tipo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, obra_id AS "obraId", autor_id AS "autorId", autor_nome AS "autorNome", descricao, file_name AS "fileName", file_path AS "storagePath", url, tamanho, tipo, criado_em AS "criadoEm"`,
      [obraId, req.user.id, autorNome, descricao, req.file.filename, relativePath, url, req.file.size, req.file.mimetype || '']
    );
    const r = result.rows[0];
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
