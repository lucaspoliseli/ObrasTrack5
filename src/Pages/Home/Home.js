// src/Pages/Home/Home.jsx
import React, { useEffect, useState } from 'react';
import './Home.css';
import { useAuth } from '../../AuthContext/AuthContext';
import { USE_API } from '../../config';
import notificationService from '../../services/notificationService';

function Home() {
  const { user } = useAuth() || {};
  const [totalNotif, setTotalNotif] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function loadNotifications() {
      if (!USE_API || !user) {
        if (mounted) setTotalNotif(0);
        return;
      }
      try {
        const summary = await notificationService.getUnreadSummary();
        if (mounted) setTotalNotif(summary.total || 0);
      } catch {
        if (mounted) setTotalNotif(0);
      }
    }
    loadNotifications();
    return () => { mounted = false; };
  }, [user]);

  return (
    <div className="home-container">
      {/* Banner simples de notificações */}
      {totalNotif > 0 && (
        <div
          style={{
            background: '#fff3cd',
            border: '1px solid #ffeeba',
            color: '#856404',
            padding: '8px 12px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: '0.95rem',
            fontWeight: 500,
            textAlign: 'center'
          }}
        >
          Você tem {totalNotif} nova(s) notificação(ões) em suas obras.
        </div>
      )}

      <div className="emoji-engenheiro" title="Bem-vindo!">👷‍♂️</div>

      <h1>Bem-vindo ao ObrasTrack</h1>
      <p>
        O ObrasTrack é um sistema desenvolvido para auxiliar engenheiros civis e pequenas construtoras no acompanhamento de obras. 
        A plataforma permite o cadastro, a visualização e o monitoramento de projetos, 
        facilitando a gestão de prazos e status, visando organizar o fluxo de trabalho e garantir a entrega no prazo.
      </p>
    </div>
  );
}

export default Home;
