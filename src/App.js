// src/App.js
import './App.css';
import React from 'react';
import { Routes, Route, BrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext/AuthContext';


// Componentes gerais
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';

// Páginas
import Home from './Pages/Home/Home';
import Login from './Pages/Login/Login';
import Obras from './Pages/ObrasCadastradas/Obras';
import CadastroObra from './Pages/CadastroObra/CadastroObra';
import DetalhesObra from './Pages/DetalhesObras/DetalhesObra';
import CadastroEtapas from './Pages/CadastroEtapas/CadastroEtapas';
import CadastroUsuario from './Pages/CadastroUsuario/CadastroUsuario';
import DetalhesPerfil from './Pages/Perfil/DetalhesPerfil';
import EditarPerfil from './Pages/Perfil/EditarPerfil';
import EditarObra from './Pages/EditarObra/EditarObra.js';
import FotosObra from './Pages/FotosObra/FotosObra';
import FotosIndex from './Pages/FotosObra/FotosIndex';
import ChatObra from './Pages/ChatObra/ChatObra';

// ---------------------- ROTAS PROTEGIDAS ----------------------
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // ou um spinner
  return user ? children : <Navigate to="/login" replace />;
}

function EngenheiroRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const role = (user.funcao || user.role || user.papel || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

  const isEng = role.includes("engenheiro") || role.startsWith("eng");
  return isEng ? children : <Navigate to="/home" replace />;
}
// ---------------------------------------------------------------

// Componente que usa useLocation (dentro do BrowserRouter)
function AppContent() {
  const location = useLocation();
  // Header e Footer sempre aparecem (não há mais hideBars)
  const hideBars = false;
  const isLoginPage = location.pathname === '/login' || location.pathname === '/';

  return (
    <>
      {!hideBars && <Header id="header-style" />}

      <main className={`pages-background ${isLoginPage ? 'login-page-background' : ''}`}>
        <Routes>
          {/* -------- PÚBLICAS -------- */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<CadastroUsuario />} />
          

          {/* -------- PRIVADAS (logado) -------- */}
          <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/obras" element={<PrivateRoute><Obras /></PrivateRoute>} />
          <Route path="/detalhesObra/:id" element={<PrivateRoute><DetalhesObra /></PrivateRoute>} />
          <Route path="/detalhesperfil" element={<PrivateRoute><DetalhesPerfil /></PrivateRoute>} />
          <Route path="/editar-perfil" element={<PrivateRoute><EditarPerfil /></PrivateRoute>} />

          {/* -------- ROTAS DE OBRAS -------- */}
          <Route path="/obras/:id/editar" element={<PrivateRoute><EditarObra /></PrivateRoute>} /> 
          <Route path="/obras/:id/etapas" element={<PrivateRoute><CadastroEtapas /></PrivateRoute>} />
          <Route path="/obras/:id/chat" element={<PrivateRoute><ChatObra /></PrivateRoute>} />
          <Route path="/fotos" element={<PrivateRoute><FotosIndex /></PrivateRoute>} />
          <Route path="/obras/:id/fotos" element={<PrivateRoute><FotosObra /></PrivateRoute>} />

          {/* -------- RESTRITAS AO ENGENHEIRO -------- */}
          <Route path="/cadastroobra" element={<EngenheiroRoute><CadastroObra /></EngenheiroRoute>} />

          {/* -------- FALLBACK -------- */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        {!hideBars && <Footer className={isLoginPage ? 'login-footer' : ''} />}
      </main>
    </>
  );
}

// App principal
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
