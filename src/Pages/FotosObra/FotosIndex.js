import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext/AuthContext';
import obraService from '../../services/obraService';
import fotoService from '../../services/fotoService';
import './FotosIndex.css';

export default function FotosIndex() {
  const { user } = useAuth();
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fotoCounts, setFotoCounts] = useState({});

  useEffect(() => {
    async function loadObras() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Buscar obras do Firestore
        const todasObras = await obraService.getObras();
        
        // Filtrar obras baseado no tipo de usuário
        const funcao = (user?.funcao || '')
          .toString()
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .trim()
          .toLowerCase();
        
        let visiveis = [];
        if (funcao === 'engenheiro') {
          visiveis = todasObras.filter(o => 
            o.engenheiroId === user?.uid || o.createdById === user?.uid
          );
        } else if (funcao === 'proprietario') {
          const emailLower = (user?.email || '').toLowerCase();
          visiveis = todasObras.filter(o =>
            o.proprietarioId === user?.uid ||
            (o.proprietarioEmail || '').toLowerCase() === emailLower ||
            (o.ownerEmail || '').toLowerCase() === emailLower
          );
        } else {
          visiveis = [];
        }

        setObras(visiveis);

        // Contar fotos para cada obra
        const counts = {};
        for (const obra of visiveis) {
          try {
            const count = await fotoService.countFotosByObra(obra.id);
            counts[obra.id] = count;
          } catch (error) {
            console.warn(`Erro ao contar fotos da obra ${obra.id}:`, error);
            counts[obra.id] = 0;
          }
        }
        setFotoCounts(counts);
      } catch (error) {
        console.error('Erro ao carregar obras:', error);
        setObras([]);
      } finally {
        setLoading(false);
      }
    }

    loadObras();
  }, [user]);

  function countFotos(obraId) {
    return fotoCounts[obraId] || 0;
  }

  return (
    <div className="fotos-page-bg">
      <section className="container">
        <h2 style={{textAlign: 'center', marginBottom: 0}}>Fotos • Minhas Obras</h2>
        {loading ? (
          <p style={{textAlign: 'center', marginTop: '24px'}}>Carregando obras...</p>
        ) : obras.length === 0 ? (
          <p style={{textAlign: 'center', marginTop: '24px'}}>Nenhuma obra encontrada.</p>
        ) : (
          <div className="fotos-table">
            <div className="fh-col">Obra</div>
            <div className="fh-col">Fotos</div>
            <div className="fh-col">Ações</div>
            {obras.map((o) => (
              <React.Fragment key={o.id}>
                <div className="fc-obra">{o.nome}</div>
                <div className="fc-num">{countFotos(o.id)}</div>
                <div className="fc-acoes">
                  <Link className="botao-retangular" to={`/obras/${o.id}/fotos`}>Abrir fotos</Link>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
