// src/Pages/MinhaObra/MinhasObras.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext/AuthContext';
import obraService from '../../services/obraService';

export default function MinhasObras() {
  const { user, loading } = useAuth() || {};
  const [obras, setObras] = useState([]);
  const [carregando, setCarregando] = useState(true);

  async function carregarObrasParaUsuario(u) {
    if (!u) return [];
    const uid = u.uid || u.id || null;
    const email = (u.email || '').toString().toLowerCase().trim();
    const resultados = [];

    try {
      if (uid) {
        const eng = await obraService.getObrasByEngenheiro(uid);
        if (eng && eng.length) resultados.push(...eng);
      }
    } catch (e) { console.warn('Erro getObrasByEngenheiro:', e); }

    try {
      if (email) {
        const prop = await obraService.getObrasByProprietario(email);
        if (prop && prop.length) resultados.push(...prop);
      }
    } catch (e) { console.warn('Erro getObrasByProprietario:', e); }

    try {
      const multi = await obraService.getObrasDoUsuario({ uid, email });
      if (multi && multi.length) resultados.push(...multi);
    } catch (e) { console.warn('Erro getObrasDoUsuario:', e); }

    // REMOVIDO: fallback inseguro que mostrava todas as obras
    // Se não encontrar obras, retornar array vazio (segurança)

    // dedupe
    const mapa = new Map();
    resultados.forEach(o => { if (o && o.id) mapa.set(o.id, o); });
    const obrasUnicas = Array.from(mapa.values());

    // sort by createdAt desc if available
    obrasUnicas.sort((a, b) => {
      const A = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const B = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return B - A;
    });

    console.log('Carregadas obras para user', { uid, email, count: obrasUnicas.length, obrasUnicas });
    return obrasUnicas;
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setCarregando(true);
      try {
        const res = await carregarObrasParaUsuario(user);
        if (mounted) setObras(res || []);
      } catch (e) {
        console.error('Erro ao carregar obras:', e);
      } finally {
        if (mounted) setCarregando(false);
      }
    })();
    return () => { mounted = false; };
  }, [user, loading]);

  if (carregando) return <div>Carregando obras...</div>;

  if (!obras || obras.length === 0) return <div>Nenhuma obra encontrada.</div>;

  return (
    <div>
      <h2>Minhas Obras</h2>
      <ul>
        {obras.map(o => (
          <li key={o.id}>
            <strong>{o.nome}</strong> — prazo: {o.prazo || '—'} — dataFinal: {o.dataFinal || '—'}
          </li>
        ))}
      </ul>
    </div>
  );
}
