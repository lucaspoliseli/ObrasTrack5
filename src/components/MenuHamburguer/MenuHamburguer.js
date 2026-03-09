import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './MenuHamburguer.css';
import { useAuth } from '../../AuthContext/AuthContext';

function MenuHamburguer() {
  const location = useLocation();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const { user, signOut } = useAuth();

  const toggleMenu = () => setAberto(!aberto);

  // ❌ Não mostra o botão "Menu" nas telas públicas
  const rotasOcultas = ['/', '/login', '/cadastro'];
  if (rotasOcultas.includes(location.pathname)) return null;

  // normaliza papel de forma consistente
  const role = (user?.funcao || user?.role || user?.papel || '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
  const isEng = !!user && (role.includes('engenheiro') || role.startsWith('eng'));

  function handleLogout() {
    signOut();
    setAberto(false);
    navigate('/login', { replace: true });
  }

  // Tenta extrair id da obra do pathname para habilitar link de fotos contextual
  // cobre padrões: /detalhesObra/:id, /obras/:id/(editar|etapas|fotos)
  // usa [^/]+ para capturar UUIDs completos (com hífens) até a próxima barra
  const match = location.pathname.match(/detalhesObra\/([^/]+)|obras\/([^/]+)/);
  const obraId = match ? (match[1] || match[2]) : null;

  if (obraId) {
    console.log('[MenuHamburguer] pathname:', location.pathname, 'obraId:', obraId, {
      fotosHref: `/obras/${obraId}/fotos`,
      chatHref: `/obras/${obraId}/chat`,
    });
  }

  return (
    <div className="menu-hamburguer-container">
      <button className="menu-botao" onClick={toggleMenu}>
        Menu
      </button>
      <nav className={`menu-links ${aberto ? 'aberto' : ''}`}>
        <Link to="/home" onClick={toggleMenu}>Home</Link>
        <Link to="/obras" onClick={toggleMenu}>Obras</Link>
        {/* <Link to="/fotos" onClick={toggleMenu}>Fotos</Link> */}
        <Link to="/detalhesperfil" onClick={toggleMenu}>Perfil</Link>
        {obraId && (
          <>
            <Link to={`/obras/${obraId}/fotos`} onClick={toggleMenu}>Fotos da obra atual</Link>
            <Link to={`/obras/${obraId}/chat`} onClick={toggleMenu}>Chat da obra atual</Link>
          </>
        )}
        {isEng && (
          <Link to="/cadastroobra" onClick={toggleMenu} className="menu-cta">
            Criar obra
          </Link>
        )}
        {user ? (
          <button onClick={handleLogout} className="menu-sair">
            Sair
          </button>
        ) : (
          <Link to="/login" onClick={toggleMenu}>Entrar</Link>
        )}
      </nav>
    </div>
  );
}

export default MenuHamburguer;

