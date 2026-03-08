const express = require('express');
const { pool } = require('../config/database');
const { requireAuth, requireEngenheiro } = require('../middleware/auth');

const router = express.Router();

/** Monta objeto endereco para o frontend (colunas normalizadas ou fallback JSONB legado) */
function buildEnderecoFromRow(row) {
  if (row.endereco_cep != null || row.endereco_logradouro != null || row.endereco_cidade != null) {
    return {
      cep: row.endereco_cep || '',
      rua: row.endereco_logradouro || '',
      numero: row.endereco_numero || '',
      bairro: row.endereco_bairro || '',
      cidade: row.endereco_cidade || '',
      uf: row.endereco_uf || '',
      complemento: row.endereco_complemento || ''
    };
  }
  if (row.endereco && typeof row.endereco === 'object') return row.endereco;
  return {};
}

/** Normaliza objeto endereco do body para valores das colunas */
function parseEndereco(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const uf = (obj.uf || '').toString().trim().toUpperCase().slice(0, 2);
  return {
    cep: (obj.cep || '').toString().trim().slice(0, 20),
    logradouro: (obj.rua || obj.logradouro || '').toString().trim().slice(0, 500),
    numero: (obj.numero || '').toString().trim().slice(0, 20),
    bairro: (obj.bairro || '').toString().trim().slice(0, 200),
    cidade: (obj.cidade || '').toString().trim().slice(0, 200),
    uf: uf || null,
    complemento: (obj.complemento || '').toString().trim().slice(0, 200)
  };
}

function rowToObra(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome,
    proprietarioId: row.proprietario_id,
    proprietarioEmail: row.proprietario_email || '',
    ownerEmail: row.owner_email || '',
    proprietarioNome: row.proprietario_nome || '',
    contatoProprietario: row.contato_proprietario || '',
    proprietarioPendente: row.proprietario_pendente,
    createdById: row.created_by_id,
    engenheiroId: row.engenheiro_id,
    responsavelNome: row.responsavel_nome || '',
    endereco: buildEnderecoFromRow(row),
    dataInicio: row.data_inicio,
    dataFinal: row.data_final,
    prazo: row.prazo,
    diasPassados: row.dias_passados ?? 0,
    observacao: row.observacao || '',
    status: row.status || 'Em andamento',
    etapaAtual: row.etapa_atual || '',
    progresso: row.progresso ?? 0,
    etapas: row.etapas || [],
    createdAt: row.criado_em,
    updatedAt: row.atualizado_em
  };
}

// GET /api/obras - todas (ordenadas)
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM obras ORDER BY criado_em DESC'
    );
    return res.json(result.rows.map(rowToObra));
  } catch (err) {
    console.error('Erro ao listar obras:', err);
    return res.status(500).json({ error: 'Erro ao listar obras.' });
  }
});

// GET /api/obras/usuario - obras do usuário logado (proprietário ou engenheiro)
router.get('/usuario', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const email = (req.user.email || '').toLowerCase();
    const result = await pool.query(
      `SELECT * FROM obras
       WHERE proprietario_id = $1 OR created_by_id = $1 OR engenheiro_id = $1
          OR LOWER(proprietario_email) = $2 OR LOWER(owner_email) = $2
       ORDER BY criado_em DESC`,
      [uid, email]
    );
    return res.json(result.rows.map(rowToObra));
  } catch (err) {
    console.error('Erro ao listar obras do usuário:', err);
    return res.status(500).json({ error: 'Erro ao listar obras.' });
  }
});

// GET /api/obras/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM obras WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Obra não encontrada.' });
    return res.json(rowToObra(result.rows[0]));
  } catch (err) {
    console.error('Erro ao buscar obra:', err);
    return res.status(500).json({ error: 'Erro ao buscar obra.' });
  }
});

