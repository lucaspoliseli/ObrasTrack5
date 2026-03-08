import React from "react";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, ReferenceLine, CartesianGrid, Tooltip, LabelList,
  PieChart, Pie, Cell
} from "recharts";

// ---- utils
const toDays = (ms) => Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
const parseDate = (d) => (d ? new Date(d) : null);

// ---- KPIs (agora com %)
function KPICards({ iniObra, fimObra, hoje }) {
  const duracao = iniObra && fimObra ? Math.max(1, toDays(fimObra - iniObra)) : 0;
  const decorridosRaw = iniObra ? toDays(hoje - iniObra) : 0;
  const decorridos = Math.min(decorridosRaw, duracao);
  const restantes = duracao ? Math.max(0, duracao - decorridos) : 0;
  const atraso = fimObra ? Math.max(0, toDays(hoje - fimObra)) : 0;

  const pctDec = duracao ? (decorridos / duracao) * 100 : 0;
  const pctRes = duracao ? (restantes / duracao) * 100 : 0;

  const Item = ({ label, value, suffix, sub }) => (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      boxShadow: "0 6px 24px rgba(0,0,0,.06)",
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      minWidth: 180
    }}>
      <div style={{ fontSize: 12, color: "#6b7280", letterSpacing: .2 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}{suffix}</div>
      {sub && <div style={{ fontSize: 12, color: "#6b7280" }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(180px, 1fr))",
      gap: 18
    }}>
      <Item label="Duração planejada" value={duracao} suffix=" d" />
      <Item label="Dias decorridos" value={decorridos} suffix=" d" sub={`${pctDec.toFixed(1)}%`} />
      <Item label="Dias restantes" value={restantes} suffix=" d" sub={`${pctRes.toFixed(1)}%`} />
      <Item label="Atraso" value={atraso} suffix=" d" sub={atraso === 0 ? "No prazo" : "Atrasado"} />
    </div>
  );
}

// ---- Label customizada dentro das barras
function InsideLabel({ x, y, width, height, value, fill = "#111827", total }) {
  if (value <= 0 || !Number.isFinite(width) || width < 30) return null; // evita poluição
  const pct = total ? ((value / total) * 100).toFixed(1) : "0.0";
  const cx = x + width / 2;
  const cy = y + height / 2 + 4;
  return (
    <text x={cx} y={cy} textAnchor="middle" fill={fill} fontSize={12} fontWeight={700}>
      {value} d ({pct}%)
    </text>
  );
}

