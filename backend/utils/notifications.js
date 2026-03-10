const { pool } = require('../config/database');

/**
 * Resolve os participantes principais de uma obra.
 * Retorna ids de engenheiro e proprietário com fallback por email, quando possível.
 */
async function resolveObraParticipants(obraId) {
  if (!obraId) return null;

  const result = await pool.query(
    'SELECT id, engenheiro_id, proprietario_id, proprietario_email, owner_email FROM obras WHERE id = $1',
    [obraId]
  );
  if (result.rows.length === 0) return null;

  const obra = result.rows[0];
  let proprietarioId = obra.proprietario_id || null;
  const engenheiroId = obra.engenheiro_id || null;

  // Fallback por email para descobrir proprietarioId, se ainda não houver
  if (!proprietarioId && (obra.proprietario_email || obra.owner_email)) {
    const email = (obra.proprietario_email || obra.owner_email || '').toLowerCase();
    const userRes = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [email]
    );
    if (userRes.rows.length > 0) {
      proprietarioId = userRes.rows[0].id;
    }
  }

  return {
    obraId: obra.id,
    engenheiroId,
    proprietarioId
  };
}

/**
 * Define o destinatário de notificação de mensagem:
 * - Se autor é engenheiro → proprietário
 * - Caso contrário (geralmente proprietário) → engenheiro
 */
function getMessageRecipient({ engenheiroId, proprietarioId, autorId }) {
  if (!engenheiroId) return null;
  if (!autorId) return null;
  if (String(engenheiroId) === String(autorId)) {
    return proprietarioId || null;
  }
  return engenheiroId;
}

/**
 * Define o destinatário de notificação de imagem:
 * - Apenas quando o engenheiro envia → proprietário
 */
function getImageRecipient({ engenheiroId, proprietarioId, autorId }) {
  if (!engenheiroId || !autorId) return null;
  if (String(engenheiroId) !== String(autorId)) return null;
  return proprietarioId || null;
}

module.exports = {
  resolveObraParticipants,
  getMessageRecipient,
  getImageRecipient
};

