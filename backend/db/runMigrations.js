require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const migrationsDir = path.join(__dirname, 'migrations');

async function run() {
  const client = await pool.connect();
  try {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log('Executando:', file);
      await client.query(sql);
      console.log('OK:', file);
    }
    console.log('Migrações concluídas.');
  } catch (err) {
    console.error('Erro na migração:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
