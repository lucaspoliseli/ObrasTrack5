const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_mude_em_producao';

/**
 * Middleware: exige usuário autenticado (JWT válido).
 * Coloca req.user com { id, email, funcao, ... }.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não informado.' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(
      'SELECT id, email, nome, sobrenome, display_name, telefone, funcao, criado_em FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }
    const user = result.rows[0];
    req.user = {
      id: user.id,
      uid: user.id,
      email: user.email,
      nome: user.nome,
      sobrenome: user.sobrenome,
      displayName: user.display_name || `${user.nome} ${user.sobrenome}`.trim(),
      telefone: user.telefone,
      funcao: user.funcao,
      criadoEm: user.criado_em
    };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
    next(err);
  }
}

/**
 * Opcional: só exige engenheiro (funcao = engenheiro).
 */
function requireEngenheiro(req, res, next) {
  const role = (req.user?.funcao || '').toString().trim().toLowerCase();
  const isEng = role === 'engenheiro' || role.startsWith('eng');
  if (!isEng) {
    return res.status(403).json({ error: 'Acesso restrito a engenheiros.' });
  }
  next();
}

module.exports = { requireAuth, requireEngenheiro, JWT_SECRET };
