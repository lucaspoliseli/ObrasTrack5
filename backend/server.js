require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const obrasRoutes = require('./routes/obras');
const mensagensRoutes = require('./routes/mensagens');
const fotosRoutes = require('./routes/fotos');
const notificacoesRoutes = require('./routes/notificacoes');

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Uploads estáticos (fotos)
app.use('/api/uploads', express.static(UPLOAD_DIR));

// Auth (público)
app.use('/api/auth', authRoutes);

// Rotas protegidas
app.use('/api/users', usersRoutes);

// Obras: obras primeiro (/, /usuario, /:id), depois mensagens e fotos (/:obraId/...)
app.use('/api/obras', obrasRoutes);      // GET /, /usuario, /:id, POST /, PUT /:id, DELETE /:id
app.use('/api/obras', mensagensRoutes);  // GET/POST /api/obras/:obraId/mensagens
app.use('/api/obras', fotosRoutes);      // GET/POST /api/obras/:obraId/fotos, DELETE /api/obras/foto/:fotoId
app.use('/api/notifications', notificacoesRoutes); // Notificações de mensagens/imagens

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Planeja Obra API' });
});

app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

const server = app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Porta ${PORT} já está em uso. Encerre o processo que a utiliza ou use outra porta (variável PORT).`);
  } else {
    console.error('Erro ao iniciar o servidor:', err);
  }
  process.exit(1);
});
