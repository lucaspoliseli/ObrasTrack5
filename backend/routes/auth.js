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

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const body = { ...req.body, senha: req.body.senha ? '[REDACTED]' : undefined };
  console.log('[auth/register] Body recebido:', JSON.stringify(body));

  try {
    const { nome, sobrenome, email, telefone, senha, funcao } = req.body;
    if (!email || !senha) {
      console.log('[auth/register] Validação falhou: email ou senha ausentes');
      return res.status(400).json({ code: 'auth/invalid-input', error: 'Email e senha são obrigatórios.' });
    }
    const emailLower = String(email).trim().toLowerCase();
    const funcaoValida = ['engenheiro', 'proprietario'].includes((funcao || '').toString().trim().toLowerCase());
    const funcaoNormalizada = funcaoValida
      ? (funcao || 'engenheiro').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      : 'engenheiro';
    const displayName = `${(nome || '').trim()} ${(sobrenome || '').trim()}`.trim();

    console.log('[auth/register] Início da tentativa de cadastro, email:', emailLower, 'função:', funcaoNormalizada);

    const exists = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [emailLower]);
    if (exists.rows.length > 0) {
      console.log('[auth/register] Email já cadastrado');
      return res.status(400).json({ code: 'auth/email-already-in-use', error: 'Este email já está cadastrado. Faça login ou recupere a senha.' });
    }

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    console.log('[auth/register] Tentativa de INSERT em users');
    const result = await pool.query(
      `INSERT INTO users (email, senha_hash, nome, sobrenome, display_name, telefone, funcao)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, nome, sobrenome, display_name, telefone, funcao, criado_em`,
      [emailLower, senhaHash, (nome || '').trim(), (sobrenome || '').trim(), displayName, (telefone || '').trim(), funcaoNormalizada]
    );
    const user = result.rows[0];
    const userId = user.id;
    console.log('[auth/register] Usuário criado, id:', userId);

    if (funcaoNormalizada === 'proprietario') {
      try {
        await obraService.vincularObrasAoProprietario(emailLower, userId);
      } catch (e) {
        console.warn('[auth/register] Erro ao vincular obras ao proprietário (não crítico):', e.message);
      }
    }

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
    console.log('[auth/register] Resposta 201 enviada');
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
    console.error('[auth/register] Erro no registro:', err);
    console.error('[auth/register] err.code:', err.code, 'err.detail:', err.detail);
    if (err.code === '23505') {
      return res.status(400).json({ code: 'auth/email-already-in-use', error: 'Este email já está cadastrado.' });
    }
    const safeMessage = getSafeErrorMessage(err);
    return res.status(500).json({ error: safeMessage, code: err.code || 'server_error' });
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