// ---- Barra de cronograma (Planejado x Hoje)
function ScheduleStrip({ iniObra, fimObra, hoje }) {
  if (!iniObra || !fimObra) {
    return <div style={{ padding: 12, color: "#6b7280" }}>Defina início e final previstos da obra para visualizar o cronograma.</div>;
  }

  const duracao = Math.max(1, toDays(fimObra - iniObra));
  const dec = toDays(hoje - iniObra);
  const decLimitado = Math.min(dec, duracao);
  const atraso = Math.max(0, toDays(hoje - fimObra));
  const res = Math.max(0, duracao - decLimitado);

  const data = [{ nome: "Cronograma", decorrido: decLimitado, restante: res, atraso }];

  // eixo X com passos de ~180d
  const step = 180;
  const ticks = [];
  for (let t = 0; t <= duracao; t += step) ticks.push(t);
  if (ticks[ticks.length - 1] !== duracao) ticks.push(duracao);

  const xMax = Math.max(duracao, dec, duracao + atraso);
  const hojeX = dec;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        layout="vertical"
        barCategoryGap={8}
        margin={{ top: 20, right: 28, left: 20, bottom: 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" domain={[0, xMax]} ticks={ticks} tickFormatter={(d) => `${d}d`} />
        <YAxis type="category" dataKey="nome" width={0} tick={false} axisLine={false} />

        {/* DECORRIDO primeiro (esquerda) */}
        <Bar dataKey="decorrido" stackId="a" fill="#9ca3af" isAnimationActive={false} radius={[10, 0, 0, 10]}>
          <LabelList
            dataKey="decorrido"
            position="inside"
            content={(props) => <InsideLabel {...props} total={duracao} fill="#111827" />}
          />
        </Bar>

        {/* RESTANTE depois (direita) */}
        <Bar dataKey="restante" stackId="a" fill="#3b82f6" isAnimationActive={false} radius={[0, 10, 10, 0]}>
          <LabelList
            dataKey="restante"
            position="inside"
            content={(props) => <InsideLabel {...props} total={duracao} fill="#ffffff" />}
          />
        </Bar>

        {/* atraso (vermelho), só aparece quando > 0 */}
        {atraso > 0 && (
          <Bar dataKey="atraso" stackId="b" fill="#ef4444" isAnimationActive={false} radius={[10, 10, 10, 10]} />
        )}

        {/* linha "Hoje" */}
        <ReferenceLine x={hojeX} stroke="#111827" strokeWidth={1.25} strokeDasharray="6 6" label={{ value: "Hoje", position: "top", fill: "#111827" }} />

        <Tooltip
          wrapperStyle={{ borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,.08)" }}
          formatter={(val, key) => {
            const map = { decorrido: "Decorrido", restante: "Restante", atraso: "Atraso" };
            return [`${val} dia(s)`, map[key] || key];
          }}
          labelFormatter={() => "Cronograma"}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- Donut de atraso (opcional, só quando há atraso)
function DelayDonut({ iniObra, fimObra, hoje }) {
  if (!iniObra || !fimObra) return null;
  const atraso = Math.max(0, toDays(hoje - fimObra));
  if (atraso === 0) return null;

  const duracao = Math.max(1, toDays(fimObra - iniObra));
  const pct = Math.min(100, Math.round((atraso / duracao) * 100));
  const data = [
    { name: "Atraso", value: pct },
    { name: "Plano", value: 100 - pct },
  ];

  return (
    <div style={{ 
      background: "linear-gradient(135deg, #fee2e2 0%, #fff 50%)", 
      borderRadius: 18, 
      boxShadow: "0 8px 32px rgba(239,68,68,0.15)", 
      padding: 24,
      border: "2px solid #fecaca" 
    }}>
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 12, color: "#991b1b" }}>⚠️ Atraso vs Duração</div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%" cy="50%"
            innerRadius={84} outerRadius={120}
            paddingAngle={3}
          >
            <Cell fill="#ef4444" />
            <Cell fill="#e5e7eb" />
          </Pie>
          <Tooltip formatter={(v, k) => [`${v}%`, k]} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ textAlign: "center", marginTop: 12, fontSize: 16, fontWeight: 600, color: "#991b1b" }}>
        {atraso} dia(s) de atraso — {pct}% da duração planejada
      </div>
    </div>
  );
}

// ---- Componente principal
function ObraGrafico({ obra }) {
  if (!obra) {
    return <div style={{ padding: 12, color: "#6b7280" }}>Sem dados da obra.</div>;
  }

  const iniObra = parseDate(obra.dataInicio);
  const fimObra = parseDate(obra.dataFinal);
  const hoje = new Date();
  const noPrazo = fimObra ? hoje <= fimObra : true;

  return (
    <div style={{
      display: "grid",
      gap: 20,
      gridTemplateColumns: "1fr",
      margin: "0",
    }}>
      <KPICards iniObra={iniObra} fimObra={fimObra} hoje={hoje} />

      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 6px 24px rgba(0,0,0,.06)", padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Cronograma (Planejado x Hoje)</div>
          {noPrazo ? (
            <span style={{ fontSize: 12, background: "#ecfeff", color: "#155e75", padding: "4px 8px", borderRadius: 999 }}>No prazo</span>
          ) : (
            <span style={{ fontSize: 12, background: "#fee2e2", color: "#7f1d1d", padding: "4px 8px", borderRadius: 999 }}>Atrasado</span>
          )}
        </div>

        <ScheduleStrip iniObra={iniObra} fimObra={fimObra} hoje={hoje} />
      </div>

      <DelayDonut iniObra={iniObra} fimObra={fimObra} hoje={hoje} />
    </div>
  );
}

export default ObraGrafico;
