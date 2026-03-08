const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const obraService = require('../services/obraService');

const router = express.Router();
const SALT_ROUNDS = 10;
const TOKEN_EXPIRES = '7d';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { nome, sobrenome, email, telefone, senha, funcao } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }
    const emailLower = String(email).trim().toLowerCase();
    const funcaoNormalizada = (funcao || 'engenheiro').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const displayName = `${(nome || '').trim()} ${(sobrenome || '').trim()}`.trim();

    const exists = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [emailLower]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ code: 'auth/email-already-in-use', error: 'Este email já está cadastrado. Faça login ou recupere a senha.' });
    }

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (email, senha_hash, nome, sobrenome, display_name, telefone, funcao)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, nome, sobrenome, display_name, telefone, funcao, criado_em`,
      [emailLower, senhaHash, (nome || '').trim(), (sobrenome || '').trim(), displayName, (telefone || '').trim(), funcaoNormalizada]
    );
    const user = result.rows[0];
    const userId = user.id;

    if (funcaoNormalizada === 'proprietario') {
      await obraService.vincularObrasAoProprietario(emailLower, userId);
    }

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
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
    if (err.code === '23505') {
      return res.status(400).json({ code: 'auth/email-already-in-use', error: 'Este email já está cadastrado.' });
    }
    console.error('Erro no registro:', err);
    return res.status(500).json({ error: 'Erro ao criar conta.' });
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
