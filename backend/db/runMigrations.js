require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Erro: DATABASE_URL não está definida. Defina no .env ou no ambiente antes de rodar as migrations.');
  process.exit(1);
}
console.log('Usando banco:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

const migrationsDir = path.join(__dirname, 'migrations');

async function run() {
  const client = await pool.connect();
  try {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    if (files.length === 0) {
      console.log('Nenhum arquivo .sql encontrado em', migrationsDir);
      return;
    }
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log('Executando:', file);
      await client.query(sql);
      console.log('OK:', file);
    }
    console.log('Migrações concluídas.');

    const tablesResult = await client.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
       ORDER BY table_name`
    );
    const tables = tablesResult.rows.map(r => r.table_name);
    console.log('Tabelas no banco:', tables.length ? tables.join(', ') : '(nenhuma)');
    if (tables.includes('users')) {
      console.log('Tabela users: criada com sucesso.');
    } else {
      console.warn('Aviso: tabela users não encontrada.');
    }
  } catch (err) {
    console.error('Erro na migração:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
