// src/Pages/Login/Login.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import './Login.css';
import Botao from '../../components/Botao/Botao';
import Titulo from '../../components/Titulo/Titulo';
import InputForm from '../../components/Formulario/InputForm';
import { useAuth } from '../../AuthContext/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (!loading && user) {
      navigate('/obras', { replace: true });
    }
  }, [user, loading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    try {
      await signIn({ email, senha });
      navigate('/obras', { replace: true });
    } catch (err) {
      console.error('Erro no login:', err);
      alert(err.message || 'Email ou senha inválidos!');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <Titulo>Faça seu login!</Titulo>

        <form className="login-form" onSubmit={handleSubmit}>
          <InputForm
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <InputForm
            label="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          {/* Se o seu <Botao> espera prop "tipo", mantenha; se for nativo, use type="submit" */}
          <Botao tipo="submit" className="login-button" disabled={isLoading || loading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Botao>
        </form>

        <p>
          Não tem uma conta? <Link to="/cadastro">Registre-se</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
