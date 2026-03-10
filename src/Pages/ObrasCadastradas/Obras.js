// src/Pages/ObrasCadastradas/Obras.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Obras.css';
import { useAuth } from '../../AuthContext/AuthContext';
import { USE_API, API_URL } from '../../config';
import obraService from '../../services/obraService';
import notificationService from '../../services/notificationService';

function fmtBR(data) {
  if (!data) return '—';
  const d = new Date(data);
  if (isNaN(d.getTime())) return data;
  return d.toLocaleDateString('pt-BR');
}

function getStatusDinamico(obra) {
  const hoje = new Date();
  const final = obra.dataFinal ? new Date(obra.dataFinal) : null;
  const statusSalvo = (obra.status || '').toLowerCase();
  if (statusSalvo.includes('finaliz')) return 'Finalizada';
  if (!final) return 'Em Andamento';
  if (final >= hoje) return 'Em Andamento';
  return 'Atrasada';
}

export default function Obras() {
  const { user } = useAuth();
  const [filtro, setFiltro] = useState('Todas');
  const [busca, setBusca] = useState('');
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifByObra, setNotifByObra] = useState({});

  useEffect(() => {
    // Debug temporário: garantir modo API e baseURL
    console.log('[Obras] Config API', { USE_API, API_URL });

    async function loadObras() {
      try {
        setLoading(true);
        let list = [];
        if (USE_API) {
          try {
            list = await obraService.getObrasDoUsuario({ uid: user?.uid, email: user?.email });
          } catch (e) {
            console.warn('Erro ao carregar obras da API:', e);
          }
        } else {
          try {
            const obrasFirebase = await obraService.getObras();
            const funcao = (user?.funcao || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
            if (funcao === 'engenheiro') {
              list = obrasFirebase.filter(o => o.engenheiroId === user?.uid || o.createdById === user?.uid);
            } else if (funcao === 'proprietario') {
              const emailLower = (user?.email || '').toLowerCase();
              list = obrasFirebase.filter(o =>
                o.proprietarioId === user?.uid ||
                (o.proprietarioEmail || '').toLowerCase() === emailLower ||
                (o.ownerEmail || '').toLowerCase() === emailLower
              );
            }
          } catch (e) {
            console.warn('Erro ao carregar obras do Firebase:', e);
          }
        }
        setObras(list);

        // Buscar notificações não lidas (apenas quando usando API)
        if (USE_API && list.length > 0) {
          try {
            const summary = await notificationService.getUnreadSummary();
            setNotifByObra(summary.byObra || {});
          } catch (e) {
            console.warn('Erro ao carregar notificações de obras:', e);
            setNotifByObra({});
          }
        } else {
          setNotifByObra({});
        }
      } catch (error) {
        console.error('Erro ao carregar obras:', error);
        setObras([]);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadObras();
    } else {
      setLoading(false);
    }
  }, [user]);

  function normalizeString(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const statusMapFiltro = {
    'Em Andamento': status => normalizeString(status).includes('andamento'),
    'Finalizada':   status => normalizeString(status).includes('finaliz'),
    'Atrasada':     status => normalizeString(status).includes('atrasa'),
  };

  const obrasFiltradas = obras.filter((obra) => {
    const statusDinamico = getStatusDinamico(obra);
    if (filtro === 'Todas') return (obra.nome || '').toLowerCase().includes(busca.toLowerCase());
    const compara = statusMapFiltro[filtro];
    if (!compara) return false;
    const combinaStatus = compara(normalizeString(statusDinamico));
    const combinaBusca = (obra.nome || '').toLowerCase().includes(busca.toLowerCase());
    return combinaStatus && combinaBusca;
  });

  const calcularPrazoAtualEstimado = (dataInicioStr, prazoStr) => {
    if (!dataInicioStr || !prazoStr) return '—';
    const dataInicio = new Date(dataInicioStr);
    const prazoTotal = parseInt(prazoStr, 10);
    if (isNaN(prazoTotal)) return '—';
    const hoje = new Date();
    let diasPassados = Math.floor((hoje - dataInicio) / (1000 * 60 * 60 * 24));
    if (diasPassados < 0) diasPassados = 0;
    if (diasPassados > prazoTotal) diasPassados = prazoTotal;
    return `${diasPassados} / ${prazoTotal}`;
  };

  // Normalizar função do usuário para comparação consistente
  const userFuncao = (user?.funcao || '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
  const isEngineer = userFuncao === 'engenheiro';

  return (
    <section id='obras-section'>
      {isEngineer ? (
        <section id='filtro-obras'>
          <nav>
            <div className='buttons-filtro'>
              <button className={filtro === 'Todas' ? 'active' : ''} onClick={() => setFiltro('Todas')}>Todas as Obras</button>
              <button className={filtro === 'Em Andamento' ? 'active' : ''} onClick={() => setFiltro('Em Andamento')}>Obras em Andamento</button>
              <button className={filtro === 'Finalizada' ? 'active' : ''} onClick={() => setFiltro('Finalizada')}>Obras Finalizadas</button>
              <button className={filtro === 'Atrasada' ? 'active' : ''} onClick={() => setFiltro('Atrasada')}>Obras Atrasadas</button>
            </div>

            <input
              className='input-buscar'
              type='text'
              placeholder='Buscar Obras...'
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <Link className='botao-retangular' to='/cadastroobra'>
              Criar Nova Obra
            </Link>
          </nav>
        </section>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1.8rem', color: '#263f52', marginBottom: '8px' }}>Minhas Obras</h2>
          <p style={{ color: '#666', fontSize: '1rem' }}>
            Visualize todas as obras associadas a você
          </p>
        </div>
      )}
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <p>Carregando obras...</p>
        </div>
      ) : (
        <ul id="lista-obras">
          <li className="cabecalho-tabela">
            <p className="col col-nome">Nome da obra</p>
            <p className="col col-prazo">Prazo atual/estimado</p>
            <p className="col col-final">Data final</p>
            <p className="col col-status">Status</p>
          </li>
          {obrasFiltradas.length > 0 ? (
          obrasFiltradas.map((obra) => {
            const statusExtra = getStatusDinamico(obra);
            const notif = notifByObra[obra.id] || { total: 0 };
            const totalNotif = notif.total || 0;
            return (
              <li className="item-lista" key={obra.id}>
                <Link to={`/detalhesObra/${obra.id}`} className="col col-nome">
                  <span className="obra-nome-wrapper">
                    {obra.nome}
                    {totalNotif > 0 && (
                      <span className="notification-badge">
                        {totalNotif > 9 ? '9+' : totalNotif}
                      </span>
                    )}
                  </span>
                </Link>
                <p className="col col-prazo">{calcularPrazoAtualEstimado(obra.dataInicio, obra.prazo)}</p>
                <p className="col col-final">{fmtBR(obra.dataFinal)}</p>
                <div className={`col col-status tag-status ${statusExtra?.replace(/\s+/g, '-').toLowerCase() || ''}`}>
                  <p>{statusExtra}</p>
                </div>
              </li>
            );
          })
          ) : (
            <li className="item-lista" style={{paddingLeft: '24px'}}>Nenhuma obra encontrada.</li>
          )}
        </ul>
      )}
    </section>
  );
}