// POST /api/obras - criar (apenas engenheiro)
router.post('/', requireAuth, requireEngenheiro, async (req, res) => {
  try {
    const b = req.body;
    const userId = req.user.id;
    const proprietarioEmail = (b.proprietarioEmail || b.ownerEmail || '').toString().trim().toLowerCase();
    const ownerEmail = proprietarioEmail || (b.ownerEmail || '').toString().trim().toLowerCase();
    const end = parseEndereco(b.endereco && typeof b.endereco === 'object' ? b.endereco : {});
    const etapas = Array.isArray(b.etapas) ? b.etapas : [];
    const status = (b.status || 'Em andamento').toString().trim().slice(0, 80);
    const progresso = b.progresso != null ? Math.min(100, Math.max(0, Number(b.progresso))) : 0;

    const result = await pool.query(
      `INSERT INTO obras (
        nome, proprietario_email, owner_email, proprietario_nome, contato_proprietario,
        proprietario_pendente, created_by_id, engenheiro_id, responsavel_nome,
        endereco_cep, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_uf, endereco_complemento,
        data_inicio, data_final, prazo, dias_passados, observacao,
        status, etapa_atual, progresso, etapas
      ) VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *`,
      [
        (b.nome || '').toString().trim().slice(0, 500),
        proprietarioEmail,
        ownerEmail,
        (b.proprietarioNome || '').toString().trim().slice(0, 255),
        (b.contatoProprietario || '').toString().trim().slice(0, 100),
        userId,
        b.engenheiroId || userId,
        (b.responsavelNome || '').toString().trim().slice(0, 255),
        end.cep || null,
        end.logradouro || null,
        end.numero || null,
        end.bairro || null,
        end.cidade || null,
        end.uf,
        end.complemento || null,
        b.dataInicio || null,
        b.dataFinal || null,
        (b.prazo || '').toString().trim().slice(0, 100),
        b.diasPassados ?? 0,
        (b.observacao || '').toString().trim().slice(0, 10000),
        status,
        (b.etapaAtual || '').toString().trim().slice(0, 100),
        progresso,
        JSON.stringify(etapas)
      ]
    );
    return res.status(201).json(rowToObra(result.rows[0]));
  } catch (err) {
    if (err.code === '23514') {
      return res.status(400).json({ error: 'Dados inválidos (constraint). Verifique status, progresso ou etapas.' });
    }
    console.error('Erro ao criar obra:', err);
    return res.status(500).json({ error: 'Erro ao criar obra.' });
  }
});

// PUT /api/obras/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const b = req.body;
    const updates = [];
    const values = [];
    let i = 1;

    const scalarFields = [
      ['nome', 'nome', 500],
      ['proprietarioNome', 'proprietario_nome', 255],
      ['contatoProprietario', 'contato_proprietario', 100],
      ['responsavelNome', 'responsavel_nome', 255],
      ['dataInicio', 'data_inicio'],
      ['dataFinal', 'data_final'],
      ['prazo', 'prazo', 100],
      ['diasPassados', 'dias_passados'],
      ['observacao', 'observacao', 10000],
      ['status', 'status', 80],
      ['etapaAtual', 'etapa_atual', 100],
      ['progresso', 'progresso'],
      ['etapas', 'etapas']
    ];

    for (const [key, col, maxLen] of scalarFields) {
      if (b[key] === undefined) continue;
      if (col === 'etapas') {
        const val = Array.isArray(b[key]) ? b[key] : [];
        updates.push(`etapas = $${i}`);
        values.push(JSON.stringify(val));
        i++;
        continue;
      }
      if (col === 'progresso') {
        const v = Math.min(100, Math.max(0, Number(b[key])));
        updates.push(`${col} = $${i}`);
        values.push(v);
        i++;
        continue;
      }
      let v = b[key];
      if (maxLen != null && typeof v === 'string') v = v.trim().slice(0, maxLen);
      updates.push(`${col} = $${i}`);
      values.push(v);
      i++;
    }

    if (b.endereco !== undefined && typeof b.endereco === 'object' && !Array.isArray(b.endereco)) {
      const end = parseEndereco(b.endereco);
      updates.push(
        `endereco_cep = $${i}`, `endereco_logradouro = $${i + 1}`, `endereco_numero = $${i + 2}`,
        `endereco_bairro = $${i + 3}`, `endereco_cidade = $${i + 4}`, `endereco_uf = $${i + 5}`, `endereco_complemento = $${i + 6}`
      );
      values.push(
        end.cep || null, end.logradouro || null, end.numero || null,
        end.bairro || null, end.cidade || null, end.uf, end.complemento || null
      );
      i += 7;
    }

    if (updates.length === 0) {
      const get = await pool.query('SELECT * FROM obras WHERE id = $1', [req.params.id]);
      if (get.rows.length === 0) return res.status(404).json({ error: 'Obra não encontrada.' });
      return res.json(rowToObra(get.rows[0]));
    }
    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE obras SET ${updates.join(', ')}, atualizado_em = NOW() WHERE id = $${i} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Obra não encontrada.' });
    return res.json(rowToObra(result.rows[0]));
  } catch (err) {
    if (err.code === '23514') {
      return res.status(400).json({ error: 'Dados inválidos (constraint). Verifique status, progresso ou etapas.' });
    }
    console.error('Erro ao atualizar obra:', err);
    return res.status(500).json({ error: 'Erro ao atualizar obra.' });
  }
});

// DELETE /api/obras/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM obras WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Obra não encontrada.' });
    return res.status(204).send();
  } catch (err) {
    console.error('Erro ao deletar obra:', err);
    return res.status(500).json({ error: 'Erro ao deletar obra.' });
  }
});

module.exports = router;
