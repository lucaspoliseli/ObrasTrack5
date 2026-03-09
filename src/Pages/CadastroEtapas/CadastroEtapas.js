""// src/Pages/CadastroEtapas/CadastroEtapas.js
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import obraService from '../../services/obraService';

import TituloH3 from '../../components/Titulos/TituloH3';
import './CadastroEtapas.css';
import InputForm from '../../components/Formulario/InputForm';
import { useAuth } from '../../AuthContext/AuthContext';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { faSquareCaretDown, faSquareCaretUp } from '@fortawesome/free-regular-svg-icons';

/* =========================
   Helpers de status e datas
   ========================= */
const STATUS_OPTIONS = [
  'Pendente',
  'Em andamento',
  'Concluída',
  'Atrasada',
  'Pausada',
  'Aguardando material',
];

// garante "2025-10-28" -> Date sem fuso
function toDate(iso) {
  if (!iso) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// tenta converter "28/10/2025" OU "2025-10-28" em "2025-10-28"
function normalizeToISO(str) {
  if (!str) return '';
  // já está ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // tenta dd/mm/aaaa
  const m = str.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/); // eslint-disable-line no-useless-escape
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }

  // último recurso: Date()
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return '';
}

// calcula a diferença em dias entre ini e fim (ISO), mínimo 1
function diffDias(iniISO, fimISO) {
  const a = toDate(iniISO);
  const b = toDate(fimISO);
  if (!a || !b) return '';
  if (b < a) return '';

  const MS = 1000 * 60 * 60 * 24;
  const dias = Math.ceil((b - a) / MS);

  // se início == fim, queremos contar como 1 dia, não 0
  return String(dias === 0 ? 1 : dias);
}

function isOverdue(e) {
  const fim = toDate(e.dataFim || e.dataLimite);
  if (!fim) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const concluida = (e.status || '').toLowerCase().startsWith('concl');
  return !concluida && fim < hoje;
}

function deriveStatus(e) {
  const s = (e.status || '').toLowerCase();
  if (s) {
    if (s.startsWith('concl')) return 'Concluída';
    if (s.startsWith('paus')) return 'Pausada';
    if (s.startsWith('aguard')) return 'Aguardando material';
    if (s.startsWith('em ')) return 'Em andamento';
    if (s.startsWith('atra')) return 'Atrasada';
  }
  if (isOverdue(e)) return 'Atrasada';
  return e.status || 'Pendente';
}

// modelo inicial agora já vem com subetapas vazio (fora do componente para evitar re-criação)
const INITIAL_ETAPAS = [
    { nome: 'Pintura',       descricao: '', prazo: '', dataInicio: '', dataFim: '', status: 'Pendente', subetapas: [] },
    { nome: 'Alvenaria',     descricao: '', prazo: '', dataInicio: '', dataFim: '', status: 'Pendente', subetapas: [] },
    { nome: 'Elétrica',      descricao: '', prazo: '', dataInicio: '', dataFim: '', status: 'Pendente', subetapas: [] },
    { nome: 'Hidráulica',    descricao: '', prazo: '', dataInicio: '', dataFim: '', status: 'Pendente', subetapas: [] },
    { nome: 'Esquadrias',    descricao: '', prazo: '', dataInicio: '', dataFim: '', status: 'Pendente', subetapas: [] },
    { nome: 'Louças',        descricao: '', prazo: '', dataInicio: '', dataFim: '', status: 'Pendente', subetapas: [] },
    { nome: 'Revestimentos', descricao: '', prazo: '', dataInicio: '', dataFim: '', status: 'Pendente', subetapas: [] },
    { nome: 'Gesso',         descricao: '', prazo: '', dataInicio: '', dataFim: '', status: 'Pendente', subetapas: [] },
    { nome: 'Piso',          descricao: '', prazo: '', dataInicio: '', dataFim: '', status: 'Pendente', subetapas: [] },
];

