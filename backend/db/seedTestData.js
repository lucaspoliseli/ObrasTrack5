/**
 * Dados de teste para validação pelo frontend:
 * - 1 engenheiro, 1 proprietário
 * - 2 obras
 * - mensagens em uma obra
 * - 1 foto vinculada a uma obra
 *
 * Uso: node db/seedTestData.js
 * (Requer .env com DATABASE_URL. Senha padrão dos usuários: 123456)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const SENHA_PADRAO = '123456';
const SALT_ROUNDS = 10;

// 1x1 pixel PNG (transparente)
const MINI_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function run() {
  const client = await pool.connect();
  try {
    const senhaHash = await bcrypt.hash(SENHA_PADRAO, SALT_ROUNDS);

    // ---- Usuários ----
    let engenheiroId, proprietarioId;
    const emails = ['engenheiro@teste.com', 'proprietario@teste.com'];
    for (const email of emails) {
      const r = await client.query(
        'SELECT id FROM users WHERE LOWER(email) = $1',
        [email.toLowerCase()]
      );
      if (r.rows.length > 0) {
        if (email === 'engenheiro@teste.com') engenheiroId = r.rows[0].id;
        else proprietarioId = r.rows[0].id;
        console.log('Usuário já existe:', email);
        continue;
      }
      const funcao = email.startsWith('engenheiro') ? 'engenheiro' : 'proprietario';
      const nome = funcao === 'engenheiro' ? 'Carlos' : 'Maria';
      const sobrenome = funcao === 'engenheiro' ? 'Silva (Eng.)' : 'Santos (Propr.)';
      const displayName = `${nome} ${sobrenome}`;
      const result = await client.query(
        `INSERT INTO users (email, senha_hash, nome, sobrenome, display_name, telefone, funcao)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [email.toLowerCase(), senhaHash, nome, sobrenome, displayName, '(11) 98765-4321', funcao]
      );
      if (email === 'engenheiro@teste.com') engenheiroId = result.rows[0].id;
      else proprietarioId = result.rows[0].id;
      console.log('Criado usuário:', email, result.rows[0].id);
    }

    if (!engenheiroId || !proprietarioId) {
      const r = await client.query('SELECT id, email FROM users WHERE LOWER(email) IN ($1, $2)', ['engenheiro@teste.com', 'proprietario@teste.com']);
      r.rows.forEach(row => {
        if (row.email === 'engenheiro@teste.com') engenheiroId = row.id;
        else proprietarioId = row.id;
      });
    }

    // ---- Obras ----
    const obrasIds = [];
    const obrasData = [
      {
        nome: 'Reforma Residencial Centro',
        proprietario_email: 'proprietario@teste.com',
        proprietario_nome: 'Maria Santos (Propr.)',
        endereco_cep: '01310-100',
        endereco_logradouro: 'Av. Paulista',
        endereco_numero: '1000',
        endereco_bairro: 'Bela Vista',
        endereco_cidade: 'São Paulo',
        endereco_uf: 'SP',
        data_inicio: '2026-01-15',
        data_final: '2026-06-30',
        prazo: '180',
        status: 'Em andamento',
        etapas: JSON.stringify([
          { nome: 'Demolição', descricao: 'Remoção de revestimentos', status: 'Concluída', dataInicio: '2026-01-20', dataFim: '2026-02-01', subetapas: [] },
          { nome: 'Alvenaria', descricao: 'Paredes e vedação', status: 'Em andamento', subetapas: [] }
        ])
      },
      {
        nome: 'Galpão Industrial ABC',
        proprietario_email: 'proprietario@teste.com',
        proprietario_nome: 'Maria Santos (Propr.)',
        endereco_cep: '06210-030',
        endereco_logradouro: 'Rua das Indústrias',
        endereco_numero: '500',
        endereco_bairro: 'Distrito Industrial',
        endereco_cidade: 'Osasco',
        endereco_uf: 'SP',
        data_inicio: '2026-02-01',
        data_final: '2026-08-31',
        prazo: '210',
        status: 'Em andamento',
        etapas: JSON.stringify([])
      }
    ];

    for (const o of obrasData) {
      const r = await client.query(
        `INSERT INTO obras (
          nome, proprietario_id, proprietario_email, owner_email, proprietario_nome, proprietario_pendente,
          created_by_id, engenheiro_id, responsavel_nome,
          endereco_cep, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_uf,
          data_inicio, data_final, prazo, status, etapas
        ) VALUES ($1, $2, $3, $3, $4, false, $5, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id`,
        [
          o.nome, proprietarioId, o.proprietario_email, o.proprietario_nome, engenheiroId, 'Carlos Silva (Eng.)',
          o.endereco_cep, o.endereco_logradouro, o.endereco_numero, o.endereco_bairro, o.endereco_cidade, o.endereco_uf,
          o.data_inicio, o.data_final, o.prazo, o.status, o.etapas
        ]
      );
      obrasIds.push(r.rows[0].id);
      console.log('Criada obra:', o.nome, r.rows[0].id);
    }

    const obraComChat = obrasIds[0];

    // ---- Mensagens (na primeira obra) ----
    const mensagens = [
      { texto: 'Bom dia! Iniciando acompanhamento desta obra.', autor_nome: 'Carlos Silva (Eng.)', autor_id: engenheiroId },
      { texto: 'Demolição concluída. Podemos agendar a próxima etapa?', autor_nome: 'Carlos Silva (Eng.)', autor_id: engenheiroId },
      { texto: 'Sim, combinado para segunda-feira. Obrigada!', autor_nome: 'Maria Santos (Propr.)', autor_id: proprietarioId }
    ];
    for (const m of mensagens) {
      await client.query(
        `INSERT INTO mensagens (obra_id, autor_id, autor_nome, texto) VALUES ($1, $2, $3, $4)`,
        [obraComChat, m.autor_id, m.autor_nome, m.texto]
      );
    }
    console.log('Inseridas', mensagens.length, 'mensagens na obra', obraComChat);

    // ---- Foto: arquivo em disco + registro na tabela ----
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'));
    const obraDir = path.join(uploadDir, obraComChat);
    if (!fs.existsSync(obraDir)) fs.mkdirSync(obraDir, { recursive: true });
    const fileName = `${Date.now()}-teste-foto.png`;
    const filePath = path.join(obraDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(MINI_PNG_BASE64, 'base64'));
    const relativePath = `${obraComChat}/${fileName}`;

    await client.query(
      `INSERT INTO fotos (obra_id, autor_id, autor_nome, descricao, file_name, file_path, url, tamanho, tipo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        obraComChat,
        engenheiroId,
        'Carlos Silva (Eng.)',
        'Foto de teste - andamento da obra',
        fileName,
        relativePath,
        '', // url opcional; o frontend monta com /api/uploads/
        Buffer.from(MINI_PNG_BASE64, 'base64').length,
        'image/png'
      ]
    );
    console.log('Criada 1 foto na obra', obraComChat, '->', relativePath);

    console.log('\n--- Dados de teste criados ---');
    console.log('Engenheiro:  engenheiro@teste.com  /', SENHA_PADRAO);
    console.log('Proprietário: proprietario@teste.com /', SENHA_PADRAO);
    console.log('Obras:', obrasIds.length, '| Mensagens:', mensagens.length, '| Fotos: 1');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Erro no seed:', err.message);
  process.exit(1);
});
