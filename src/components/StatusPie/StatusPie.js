// src/components/StatusPie.jsx
import React from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// Exemplo de paleta. Pode trocar à vontade:
const COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#14B8A6", "#A855F7"];

function formatPercent(value, total) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const { name, value, payload: item } = payload[0];
    return (
      <div style={{ background: "white", border: "1px solid #e5e7eb", padding: 8, borderRadius: 8 }}>
        <div style={{ fontWeight: 600 }}>{name}</div>
        <div>Qtd: {value}</div>
        <div>Percentual: {formatPercent(value, item._total)}</div>
      </div>
    );
  }
  return null;
};

/**
 * props.data: [{ name: 'Em andamento', value: 10 }, { name: 'Concluída', value: 6 }, ...]
 */
export default function StatusPie({ data = [], height = 280, innerRadius = 60 }) {
  const total = data.reduce((acc, d) => acc + (d.value || 0), 0);
  const dataWithTotal = data.map(d => ({ ...d, _total: total }));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={dataWithTotal}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius="80%"
            paddingAngle={2}
          >
            {dataWithTotal.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ textAlign: "center", marginTop: 6, color: "#6b7280" }}>
        Total: <strong>{total}</strong>
      </div>
    </div>
  );
}
