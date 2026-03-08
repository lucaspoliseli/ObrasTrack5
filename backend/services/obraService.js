const { pool } = require('../config/database');

async function vincularObrasAoProprietario(proprietarioEmail, proprietarioId) {
  if (!proprietarioEmail || !proprietarioId) return 0;
  const emailLower = String(proprietarioEmail).trim().toLowerCase();
  const result = await pool.query(
    `UPDATE obras SET proprietario_id = $1, proprietario_pendente = false, atualizado_em = NOW()
     WHERE LOWER(proprietario_email) = $2 OR LOWER(owner_email) = $2
     RETURNING id`,
    [proprietarioId, emailLower]
  );
  return result.rowCount || 0;
}

module.exports = { vincularObrasAoProprietario };
