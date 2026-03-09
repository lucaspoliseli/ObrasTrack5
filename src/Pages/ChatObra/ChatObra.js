import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext/AuthContext';
import obraService from '../../services/obraService';
import chatService from '../../services/chatService';
import './ChatObra.css';

export default function ChatObra() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [obraNome, setObraNome] = useState('');
  const [temPermissao, setTemPermissao] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Carregar nome da obra e verificar permissões
  useEffect(() => {
    async function loadObra() {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        console.log('[ChatObra] useParams id:', id, 'user.uid:', user?.uid);
        let obra = null;
        try {
          obra = await obraService.getObraById(id);
          console.log('[ChatObra] obraCarregada.id:', obra?.id);
        } catch (e) {
          console.warn('Erro ao carregar obra via obraService:', e);
        }

        if (!obra) {
          alert('Obra não encontrada.');
          navigate('/obras');
          return;
        }

        setObraNome(obra.nome || 'Obra');

        // Verificar se usuário tem permissão (é proprietário OU engenheiro da obra)
        const isEngenheiro = String(user?.uid) === String(obra?.engenheiroId);
        const isProprietario = String(user?.uid) === String(obra?.proprietarioId) ||
          ((obra?.proprietarioEmail || '').toLowerCase() === (user?.email || '').toLowerCase());

        console.log('[ChatObra] permissões:', { isEngenheiro, isProprietario });

        if (!isEngenheiro && !isProprietario) {
          alert('Você não tem permissão para acessar o chat desta obra.');
          navigate('/obras');
          return;
        }

        setTemPermissao(true);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar obra:', err);
        setLoading(false);
        navigate('/obras');
      }
    }

    loadObra();
  }, [id, user, navigate]);

  // Carregar mensagens do chat do Firebase e escutar mudanças em tempo real
  useEffect(() => {
    if (!id || !temPermissao) return;

    setLoading(true);
    
    // Escutar mensagens em tempo real
    const unsubscribe = chatService.onMensagensChange(id, (msgs) => {
      setMensagens(msgs);
      setLoading(false);
      
      // Scroll automático para a última mensagem
      setTimeout(() => {
        const chatContainer = document.querySelector('.chat-mensagens');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    });

    // Cleanup ao desmontar
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id, temPermissao]);

  async function handleEnviarMsg(e) {
    e.preventDefault();
    if (!novaMensagem.trim() || !user || !user.uid || enviando) return;

    const texto = novaMensagem.trim();
    const textoAnterior = novaMensagem;

    try {
      setEnviando(true);
      const autorNome = user.displayName || user.nome || user.email || 'Você';
      
      // Limpar campo antes de enviar (para melhor UX)
      setNovaMensagem('');

      await chatService.enviarMensagem(id, user.uid, autorNome, texto);
      
      // A mensagem será adicionada automaticamente pelo listener em tempo real
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert(`Erro ao enviar mensagem. Detalhes: ${error?.message || 'Tente novamente.'}`);
      // Restaurar mensagem se falhar
      setNovaMensagem(textoAnterior);
    } finally {
      setEnviando(false);
    }
  }

  if (!temPermissao || loading) {
    return (
      <div className="chat-obra-page">
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <p>Carregando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-obra-page">
      <div className="chat-obra-header">
        <div>
          <h2>Chat da Obra: {obraNome}</h2>
          <p className="chat-obra-explain">
            Converse diretamente com o engenheiro ou proprietário desta obra
          </p>
        </div>
        <Link to={`/detalhesObra/${id}`} className="link-voltar-chat">
          ← Voltar para detalhes
        </Link>
      </div>

      <div className="chat-mensagens">
        {mensagens.length === 0 && (
          <p className="mensagem-vazia">Nenhuma mensagem ainda. Inicie a conversa!</p>
        )}
        {mensagens.map((msg) => (
          <div
            key={msg.id || msg.ts}
            className={msg.autorId === user?.uid ? 'mensagem-own' : 'mensagem-other'}
          >
            <strong>{msg.autorId === user?.uid ? 'Você' : msg.autorNome}</strong>:
            <span> {msg.texto}</span>
            {msg.criadoEm && (
              <small style={{ display: 'block', fontSize: '0.75em', opacity: 0.7, marginTop: '4px' }}>
                {new Date(msg.criadoEm).toLocaleString('pt-BR')}
              </small>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleEnviarMsg} className="chat-form">
        <input
          type="text"
          placeholder="Digite sua mensagem..."
          value={novaMensagem}
          onChange={(e) => setNovaMensagem(e.target.value)}
          maxLength={600}
          required
          disabled={enviando}
        />
        <button type="submit" disabled={enviando || !novaMensagem.trim()}>
          {enviando ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}

