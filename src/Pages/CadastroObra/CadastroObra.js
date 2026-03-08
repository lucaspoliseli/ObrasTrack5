// src/Pages/CadastroObra/CadastroObra.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InputForm from '../../components/Formulario/InputForm';
import TituloH3 from '../../components/Titulos/TituloH3';
import './CadastroObra.css';
import { addObra } from '../../services/obraService'; // named export
import { useAuth } from '../../AuthContext/AuthContext';
import userService from '../../services/userService';

function CadastroObra() {
  const [proprietarioNome, setProprietarioNome] = useState('');
  const [proprietarioEmail, setProprietarioEmail] = useState('');
  const [contatoProprietario, setContatoProprietario] = useState('');
  const [nomeObra, setNomeObra] = useState('');
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [complemento, setComplemento] = useState('');
  const [erroCep, setErroCep] = useState('');
  const [erroData, setErroData] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [prazo, setPrazo] = useState('');
  const [diasPassados, setDiasPassados] = useState('');
  const [observacao, setObservacao] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const cancelar = (e) => {
    e.preventDefault();
    navigate('/obras');
  };

  // Função auxiliar para validar se data final é maior ou igual à data de início
  const validarDatas = (dataInicioStr, dataFinalStr) => {
    if (!dataInicioStr || !dataFinalStr) {
      return { valido: false, mensagem: 'Preencha ambas as datas.' };
    }
    
    // Comparar strings diretamente (formato YYYY-MM-DD)
    // Isso evita problemas de timezone
    if (dataFinalStr < dataInicioStr) {
      return { 
        valido: false, 
        mensagem: 'A data final não pode ser anterior à data de início.' 
      };
    }
    
    return { valido: true, mensagem: '' };
  };

  async function fetchWithTimeout(url, ms = 6000, options = {}) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { ...options, signal: ctrl.signal });
      clearTimeout(id);
      return res;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }

  const seguir = async (e) => {
    e.preventDefault();

    if (
      !proprietarioEmail || !nomeObra ||
      !cep || !rua || !bairro || !cidade || !numero ||
      !dataInicio || !dataFinal
    ) {
      alert('Preencha todos os campos obrigatórios antes de continuar.');
      return;
    }

    // Validar se a data de início é anterior ou igual à data final
    const validacao = validarDatas(dataInicio, dataFinal);
    if (!validacao.valido) {
      setErroData(validacao.mensagem);
      alert(validacao.mensagem + ' Por favor, corrija as datas antes de continuar.');
      return;
    }

    // Limpar erro antes de prosseguir
    setErroData('');

    if (!user || !user.uid) {
      alert('É preciso estar logado para cadastrar uma obra.');
      navigate('/login');
      return;
    }

    const emailPropTrim = (proprietarioEmail || '').trim();
    const emailPropLower = emailPropTrim.toLowerCase();

    // Verificar se o proprietário já está cadastrado no Firestore
    let proprietarioId = null;
    try {
      const proprietarioExistente = await userService.getUserByEmail(emailPropLower);
      if (proprietarioExistente && proprietarioExistente.uid) {
        proprietarioId = proprietarioExistente.uid;
        console.log('Proprietário encontrado no Firestore:', proprietarioId);
      }
    } catch (error) {
      console.warn('Erro ao verificar proprietário:', error);
      // Continuar mesmo se não conseguir verificar
    }

    // build payload and normalize
    const payload = {
      nome: (nomeObra || '').trim(),
      proprietarioEmail: emailPropLower,
      ownerEmail: emailPropLower,
      proprietarioNome: (proprietarioNome || '').trim(),
      contatoProprietario: (contatoProprietario || '').trim(),
      proprietarioPendente: !proprietarioId, // Se não tiver ID, está pendente
      proprietarioId: proprietarioId, // null se não encontrado, será atualizado quando o proprietário se cadastrar

      createdById: user.uid,
      responsavelNome: user.displayName || user.nome || '',
      engenheiroId: user.uid,

      endereco: {
        cep: (cep || '').trim(),
        rua: (rua || '').trim(),
        bairro: (bairro || '').trim(),
        cidade: (cidade || '').trim(),
        numero: (numero || '').toString().trim(),
        complemento: (complemento || '').trim(),
      },

      dataInicio,
      dataFinal,
      prazo,
      diasPassados,
      observacao: (observacao || '').trim(),
      status: 'Em Andamento',
      etapaAtual: 'Planejamento',
      progresso: 0,
      etapas: [],
    };

    try {
      setSubmitting(true);
      const nova = await addObra(payload);
      if (!nova || !nova.id) {
        alert('Erro ao criar obra (sem id). Verifique o console.');
        return;
      }
      navigate(`/obras/${nova.id}/etapas`, { replace: true });
    } catch (err) {
      console.error('Erro ao salvar obra:', err);
      alert(`Não foi possível salvar a obra: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const emailLower = (proprietarioEmail || '').trim().toLowerCase();
    if (!emailLower) {
      setProprietarioNome('');
      return;
    }
    
    // Buscar proprietário no Firestore
    let cancelled = false;
    (async () => {
      try {
        const proprietario = await userService.getUserByEmail(emailLower);
        if (!cancelled) {
          if (proprietario) {
            // Se encontrou o proprietário no Firestore, preencher o nome
            const nomeCompleto = proprietario.displayName || 
              `${proprietario.nome || ''} ${proprietario.sobrenome || ''}`.trim() || 
              proprietario.nome || 
              '';
            setProprietarioNome(nomeCompleto);
            // Se o proprietário já está cadastrado, podemos vincular o ID
            // Isso será feito quando a obra for salva
          }
          // Se não encontrou, não fazer nada (deixar o usuário preencher manualmente)
          // Não limpar o nome se o usuário já digitou algo
        }
      } catch (error) {
        console.warn('Erro ao buscar proprietário no Firestore:', error);
        // Em caso de erro, não fazer nada (deixar o usuário preencher manualmente)
      }
    })();
    
    return () => { cancelled = true; };
  }, [proprietarioEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (dataInicio && dataFinal) {
      // Validar usando comparação de strings (mais confiável)
      const validacao = validarDatas(dataInicio, dataFinal);
      
      if (!validacao.valido) {
        setErroData(validacao.mensagem);
        setPrazo('');
        setDiasPassados('');
        return;
      }

      // Limpar erro se as datas estiverem corretas
      setErroData('');

      // Calcular prazo e dias passados usando objetos Date
      const inicio = new Date(dataInicio + 'T00:00:00');
      const fim = new Date(dataFinal + 'T00:00:00');
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const diffTotal = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));
      setPrazo(String(diffTotal));
      let diffPassados = Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24));
      if (diffPassados < 0) diffPassados = 0;
      if (diffPassados > diffTotal) diffPassados = diffTotal;
      setDiasPassados(String(diffPassados));
    } else {
      // Se uma das datas estiver vazia, limpar valores
      setErroData('');
      setPrazo('');
      setDiasPassados('');
    }
  }, [dataInicio, dataFinal]);

  useEffect(() => {
    const onlyDigits = (cep || '').replace(/\D/g, '');
    if (onlyDigits.length !== 8) {
      setRua('');
      setBairro('');
      setCidade('');
      setErroCep('');
      return;
    }
    let cancelled = false;
    const buscarEndereco = async () => {
      try {
        let res = await fetchWithTimeout(`https://viacep.com.br/ws/${onlyDigits}/json/`, 6000);
        if (!res.ok) throw new Error(`ViaCEP HTTP ${res.status}`);
        let data = await res.json();
        if (data?.erro) throw new Error('CEP não encontrado no ViaCEP');
        if (!cancelled) {
          setRua(data.logradouro || '');
          setBairro(data.bairro || '');
          setCidade(data.localidade || '');
          setErroCep('');
        }
      } catch (e1) {
        try {
          const res2 = await fetchWithTimeout(`https://brasilapi.com.br/api/cep/v2/${onlyDigits}`, 6000);
          if (!res2.ok) throw new Error(`BrasilAPI HTTP ${res2.status}`);
          const d2 = await res2.json();
          if (!cancelled) {
            setRua(d2.street || '');
            setBairro(d2.neighborhood || '');
            setCidade(d2.city || '');
            setErroCep('');
          }
        } catch (e2) {
          if (!cancelled) {
            setErroCep('Não foi possível buscar o endereço. Preencha manualmente.');
          }
        }
      }
    };
    buscarEndereco();
    return () => { cancelled = true; };
  }, [cep]);

  return (
    <section className="container">
      <TituloH3 value="Cadastrar Nova Obra" />
      <div className="inputs-cadastro-obra pages-section-background">
        <h4>Dados do Proprietário</h4>
        <InputForm className="duas-colunas" label="E-mail do Proprietário *" value={proprietarioEmail}
          required onChange={(e) => setProprietarioEmail(e.target.value)} />
        <InputForm className="duas-colunas" label="Nome do Proprietário *" value={proprietarioNome}
          required onChange={(e) => setProprietarioNome(e.target.value)} />
        <InputForm className="uma-coluna" label="Contato do Proprietário" value={contatoProprietario}
          onChange={(e) => setContatoProprietario(e.target.value)} />

        <h4>Dados da Obra</h4>
        <InputForm className="tres-colunas" label="Nome da Obra *" value={nomeObra}
          required onChange={(e) => setNomeObra(e.target.value)} />
        <InputForm className="uma-coluna" label="CEP *" value={cep} maxLength={8} required
          onChange={(e) => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))} />
        {erroCep && <small style={{ color: '#b00', marginTop: -8 }}>{erroCep}</small>}
        <InputForm className="duas-colunas" label="Rua *" value={rua} required onChange={(e) => setRua(e.target.value)} />
        <InputForm className="duas-colunas" label="Bairro *" value={bairro} required onChange={(e) => setBairro(e.target.value)} />
        <InputForm className="uma-coluna" label="Cidade *" value={cidade} required onChange={(e) => setCidade(e.target.value)} />
        <InputForm className="uma-coluna" label="Número *" value={numero} required onChange={(e) => setNumero(e.target.value)} />
        <InputForm className="duas-colunas" label="Complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} />

        <h4>Cronograma</h4>
        <InputForm className="uma-coluna" label="Data Início *" type="date" value={dataInicio} required onChange={(e) => setDataInicio(e.target.value)} />
        <InputForm className="uma-coluna" label="Data Final *" type="date" value={dataFinal} required onChange={(e) => setDataFinal(e.target.value)} />
        {erroData && <small style={{ color: '#b00', marginTop: -8, display: 'block', gridColumn: '1 / -1' }}>{erroData}</small>}
        <InputForm className="uma-coluna" label="Prazo Atual/Estimado (dias) *" value={diasPassados && prazo ? `${diasPassados} / ${prazo}` : ''} readOnly required />

        <InputForm className="tres-colunas text-area" type="textarea" label="Observações" value={observacao} onChange={(e) => setObservacao(e.target.value)} />

        <button className="botao-retangular cancelar" onClick={cancelar}>Cancelar</button>
        <div></div>
        <button 
          className="botao-retangular seguir" 
          onClick={seguir}
          disabled={!!erroData || submitting}
          style={erroData || submitting ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
        >
          {submitting ? 'Salvando...' : 'Continuar'}
        </button>
      </div>
    </section>
  );
}

export default CadastroObra;