export default function CadastroEtapas() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const obraId = Number(id);

  const [obra, setObra] = useState(null);
  const [etapas, setEtapas] = useState([]);
  const [etapasExpandidas, setEtapasExpandidas] = useState([]);

  // carregar obra e rascunho/dados prévios
  useEffect(() => {
    async function loadObra() {
      try {
        const o = await obraService.getObraById(id);
        if (!o) {
          alert('Obra não encontrada.');
          navigate('/obras');
          return;
        }

        // Verificar permissão: apenas engenheiro responsável pode editar etapas
        if (user && String(user?.uid) !== String(o?.engenheiroId)) {
          alert('Você não tem permissão para editar etapas desta obra. Apenas o engenheiro responsável pode editar.');
          navigate(`/detalhesObra/${id}`);
          return;
        }

        setObra(o);

        if (Array.isArray(o.etapas) && o.etapas.length) {
          // etapas já salvas na obra (carrega inclusive subetapas se já tiverem)
          const normalizadas = o.etapas.map(e => {
            const iniISO = normalizeToISO(e.dataInicio);
            const fimISO = normalizeToISO(e.dataFim || e.dataLimite);
            return {
              nome: e.nome || e.titulo || '',
              descricao: e.descricao || '',
              prazo: diffDias(iniISO, fimISO),
              dataInicio: iniISO,
              dataFim: fimISO,
              status: deriveStatus({
                status: e.status || 'Pendente',
                dataInicio: iniISO,
                dataFim: fimISO,
              }),
              subetapas: Array.isArray(e.subetapas) ? e.subetapas : [],
            };
          });
          setEtapas(normalizadas);
        } else {
          // se não tem nada salvo ainda, usa as iniciais
          setEtapas(INITIAL_ETAPAS);
        }
      } catch (error) {
        console.error('Erro ao carregar obra:', error);
        alert('Erro ao carregar obra.');
        navigate('/obras');
      }
    }
    loadObra();
  }, [id, navigate, user]);

  const toggleExpandir = (index) => {
    setEtapasExpandidas(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const atualizarCampo = (index, campo, valor) => {
    const novas = [...etapas];
    const etapaAtual = { ...novas[index], [campo]: valor };

    // datas: normalizar e recalcular prazo/status
    if (campo === 'dataInicio' || campo === 'dataFim') {
      const inicioISO = campo === 'dataInicio'
        ? normalizeToISO(valor)
        : normalizeToISO(etapaAtual.dataInicio);
      const fimISO = campo === 'dataFim'
        ? normalizeToISO(valor)
        : normalizeToISO(etapaAtual.dataFim);

      etapaAtual.dataInicio = inicioISO;
      etapaAtual.dataFim = fimISO;
      etapaAtual.prazo = diffDias(inicioISO, fimISO);
      etapaAtual.status = deriveStatus(etapaAtual);
    }

    if (campo === 'status') {
      etapaAtual.status = valor;
    }

    novas[index] = etapaAtual;

    setEtapas(novas);
  };

  const adicionarEtapa = () => {
    // impede várias etapas completamente vazias
    const existeVazia = etapas.some(e =>
      !e.nome && !e.descricao && !e.dataInicio && !e.dataFim
    );
    if (existeVazia) {
      alert('Preencha ou remova a etapa em branco antes de adicionar outra.');
      return;
    }

    const nova = {
      nome: '',
      descricao: '',
      prazo: '',
      dataInicio: '',
      dataFim: '',
      status: 'Pendente',
      subetapas: [],
    };

    const novas = [nova, ...etapas];
    setEtapas(novas);
    setEtapasExpandidas(prev => [0, ...prev.map(i => i + 1)]);
  };

  const removerEtapa = (index) => {
    const novas = etapas.filter((_, i) => i !== index);
    setEtapas(novas);
    setEtapasExpandidas(prev =>
      prev
        .filter(i => i !== index)
        .map(i => (i > index ? i - 1 : i))
    );
  };

  /* =========================
     SUBETAPAS
     ========================= */

  // adicionar uma subetapa vazia dentro de uma etapa específica
  const adicionarSubetapa = (indexEtapa) => {
    const novas = [...etapas];
    const atual = { ...novas[indexEtapa] };

    const subetapasAtualizadas = Array.isArray(atual.subetapas)
      ? [...atual.subetapas]
      : [];

    subetapasAtualizadas.push({
      nome: '',
      status: 'Pendente',
    });

    atual.subetapas = subetapasAtualizadas;
    novas[indexEtapa] = atual;

    setEtapas(novas);
  };

  // atualizar nome/status da subetapa
  const atualizarSubetapaCampo = (indexEtapa, indexSub, campo, valor) => {
    const novas = [...etapas];
    const etapaAlvo = { ...novas[indexEtapa] };

    const subCopy = etapaAlvo.subetapas.map((s, i) =>
      i === indexSub ? { ...s, [campo]: valor } : s
    );

    etapaAlvo.subetapas = subCopy;
    novas[indexEtapa] = etapaAlvo;

    setEtapas(novas);
  };

  // remover subetapa específica
  const removerSubetapa = (indexEtapa, indexSub) => {
    const novas = [...etapas];
    const etapaAlvo = { ...novas[indexEtapa] };

    etapaAlvo.subetapas = etapaAlvo.subetapas.filter((_, i) => i !== indexSub);

    novas[indexEtapa] = etapaAlvo;
    setEtapas(novas);
  };

  // valida só etapas com nome preenchido
  const validar = () => {
    if (!obra) return 'Obra não encontrada.';

    const etapasPreenchidas = etapas.filter(
      (e) => e.nome && e.nome.trim() !== ""
    );

    if (etapasPreenchidas.length === 0) {
      return 'Adicione pelo menos uma etapa preenchida.';
    }

    // obrigatórios: nome, descrição, datas
    const faltandoBasico = etapasPreenchidas.some((e) =>
      !e.descricao ||
      !e.dataInicio ||
      !e.dataFim
    );
    if (faltandoBasico) {
      return 'Preencha nome, descrição e datas (início e fim) em cada etapa.';
    }

    // coerência das datas
    const datasInvalidas = etapasPreenchidas.some((e) => {
      const ini = toDate(e.dataInicio);
      const fim = toDate(e.dataFim);
      return ini && fim && fim < ini;
    });
    if (datasInvalidas) {
      return 'A Data Fim não pode ser menor que a Data Início.';
    }

    return null;
  };

  const salvarTudo = async () => {
    const erro = validar();
    if (erro) {
      alert(erro);
      return;
    }

    // salva só etapas realmente preenchidas
    const etapasPreenchidas = etapas.filter(
      (e) => e.nome && e.nome.trim() !== ""
    );

    const etapasSalvar = etapasPreenchidas.map((e, i) => {
      const statusFinal = deriveStatus(e);
      return {
        id: i + 1,
        obraId,
        titulo: e.nome,
        descricao: e.descricao,
        dataInicio: e.dataInicio,
        dataLimite: e.dataFim,
        prazo: Number(e.prazo) || undefined,
        status: statusFinal,
        aguardandoMaterial: /aguard/i.test(statusFinal),
        responsavel: obra?.responsavelNome || '—',

        // 👇 agora também salvamos as subetapas
        subetapas: (e.subetapas || []).map((sub, subIndex) => ({
          id: `${i + 1}.${subIndex + 1}`,
          nome: sub.nome,
          status: sub.status || 'Pendente',
        })),
      };
    });

    // Atualiza apenas as etapas no Firebase, sem alterar o status da obra
    // O status da obra só pode ser alterado pelo engenheiro na tela "Editar Obra"
    await obraService.updateObra(id, { etapas: etapasSalvar });

    // volta p/ detalhes
    navigate(`/detalhesObra/${id}`, { replace: true });
  };

  if (!obra) {
    return (
      <section className="container">
        <TituloH3 value="Cadastro de Etapas da Obra" />
        <p>Carregando dados da obra...</p>
      </section>
    );
  }

  return (
    <section className="container">
      <TituloH3 value={`Cadastro de Etapas — ${obra.nome || `Obra #${id}`}`} />

      <div className="adicionar-etapa-header">
        <button className="botao-nova-etapa" onClick={adicionarEtapa}>
          <span style={{fontSize: '1.4rem', fontWeight: 'bold', marginRight: '8px'}}>+</span>
          Nova Etapa
        </button>
      </div>

      <div className="pages-section-background">
        <ul className="lista-etapas">
          {etapas.map((etapa, index) => (
            <li key={index} className="etapa-item">
              <div className="linha-etapa">
                <span>{etapa.nome || 'Etapa sem nome'}</span>
                <div className="acoes-etapa">
                  <button
                    className="icone-botao"
                    title="Remover etapa"
                    onClick={() => removerEtapa(index)}
                  >
                    <FontAwesomeIcon icon={faTrashCan} size="lg" />
                  </button>
                  <button
                    className="icone-botao"
                    title={etapasExpandidas.includes(index) ? 'Recolher' : 'Expandir'}
                    onClick={() => toggleExpandir(index)}
                  >
                    <FontAwesomeIcon
                      icon={etapasExpandidas.includes(index) ? faSquareCaretUp : faSquareCaretDown}
                      size="lg"
                    />
                  </button>
                </div>
              </div>

              {etapasExpandidas.includes(index) && (
                <div className="detalhes-etapa">
                  {etapa.dataInicio &&
                    etapa.dataFim &&
                    toDate(etapa.dataFim) < toDate(etapa.dataInicio) && (
                      <p className="erro-validacao">
                        Data Fim não pode ser menor que Data Início
                      </p>
                    )}

                  <InputForm
                    className={`uma-coluna ${!etapa.nome ? 'input-com-erro' : ''}`}
                    label="Nome da Etapa *"
                    value={etapa.nome}
                    required
                    onChange={(e) => atualizarCampo(index, 'nome', e.target.value)}
                  />

                  <InputForm
                    className="duas-colunas"
                    type="textarea"
                    label="Descrição *"
                    value={etapa.descricao}
                    required
                    onChange={(e) => atualizarCampo(index, 'descricao', e.target.value)}
                  />

                  <div className="uma-coluna">
                    <label className="input-label">Status</label>
                    <select
                      className="input-select"
                      value={etapa.status || 'Pendente'}
                      onChange={(e) => atualizarCampo(index, 'status', e.target.value)}
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <InputForm
                    className="uma-coluna"
                    label="Prazo (dias)"
                    type="number"
                    value={etapa.prazo}
                    readOnly
                  />

                  <InputForm
                    className="uma-coluna"
                    label="Data Início *"
                    type="date"
                    value={etapa.dataInicio}
                    required
                    onChange={(e) => atualizarCampo(index, 'dataInicio', e.target.value)}
                  />

                  <InputForm
                    className="uma-coluna"
                    label="Data Fim *"
                    type="date"
                    value={etapa.dataFim}
                    required
                    onChange={(e) => atualizarCampo(index, 'dataFim', e.target.value)}
                  />

                  {/* =========================
                      BLOCO DE SUBETAPAS
                      ========================= */}
                  <div className="subetapas-bloco">
                    <div className="subetapas-header">
                      <h4>Subetapas</h4>
                      <button
                        className="botao-retangular pequeno"
                        onClick={() => adicionarSubetapa(index)}
                      >
                        + Subetapa
                      </button>
                    </div>

                    {(!etapa.subetapas || etapa.subetapas.length === 0) && (
                      <p className="subetapa-vazia">
                        Nenhuma subetapa adicionada ainda.
                      </p>
                    )}

                    {etapa.subetapas && etapa.subetapas.length > 0 && (
                      <ul className="lista-subetapas">
                        {etapa.subetapas.map((sub, subIndex) => (
                          <li key={subIndex} className="subetapa-item">
                            <div className="subetapa-linha">
                              <InputForm
                                className="uma-coluna"
                                label="Nome da Subetapa"
                                value={sub.nome}
                                onChange={(e) =>
                                  atualizarSubetapaCampo(index, subIndex, 'nome', e.target.value)
                                }
                              />

                              <div className="uma-coluna">
                                <label className="input-label">Status</label>
                                <select
                                  className="input-select"
                                  value={sub.status || 'Pendente'}
                                  onChange={(e) =>
                                    atualizarSubetapaCampo(
                                      index,
                                      subIndex,
                                      'status',
                                      e.target.value
                                    )
                                  }
                                >
                                  {STATUS_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>

                              <button
                                className="icone-botao remover-subetapa"
                                title="Remover subetapa"
                                onClick={() => removerSubetapa(index, subIndex)}
                              >
                                <FontAwesomeIcon icon={faTrashCan} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {/* ========================= */}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="botoes-acoes">
        <button
          className="botao-retangular cancelar"
          onClick={() => navigate(`/detalhesObra/${id}`)}
        >
          Voltar
        </button>
        <button className="botao-retangular seguir" onClick={salvarTudo}>
          Salvar
        </button>
      </div>
    </section>
  );
}
