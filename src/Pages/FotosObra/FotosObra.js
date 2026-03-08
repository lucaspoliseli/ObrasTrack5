import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext/AuthContext';
import obraService from '../../services/obraService';
import fotoService from '../../services/fotoService';
import './FotosObra.css';

export default function FotosObra() {
  const { id } = useParams();
  const { user } = useAuth();

  const [itens, setItens] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [arquivos, setArquivos] = useState([]);
  const [fotoAberta, setFotoAberta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const [obra, setObra] = useState(null);
  const role = (user?.funcao || user?.role || user?.papel || '').toString().trim().toLowerCase();
  const isEng = !!user && (role.includes('engenheiro') || role.startsWith('eng'));
  
  // Carregar obra e verificar permissões
  useEffect(() => {
    async function loadObra() {
      if (id) {
        try {
          const obraEncontrada = await obraService.getObraById(id);
          setObra(obraEncontrada || null);
        } catch (err) {
          console.error('Erro ao carregar obra:', err);
          setObra(null);
        }
      }
    }

    loadObra();
  }, [id]);

  const podeEditar = isEng && obra && String(user?.uid) === String(obra?.engenheiroId);

  // Carregar fotos do Firestore
  useEffect(() => {
    async function loadFotos() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const fotos = await fotoService.getFotosByObra(id);
        setItens(fotos);
      } catch (err) {
        console.error('Erro ao carregar fotos:', err);
        setError('Erro ao carregar fotos. Tente novamente.');
        setItens([]);
      } finally {
        setLoading(false);
      }
    }

    loadFotos();
  }, [id]);

  // Fechar modal com ESC
  useEffect(() => {
    function handleEscKey(event) {
      if (event.key === 'Escape') {
        setFotoAberta(null);
      }
    }
    
    if (fotoAberta) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden'; // Previne scroll do body quando modal está aberto
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [fotoAberta]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!podeEditar) return;
    if (!arquivos || arquivos.length === 0) return;
    if (!user || !user.uid) {
      alert('É preciso estar logado para enviar fotos.');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const filesArray = Array.from(arquivos);
      const autorNome = user.displayName || user.nome || user.email || 'Engenheiro';
      const descricaoTexto = descricao.trim();

      // Upload de cada arquivo
      const novasFotos = [];
      for (const file of filesArray) {
        try {
          const foto = await fotoService.uploadFoto(
            file,
            id,
            user.uid,
            autorNome,
            descricaoTexto
          );
          novasFotos.push(foto);
        } catch (uploadError) {
          console.error('Erro ao fazer upload da foto:', file.name, uploadError);
          alert(`Erro ao enviar ${file.name}: ${uploadError.message}`);
        }
      }

      if (novasFotos.length > 0) {
        // Atualizar lista de fotos
        setItens([...novasFotos, ...itens]);
        // Limpar formulário
        setArquivos([]);
        setDescricao('');
        const input = document.getElementById('fotos-input');
        if (input) input.value = '';
      }
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
      setError('Erro ao enviar fotos. Tente novamente.');
      alert('Erro ao enviar fotos: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(idFoto) {
    if (!podeEditar) return;
    if (!window.confirm('Tem certeza que deseja excluir esta foto?')) return;

    try {
      setError(null);
      await fotoService.deleteFoto(idFoto);
      // Remover da lista
      setItens(itens.filter(f => f.id !== idFoto));
    } catch (err) {
      console.error('Erro ao deletar foto:', err);
      setError('Erro ao excluir foto. Tente novamente.');
      alert('Erro ao excluir foto: ' + (err.message || 'Erro desconhecido'));
    }
  }

  const grid = useMemo(() => itens, [itens]);

  return (
    <div className="fotos-obra-bg">
      <section className="container fotos-obra">
        <h2 className="fotos-obra-titulo">Fotos da Obra</h2>
        <div style={{marginTop: 32}} />
        
        {error && (
          <div style={{ 
            padding: '12px', 
            margin: '12px 0', 
            backgroundColor: '#fee', 
            color: '#c00', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {podeEditar && (
          <form className="fotos-form" onSubmit={handleUpload} style={{maxWidth: 1200, margin: '0 auto', textAlign: 'center'}}>
            <label className="fotos-label">Descrição (opcional)</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Fundação concluída, piso nivelado..."
              style={{marginBottom: 2}}
              disabled={uploading}
            />
            <input 
              id="fotos-input" 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={(e) => setArquivos(e.target.files)} 
              disabled={uploading}
            />
            <button 
              className="botao-retangular" 
              type="submit" 
              style={{marginTop: '13px', marginBottom: '7px'}}
              disabled={uploading || !arquivos || arquivos.length === 0}
            >
              {uploading ? 'Enviando...' : 'Enviar fotos'}
            </button>
          </form>
        )}

        {loading ? (
          <p className="fotos-vazio" style={{textAlign: 'center', marginTop: '28px'}}>
            Carregando fotos...
          </p>
        ) : grid.length === 0 ? (
          <p className="fotos-vazio" style={{textAlign: 'center', marginTop: '28px'}}>
            Nenhuma foto enviada ainda.
          </p>
        ) : (
          <ul className="fotos-grid">
            {grid.map((f) => (
              <li key={f.id} className="fotos-card">
                <div className="foto-thumb" onClick={() => setFotoAberta(f)} style={{cursor: 'pointer'}}>
                  <img src={f.url} alt={f.descricao || f.fileName} loading="lazy" />
                </div>
                <div className="foto-meta">
                  <div className="foto-desc">{f.descricao || '—'}</div>
                  <div className="foto-info">
                    {(new Date(f.dataISO || f.criadoEm)).toLocaleString('pt-BR')} • {f.autorNome || '—'}
                  </div>
                  {podeEditar && (
                    <button className="btn-excluir" onClick={() => handleDelete(f.id)} disabled={uploading}>
                      Excluir
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="voltar-links voltar-bottom">
          <Link to={`/detalhesObra/${id}`} className="link-voltar">Voltar para detalhes</Link>
        </div>
      </section>
      
      {/* Modal para visualizar foto completa */}
      {fotoAberta && (
        <div className="foto-modal-overlay" onClick={() => setFotoAberta(null)}>
          <div className="foto-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="foto-modal-close" onClick={() => setFotoAberta(null)}>×</button>
            <img 
              src={fotoAberta.url} 
              alt={fotoAberta.descricao || fotoAberta.fileName}
              className="foto-modal-imagem"
            />
            <div className="foto-modal-info">
              <div className="foto-modal-desc">{fotoAberta.descricao || '—'}</div>
              <div className="foto-modal-meta">
                {(new Date(fotoAberta.dataISO || fotoAberta.criadoEm)).toLocaleString('pt-BR')} • {fotoAberta.autorNome || '—'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
