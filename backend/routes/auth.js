const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const obraService = require('../services/obraService');

const router = express.Router();
const SALT_ROUNDS = 10;
const TOKEN_EXPIRES = '7d';

/** Mensagem de erro segura para o cliente (mapeia códigos PG e conexão) */
function getSafeErrorMessage(err) {
  if (!err) return 'Erro interno no servidor.';
  const code = err.code;
  const msg = err.message || '';
  if (code === '23505') return 'Este email já está cadastrado. Faça login ou recupere a senha.';
  if (code === '42P01' || msg.includes('does not exist')) return 'Tabela de usuários não encontrada. Execute as migrations do banco.';
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || msg.includes('connect')) return 'Erro de conexão com o banco de dados. Verifique DATABASE_URL e se o banco está acessível.';
  if (code === '28P01') return 'Credenciais do banco inválidas. Verifique DATABASE_URL.';
  if (msg.includes('JWT_SECRET') || msg.includes('secret')) return 'Servidor sem JWT_SECRET configurado. Configure a variável de ambiente.';
  if (msg.length > 0 && msg.length < 200) return msg;
  return 'Erro ao criar conta. Tente novamente ou contate o suporte.';
}

/** Normaliza função: aceita "Engenheiro", "Proprietário", "proprietario" etc → "engenheiro" | "proprietario" */
function normalizarFuncao(val) {
  const s = (val == null ? '' : String(val))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  if (s === 'proprietario' || s === 'proprietário' || s === 'owner') return 'proprietario';
  return 'engenheiro';
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const bodyLog = { ...(req.body || {}), senha: req.body?.senha ? '[REDACTED]' : undefined };
  console.log('[auth/register] 1. Body recebido:', JSON.stringify(bodyLog));

  try {
    const body = req.body || {};
    const { nome, sobrenome, email, telefone, senha, funcao } = body;

    if (!email || !senha) {
      console.log('[auth/register] Validação falhou: email ou senha ausentes');
      return res.status(400).json({ code: 'auth/invalid-input', error: 'Email e senha são obrigatórios.' });
    }

    const emailLower = String(email).trim().toLowerCase();
    const funcaoNormalizada = normalizarFuncao(funcao);
    const nomeStr = (nome == null ? '' : String(nome)).trim();
    const sobrenomeStr = (sobrenome == null ? '' : String(sobrenome)).trim();
    const displayName = `${nomeStr} ${sobrenomeStr}`.trim();
    const telefoneStr = (telefone == null ? '' : String(telefone)).trim();

    console.log('[auth/register] 2. Dados validados:', {
      email: emailLower,
      funcaoRecebida: funcao,
      funcaoNormalizada,
      nome: nomeStr,
      sobrenome: sobrenomeStr,
      displayName,
      telefone: telefoneStr
    });

    console.log('[auth/register] 3. Verificando se email já existe (SELECT users)...');
    const exists = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [emailLower]);
    if (exists.rows.length > 0) {
      console.log('[auth/register] Email já cadastrado → 409');
      return res.status(409).json({ code: 'auth/email-already-in-use', error: 'Este email já está cadastrado. Faça login ou recupere a senha.' });
    }

    console.log('[auth/register] 4. Hash da senha...');
    const senhaStr = String(senha);
    const senhaHash = await bcrypt.hash(senhaStr, SALT_ROUNDS);

    const insertValues = [emailLower, senhaHash, nomeStr, sobrenomeStr, displayName, telefoneStr, funcaoNormalizada];
    console.log('[auth/register] 5. INSERT em users (email, senha_hash, nome, sobrenome, display_name, telefone, funcao):', insertValues.map((v, i) => (i === 1 ? '[hash]' : v)));

    const result = await pool.query(
      `INSERT INTO users (email, senha_hash, nome, sobrenome, display_name, telefone, funcao)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, nome, sobrenome, display_name, telefone, funcao, criado_em`,
      insertValues
    );
    const user = result.rows[0];
    const userId = user.id;
    console.log('[auth/register] 6. Usuário criado, id:', userId);

    if (funcaoNormalizada === 'proprietario') {
      try {
        console.log('[auth/register] 7. Vinculando obras ao proprietário...');
        await obraService.vincularObrasAoProprietario(emailLower, userId);
      } catch (e) {
        console.warn('[auth/register] Erro ao vincular obras (não crítico):', e.message);
      }
    }

    console.log('[auth/register] 8. Gerando JWT...');
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
    console.log('[auth/register] 9. Resposta 201 enviada');
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        uid: user.id,
        email: user.email,
        nome: user.nome,
        sobrenome: user.sobrenome,
        displayName: user.display_name,
        telefone: user.telefone,
        funcao: user.funcao,
        criadoEm: user.criado_em
      }
    });
  } catch (err) {
    console.error('[auth/register] ERRO:', err);
    console.error('[auth/register] err.code:', err?.code, 'err.message:', err?.message, 'err.detail:', err?.detail);
    console.error('[auth/register] err.stack:', err?.stack);

    if (err.code === '23505') {
      return res.status(409).json({ code: 'auth/email-already-in-use', error: 'Este email já está cadastrado.' });
    }
    const realMessage = (err && (err.message || String(err))) || '';
    const safeMessage = getSafeErrorMessage(err);
    const payload = {
      error: (realMessage && realMessage.length < 500 ? realMessage : safeMessage) || 'Erro ao criar conta.',
      code: err.code || 'server_error'
    };
    console.error('[auth/register] Resposta 500:', payload);
    return res.status(500).json(payload);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }
    const emailLower = String(email).trim().toLowerCase();
    const result = await pool.query(
      'SELECT id, email, senha_hash, nome, sobrenome, display_name, telefone, funcao, criado_em FROM users WHERE LOWER(email) = $1',
      [emailLower]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ code: 'auth/user-not-found', error: 'Email não cadastrado. Verifique o email ou crie uma conta.' });
    }
    const user = result.rows[0];
    const ok = await bcrypt.compare(senha, user.senha_hash);
    if (!ok) {
      return res.status(401).json({ code: 'auth/wrong-password', error: 'Senha incorreta. Tente novamente.' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
    return res.json({
      token,
      user: {
        id: user.id,
        uid: user.id,
        email: user.email,
        nome: user.nome,
        sobrenome: user.sobrenome,
        displayName: user.display_name || `${user.nome} ${user.sobrenome}`.trim(),
        telefone: user.telefone,
        funcao: user.funcao,
        criadoEm: user.criado_em
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro ao fazer login.' });
  }
});

// GET /api/auth/me (requer token)
router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
