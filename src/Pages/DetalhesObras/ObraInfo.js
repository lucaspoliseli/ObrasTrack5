import React from "react";
import "./DetalhesObras.css";

const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const toBR = (s) => (isDate(s) ? new Date(s).toLocaleDateString("pt-BR") : s || "—");
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export default function ObraInfo({ obra }) {
  if (!obra) return null;

  const proprietario = obra.proprietarioNome || obra.proprietario || "—";
  const responsavel  = obra.responsavelNome  || obra.responsavel  || "—";
  const dataInicio   = obra.dataInicio || null;
  const dataFinal    = obra.dataFinal  || null;

  let prazoDias = num(obra.prazo);
  if ((prazoDias == null || prazoDias === 0) && isDate(dataInicio) && isDate(dataFinal)) {
    const dIni = new Date(dataInicio);
    const dFim = new Date(dataFinal);
    prazoDias = Math.max(0, Math.round((dFim - dIni) / (1000*60*60*24)));
  }

  const enderecoText = obra.endereco || obra.local || "—";
  const enderecoUrl  = obra.enderecoUrl || obra.mapaUrl || null;

  return (
    <section className="obra-info">
      <h2 style={{ margin: "0 0 12px 0", fontSize: 28, fontWeight: 800 }}>{obra.nome || "Obra"}</h2>

      <p><strong>Status:</strong> {obra.status || "—"}</p>
      <p><strong>Proprietário:</strong> {proprietario}</p>
      <p><strong>Responsável:</strong> {responsavel}</p>
      <p><strong>Data de início:</strong> {toBR(dataInicio)}</p>
      <p><strong>Data final:</strong> {toBR(dataFinal)}</p>
      <p><strong>Prazo (dias):</strong> {prazoDias != null ? prazoDias : "—"}</p>

      <p className="endereco">
        <strong>Endereço:</strong>{" "}
        {enderecoUrl ? (
          <a href={enderecoUrl} target="_blank" rel="noreferrer">
            {enderecoText}
          </a>
        ) : (
          enderecoText
        )}
      </p>
    </section>
  );
}
