import React, { useMemo, useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext/AuthContext";
import obraService from "../../services/obraService";
import "./DetalhesObras.css";
import ObraInfo from "./ObraInfo";
import ObraGrafico from "./ObraGrafico";

export default function DetalhesObra() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // controle de abrir/fechar detalhes por etapa
  const [abertas, setAbertas] = useState([]);

  const toggleEtapa = (i) => {
    setAbertas((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  };

  // Etapas agora vêm diretamente da obra do Firebase

  const [obraFirebase, setObraFirebase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadObra() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const obraFromFirebase = await obraService.getObraById(id);
        setObraFirebase(obraFromFirebase);
      } catch (error) {
        console.error('Erro ao carregar obra:', error);
        setObraFirebase(null);
      } finally {
        setLoading(false);
      }
    }

    loadObra();
  }, [id]);

  // Usar apenas obra do Firebase (sem fallback para localStorage)
  const obraOriginal = obraFirebase || null;

  // ---------- helpers ----------
  const parseDate = (d) => (d ? new Date(d) : null);
  const isDateString = (val) =>
    typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val);

  const fmtBR = (d) =>
    typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)
      ? new Date(d).toLocaleDateString("pt-BR")
      : d ?? "—";

  // ---------- monta objeto obra ----------
  let obra = null;
  if (obraOriginal) {
    const hojeISO = new Date().toISOString().slice(0, 10);
    const dataInicioISO =
      obraOriginal.dataInicio && isDateString(obraOriginal.dataInicio)
        ? obraOriginal.dataInicio
        : hojeISO;

    let prazoDias = Number(obraOriginal.prazo);
    if (Number.isNaN(prazoDias) && isDateString(obraOriginal.prazo)) {
      const dInicio = parseDate(dataInicioISO);
      const dPrazo = parseDate(obraOriginal.prazo);
      const diffMs = dPrazo - dInicio;
      prazoDias = Math.max(
        0,
        Math.round(diffMs / (1000 * 60 * 60 * 24))
      );
    } else if (Number.isNaN(prazoDias)) {
      prazoDias = 0;
    }

    const dataFinalISO =
      obraOriginal.dataFinal && isDateString(obraOriginal.dataFinal)
        ? obraOriginal.dataFinal
        : isDateString(obraOriginal.prazo)
        ? obraOriginal.prazo
        : null;

    // ====== CORREÇÃO DO ENDEREÇO ======
    // Trata tanto string quanto objeto
    let enderecoTexto =
      obraOriginal.endereco ||
      obraOriginal.local ||
      obraOriginal.enderecoText ||
      null;
    if (enderecoTexto && typeof enderecoTexto === "object") {
      const {
        rua,
        numero,
        bairro,
        cidade,
        cep,
        complemento,
      } = enderecoTexto;
      enderecoTexto = [
        rua && numero ? `${rua}, ${numero}` : rua || "",
        bairro,
        cidade,
        cep ? `CEP: ${cep}` : "",
        complemento ? `(${complemento})` : "",
      ]
        .filter(Boolean)
        .join(" - ");
    }

    const enderecoUrl =
      obraOriginal.enderecoUrl ||
      (enderecoTexto
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            enderecoTexto
          )}`
        : null);

    obra = {
      ...obraOriginal,
      dataInicio: dataInicioISO,
      prazo: prazoDias,
      dataFinal: dataFinalISO || obraOriginal.dataFinal || null,
      endereco: enderecoTexto || "—",
      enderecoUrl,
    };

    // Calcula duração em dias
    if (obra?.dataInicio && obra?.dataFinal) {
      const dIni = new Date(obra.dataInicio);
      const dFim = new Date(obra.dataFinal);
      const duracaoDias = Math.max(
        0,
        Math.round((dFim - dIni) / (1000 * 60 * 60 * 24))
      );
      obra.prazo = duracaoDias;
    }
  }

  // ======================= Usuários / nomes =======================
  const usuarios = JSON.parse(localStorage.getItem("usuarios") || "[]");
  const getUserById = (uid) =>
    usuarios.find((u) => u.id === uid) || null;
  const getUserByEmail = (email) =>
    usuarios.find(
      (u) =>
        (u.email || "").toLowerCase() ===
        (email || "").toLowerCase()
    ) || null;

  const getFullName = (u) => {
    if (!u) return null;
    const full = `${u.nome || ""} ${u.sobrenome || ""}`
      .replace(/\s+/g, " ")
      .trim();
    return full || u.nome || null;
  };

  const pickFullest = (...vals) => {
    const cand = vals
      .filter(Boolean)
      .map((s) => String(s).trim());
    if (cand.length === 0) return "—";
    const withSurname = cand.filter((s) => s.includes(" "));
    if (withSurname.length)
      return withSurname.sort(
        (a, b) => b.length - a.length
      )[0];
    return cand.sort((a, b) => b.length - a.length)[0];
  };

  const proprietarioNome = pickFullest(
    obra?.proprietarioNome,
    getFullName(getUserById(obra?.proprietarioId)),
    getFullName(getUserByEmail(obra?.proprietarioEmail)),
    obra?.proprietario
  );

  const responsavelNome = pickFullest(
    obra?.responsavelNome,
    getFullName(getUserById(obra?.createdById)),
    getFullName(getUserById(obra?.engenheiroId)),
    obra?.responsavel
  );

  const obraDisplay = useMemo(() =>
    obra ? { ...obra, proprietarioNome, responsavelNome } : null,
    [obra, proprietarioNome, responsavelNome]
  );

  // Permissão para chat
  const podeChat = !!user && obraDisplay && (
    String(user?.uid) === String(obraDisplay?.engenheiroId) ||
    String(user?.uid) === String(obraDisplay?.proprietarioId) || (
      obraDisplay?.proprietarioEmail &&
      String(user?.email || '').toLowerCase() === String(obraDisplay?.proprietarioEmail || '').toLowerCase()
    )
  );

  const isEngenheiro =
    user?.funcao === "engenheiro" ||
    user?.role === "engenheiro";

  // ======================= ETAPAS (com subetapas) =======================
  const etapasOrdenadas = useMemo(() => {
    if (!obraDisplay) return [];

    // Buscar etapas diretamente da obra do Firebase
    const fonteEtapas = Array.isArray(obraDisplay.etapas) 
      ? obraDisplay.etapas 
      : [];

    // normaliza cada etapa incluindo subetapas
    const normalizadas = fonteEtapas.map((e) => {
      const titulo = e.titulo || e.nome || "—";
      const statusFinal =
        e.status ||
        (e.aguardandoMaterial
          ? "Aguardando material"
          : "Pendente");
      const dataInicio = e.dataInicio || "—";
      const dataLimite = e.dataLimite || e.dataFim || "—";

      return {
        titulo,
        status: statusFinal,
        responsavel:
          e.responsavel || e.responsavelNome || "—",
        dataInicio,
        dataLimite,
        prazo: e.prazo ?? null,
        descricao: e.descricao || "",
        subetapas: Array.isArray(e.subetapas)
          ? e.subetapas
          : [],
      };
    });

    // ordenar por data início, depois data limite
    const toTs = (d) =>
      /\d{4}-\d{2}-\d{2}/.test(d)
        ? new Date(d).getTime()
        : Infinity;
    normalizadas.sort((a, b) => {
      const ai = toTs(a.dataInicio);
      const bi = toTs(b.dataInicio);
      if (ai !== bi) return ai - bi;
      return toTs(a.dataLimite) - toTs(b.dataLimite);
    });

    return normalizadas;
  }, [obraDisplay]);

  // ======================= RENDER =======================
  if (loading) {
    return (
      <div className="container">
        <h2>Carregando obra...</h2>
      </div>
    );
  }

  if (!obraDisplay) {
    return (
      <div className="container">
        <h2>Obra não encontrada</h2>
        <Link to="/obras" className="link-voltar">
          Voltar
        </Link>
      </div>
    );
  }

  async function excluirObra() {
    if (!isEngenheiro) return;
    if (!window.confirm('Tem certeza que deseja excluir esta obra? Esta ação não pode ser desfeita.')) return;
    try {
      await obraService.deleteObra(id);
      navigate('/obras', { replace: true });
    } catch (e) {
      console.error('Falha ao excluir obra', e);
      alert('Não foi possível excluir a obra.');
    }
  }

  return (
    <div className="container">
      <ObraInfo obra={obraDisplay} />
      
      <div className="detalhes-obra-content">
        <div className="detalhes-obra-graficos">
          <ObraGrafico obra={obraDisplay} />
        </div>
      </div>

      <section className="etapas-obra-wrapper">
        <div className="etapas-obra-header">
          <h3 className="etapas-obra-titulo">Etapas da Obra</h3>
          <span className="etapas-obra-contagem">
            {etapasOrdenadas.length} etapa
            {etapasOrdenadas.length === 1 ? "" : "s"}
          </span>
        </div>

        {etapasOrdenadas.length === 0 ? (
          <p className="etapas-obra-vazio">
            Nenhuma etapa cadastrada ainda.
          </p>
        ) : (
          <ul className="etapas-obra-lista">
            {etapasOrdenadas.map((etapa, i) => (
                  <li key={i} className="etapas-obra-card">
                    <div className="etapas-obra-topo">
                      <div className="etapas-obra-info">
                        <div className="etapas-obra-nome">
                          {etapa.titulo}
                        </div>

                        <div className="etapas-obra-status">
                          <span
                            className={`badge-status badge-${(etapa.status || "Pendente")
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {etapa.status || "Pendente"}
                          </span>
                        </div>
                      </div>

                      <div className="etapas-obra-extra">
                        {(etapa.dataInicio || etapa.dataLimite) && (
                          <div className="etapas-obra-datas">
                            <span>
                              {fmtBR(etapa.dataInicio)} →{" "}
                              {fmtBR(etapa.dataLimite)}
                            </span>
                            {etapa.prazo && (
                              <span className="etapas-obra-prazo">
                                {etapa.prazo} dias
                              </span>
                            )}
                          </div>
                        )}

                        <button
                          className="btn-toggle-sub"
                          onClick={() => toggleEtapa(i)}
                        >
                          {abertas.includes(i)
                            ? "Esconder detalhes"
                            : "Ver detalhes"}
                        </button>
                      </div>
                    </div>

                    {abertas.includes(i) && (
                      <div className="etapas-obra-detalhes">
                        {etapa.descricao && (
                          <p className="etapas-obra-desc">
                            {etapa.descricao}
                          </p>
                        )}

                        <div className="etapas-obra-meta">
                          <div>
                            <strong>Responsável: </strong>
                            {etapa.responsavel || "—"}
                          </div>
                          {etapa.dataInicio && (
                            <div>
                              <strong>Início: </strong>
                              {fmtBR(etapa.dataInicio)}
                            </div>
                          )}
                          {etapa.dataLimite && (
                            <div>
                              <strong>Fim previsto: </strong>
                              {fmtBR(etapa.dataLimite)}
                            </div>
                          )}
                        </div>

                        {/* SUBETAPAS */}
                        <div className="subetapas-view-bloco">
                          <div className="subetapas-view-header">
                            <h4>Subetapas</h4>
                          </div>

                          {(!etapa.subetapas ||
                            etapa.subetapas.length === 0) && (
                            <p className="subetapas-view-vazio">
                              Nenhuma subetapa cadastrada.
                            </p>
                          )}

                          {etapa.subetapas &&
                            etapa.subetapas.length > 0 && (
                              <ul className="subetapas-view-lista">
                                {etapa.subetapas.map(
                                  (sub, j) => (
                                    <li
                                      key={j}
                                      className="subetapas-view-item"
                                    >
                                      <div className="subetapas-view-linha">
                                        <div className="subetapas-view-nome">
                                          {sub.nome ||
                                            "Sem nome"}
                                        </div>

                                        <div className="subetapas-view-status">
                                          <span
                                            className={`badge-status badge-${(sub.status ||
                                              "Pendente")
                                              .toLowerCase()
                                              .replace(
                                                /\s+/g,
                                                "-"
                                              )}`}
                                          >
                                            {sub.status ||
                                              "Pendente"}
                                          </span>
                                        </div>
                                      </div>
                                    </li>
                                  )
                                )}
                              </ul>
                            )}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

      <div style={{ 
        maxWidth: 1400, 
        margin: '24px auto 0 auto', 
        display: 'flex', 
        gap: 12, 
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {isEngenheiro && (
          <>
            <button className="btn" onClick={() => navigate(`/obras/${id}/editar`)}>Editar obra</button>
            <button className="btn" onClick={() => navigate(`/obras/${id}/etapas`)}>Adicionar / editar etapas</button>
            <button className="btn" onClick={() => navigate(`/obras/${id}/fotos`)}>Fotos da obra</button>
            {podeChat && (
              <button className="btn" onClick={() => navigate(`/obras/${id}/chat`)}>💬 Ir para Chat</button>
            )}
            <button className="btn" style={{ background: '#cc2936' }} onClick={excluirObra}>Excluir obra</button>
          </>
        )}
        {!isEngenheiro && (
          <>
            <button className="btn" onClick={() => navigate(`/obras/${id}/fotos`)}>Ver fotos da obra</button>
            {podeChat && (
              <button className="btn" onClick={() => navigate(`/obras/${id}/chat`)}>💬 Ir para Chat</button>
            )}
          </>
        )}
      </div>

      <Link to="/obras" className="link-voltar">
        Voltar para lista
      </Link>
    </div>
  );
}
