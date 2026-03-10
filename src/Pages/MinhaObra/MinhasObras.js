// src/Pages/MinhaObra/MinhasObras.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext/AuthContext';
import obraService from '../../services/obraService';
import { USE_API, API_URL } from '../../config';
import notificationService from '../../services/notificationService';

export default function MinhasObras() {
  const { user, loading } = useAuth() || {};
  const [obras, setObras] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [notifByObra, setNotifByObra] = useState({});
  const [debug, setDebug] = useState({
    calledNotifications: false,
    notificationsStatus: null,
    notificationsResponse: null,
    lastError: null
  });

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

        // DEBUG: chamar notificações sempre que a tela abrir (quando usando API)
        if (USE_API && mounted) {
          try {
            setDebug(prev => ({
              ...prev,
              calledNotifications: true,
              notificationsStatus: 'pending',
              lastError: null
            }));
            const summary = await notificationService.getUnreadSummary();
            if (mounted) {
              setNotifByObra(summary.byObra || {});
              setDebug(prev => ({
                ...prev,
                notificationsStatus: 200,
                notificationsResponse: summary
              }));
            }
          } catch (e) {
            if (mounted) {
              setNotifByObra({});
              setDebug(prev => ({
                ...prev,
                notificationsStatus: e?.status || 'error',
                notificationsResponse: null,
                lastError: e?.message || String(e)
              }));
            }
          }
        }
      } catch (e) {
        console.error('Erro ao carregar obras:', e);
        if (mounted) {
          setDebug(prev => ({
            ...prev,
            lastError: e?.message || String(e)
          }));
        }
      } finally {
        if (mounted) setCarregando(false);
      }
    })();
    return () => { mounted = false; };
  }, [user, loading]);

  return (
    <div>
      {/* Painel de debug temporário para esta tela */}
      <div style={{
        background: '#fff7e6',
        border: '1px solid #ffc107',
        padding: '10px 14px',
        margin: '8px 16px',
        borderRadius: 8,
        fontSize: '0.8rem',
        color: '#663c00'
      }}>
        <strong>DEBUG MinhasObras / API</strong>
        <div>USE_API: {String(USE_API)}</div>
        <div>API_URL: {API_URL}</div>
        <div>Usuário: {user ? `${user.uid || user.id} | ${user.email} | ${user.funcao}` : 'nenhum'}</div>
        <div>Obras carregadas: {obras.length}</div>
        <div>Chamou /api/notifications/unread: {String(debug.calledNotifications)}</div>
        <div>Status /api/notifications/unread: {debug.notificationsStatus ?? 'null'}</div>
        <div>JSON /api/notifications/unread: {debug.notificationsResponse ? JSON.stringify(debug.notificationsResponse) : 'null'}</div>
        <div>notifByObra: {Object.keys(notifByObra || {}).length ? JSON.stringify(notifByObra) : 'vazio'}</div>
        {debug.lastError && (
          <div style={{ marginTop: 4, color: '#b30000' }}>
            Último erro: {debug.lastError}
          </div>
        )}
      </div>

      {carregando && <div>Carregando obras...</div>}

      {!carregando && (!obras || obras.length === 0) && (
        <div>Nenhuma obra encontrada.</div>
      )}

      {!carregando && obras && obras.length > 0 && (
        <>
          <h2>Minhas Obras</h2>
          <ul>
            {obras.map(o => {
              const notif = notifByObra[o.id] || { total: 0, mensagens: 0, imagens: 0 };
              const totalNotif = notif.total || 0;
              return (
                <li key={o.id}>
                  <strong>{o.nome}</strong>
                  {totalNotif > 0 && (
                    <span style={{
                      marginLeft: 8,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 18,
                      height: 18,
                      padding: '0 5px',
                      borderRadius: 999,
                      backgroundColor: '#e53935',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {totalNotif > 9 ? '9+' : totalNotif}
                    </span>
                  )}
                  {' — prazo: '}{o.prazo || '—'}{' — dataFinal: '}{o.dataFinal || '—'}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
