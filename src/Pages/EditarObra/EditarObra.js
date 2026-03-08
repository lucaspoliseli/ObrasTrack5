// src/Pages/EditarObra/EditarObra.js
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import obraService from "../../services/obraService";
import { useAuth } from "../../AuthContext/AuthContext";
import "./EditarObra.css";

/* ============ Utils de leitura/normalização ============ */
function pick(obj, paths) {
  for (const p of paths) {
    const parts = Array.isArray(p) ? p : String(p).split(".");
    let ref = obj;
    let ok = true;
    for (const key of parts) {
      if (ref && Object.prototype.hasOwnProperty.call(ref, key)) {
        ref = ref[key];
      } else {
        ok = false;
        break;
      }
    }
    if (ok && ref != null && ref !== "") return ref;
  }
  return "";
}

function toEnderecoString(val) {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const { logradouro, rua, endereco, numero, bairro, cidade, uf, cep } = val;
    return [
      endereco || logradouro || rua,
      numero && `, ${numero}`,
      bairro && ` - ${bairro}`,
      (cidade || uf || cep) && " |",
      cidade,
      uf && `/${uf}`,
      cep && ` - ${cep}`,
    ]
      .filter(Boolean)
      .join(" ");
  }
  return String(val);
}

function toDateOnly(iso) {
  if (!iso) return "";
  // já está yyyy-mm-dd? devolve como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  // tenta normalizar
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function diffDias(ini, fim) {
  if (!ini || !fim) return "";
  const a = new Date(ini);
  const b = new Date(fim);
  if (isNaN(a) || isNaN(b) || b < a) return "";
  const MS = 1000 * 60 * 60 * 24;
  return String(Math.ceil((b - a) / MS));
}

/* ======================================================= */

export default function EditarObra() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ler obra 1x (getObraById lê do Firebase assincrono)
  const [obra, setObra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadObra() {
      if (!id) {
        setError('ID da obra não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const o = await obraService.getObraById(id);
        
        if (!o) {
          setError('Obra não encontrada');
          setLoading(false);
          return;
        }

        setObra(o);

        // Verificar permissão após carregar a obra
        if (!user) {
          setError('Usuário não autenticado');
          setLoading(false);
          return;
        }

        const isEngenheiroResponsavel = String(user?.uid) === String(o?.engenheiroId);
        if (!isEngenheiroResponsavel) {
          setError('Você não tem permissão para editar esta obra');
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Erro ao carregar obra:', error);
        setError('Erro ao carregar obra. Tente novamente.');
        setObra(null);
      } finally {
        setLoading(false);
      }
    }
    loadObra();
  }, [id, user]);

  const [form, setForm] = useState({
    nome: "",
    status: "Em Andamento",
    proprietario: "",
    responsavel: "",
    dataInicio: "",
    prazo: "",
    dataFinal: "",
    endereco: "",
  });

  // Preenche o form com vários "sinônimos" de chaves
  useEffect(() => {
    if (!obra) return;

    const nome = obra.nome || obra.titulo || "";
    const status =
      obra.status ||
      obra.situacao ||
      "Em Andamento";

    const proprietario = pick(obra, [
      "proprietario",
      "proprietarioNome",
      "proprietario.nome",
      "cliente",
      "cliente.nome",
      "dono",
      "dono.nome",
    ]);

    const responsavel = pick(obra, [
      "responsavel",
      "responsavelNome",
      "engenheiro",
      "engenheiro.nome",
      "fiscal",
      "fiscal.nome",
    ]);

    const dataInicio = toDateOnly(
      obra.dataInicio || obra.inicio || obra.startDate
    );

    const dataFinal = toDateOnly(
      obra.dataFinal || obra.dataFim || obra.fim || obra.termino || obra.dataLimite || obra.endDate
    );

    const prazoNum = obra.prazo || Number(diffDias(dataInicio, dataFinal)) || "";

    const endereco = toEnderecoString(
      obra.endereco || obra.local || obra.address
    );

    setForm({
      nome,
      status,
      proprietario,
      responsavel,
      dataInicio,
      prazo: prazoNum,
      dataFinal,
      endereco,
    });
  }, [obra]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mostrar loading ou erro
  if (loading) {
    return (
      <div className="editar-obra">
        <div className="page-wrapper">
          <p style={{ textAlign: 'center', padding: '24px' }}>Carregando obra...</p>
        </div>
      </div>
    );
  }

  if (error || !obra) {
    return (
      <div className="editar-obra">
        <div className="page-wrapper">
          <h2 className="page-title">Erro</h2>
          <div className="card">
            <p style={{ textAlign: 'center', padding: '24px', color: '#c00' }}>
              {error || 'Obra não encontrada.'}
            </p>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (error && error.includes('permissão')) {
                    navigate(`/detalhesObra/${id}`, { replace: true });
                  } else {
                    navigate('/obras', { replace: true });
                  }
                }}
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]:
        name === "prazo" ? (value === "" ? "" : String(Math.max(0, Number(value)))) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // recalcula prazo se estiver vazio mas datas ok
    const prazoFinal =
      form.prazo !== "" ? Number(form.prazo) : Number(diffDias(form.dataInicio, form.dataFinal)) || undefined;

    // Patch com chaves normalizadas + sinônimos (pra manter compatibilidade com telas antigas)
    const patch = {
      ...obra, // preserva o que já existe
      nome: form.nome,
      status: form.status,
      dataInicio: form.dataInicio || undefined,
      dataFinal: form.dataFinal || undefined,
      prazo: prazoFinal,
      endereco: form.endereco, // mantém como string legível

      // aliases que podem ser lidos por outras telas:
      responsavel: form.responsavel,
      responsavelNome: form.responsavel,
      engenheiro: typeof obra?.engenheiro === "object"
        ? { ...obra.engenheiro, nome: form.responsavel }
        : form.responsavel,

      proprietario: form.proprietario,
      proprietarioNome: form.proprietario,
      dono: typeof obra?.dono === "object"
        ? { ...obra.dono, nome: form.proprietario }
        : form.proprietario,
      cliente: typeof obra?.cliente === "object"
        ? { ...obra.cliente, nome: form.proprietario }
        : form.proprietario,
    };

    try {
      setSubmitting(true);
      await obraService.updateObra(id, patch);
      navigate(`/detalhesObra/${id}`, { replace: true });
    } catch (error) {
      console.error('Erro ao atualizar obra:', error);
      alert('Erro ao salvar alterações. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="editar-obra">
      <div className="page-wrapper">
        <h2 className="page-title">Editar Obra</h2>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-row full">
                <label>Nome da obra</label>
                <input
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  placeholder="Ex.: Mansão Silveira"
                  required
                />
              </div>

              <div className="form-row">
                <label>Status</label>
                <select name="status" value={form.status} onChange={handleChange}>
                  <option>Em Andamento</option>
                  <option>Em Atraso</option>
                  <option>Finalizada</option>
                  <option>Pausada</option>
                </select>
              </div>

              <div className="form-row">
                <label>Proprietário</label>
                <input
                  name="proprietario"
                  value={form.proprietario}
                  onChange={handleChange}
                  placeholder="Nome do proprietário"
                />
              </div>

              <div className="form-row">
                <label>Responsável</label>
                <input
                  name="responsavel"
                  value={form.responsavel}
                  onChange={handleChange}
                  placeholder="Engenheiro responsável"
                />
              </div>

              <div className="form-row">
                <label>Data de início</label>
                <input
                  type="date"
                  name="dataInicio"
                  value={form.dataInicio}
                  onChange={handleChange}
                />
              </div>

              <div className="form-row">
                <label>Prazo (dias)</label>
                <input
                  type="number"
                  name="prazo"
                  value={form.prazo}
                  onChange={handleChange}
                  placeholder="Ex.: 120"
                  min={0}
                />
              </div>

              <div className="form-row">
                <label>Data final</label>
                <input
                  type="date"
                  name="dataFinal"
                  value={form.dataFinal}
                  onChange={handleChange}
                />
              </div>

              <div className="form-row full">
                <label>Endereço</label>
                <input
                  name="endereco"
                  value={form.endereco}
                  onChange={handleChange}
                  placeholder="Rua, número, bairro, cidade/UF"
                />
              </div>
            </div>

            <div className="actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(`/detalhesObra/${id}`, { replace: true })}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
