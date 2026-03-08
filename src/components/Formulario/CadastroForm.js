// src/Pages/CadastroUsuario/CadastroUsuario.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext/AuthContext";
import "../../components/Formulario/CadastroForm.css"; // importa o CSS certo

export default function CadastroUsuario() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [funcao, setFuncao] = useState("engenheiro"); // 'engenheiro' | 'proprietario'

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await signUp({ nome, sobrenome, email, senha, funcao });
      alert("Cadastro realizado com sucesso!");
      navigate("/home");
    } catch (err) {
      alert(err.message || "Erro ao cadastrar");
    }
  }

  return (
    // Centraliza toda a página
    <div className="container-cadastro">
      <div className="cadastro-container">
        <h2 className="titulo-cadastro">Cadastro de Usuário</h2>

        <form className="form-cadastro" onSubmit={handleSubmit}>
          {/* Nome / Sobrenome */}
          <div className="linha">
            <div className="campo">
              <label htmlFor="nome">Nome</label>
              <input
                id="nome"
                name="nome"
                placeholder="Digite seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="given-name"
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="sobrenome">Sobrenome</label>
              <input
                id="sobrenome"
                name="sobrenome"
                placeholder="Digite seu sobrenome"
                value={sobrenome}
                onChange={(e) => setSobrenome(e.target.value)}
                autoComplete="family-name"
                required
              />
            </div>
          </div>

          {/* Email / Senha */}
          <div className="linha">
            <div className="campo">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="senha">Senha</label>
              <input
                id="senha"
                name="senha"
                type="password"
                placeholder="Crie uma senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {/* Função (cards com emoji centralizados) */}
          <div className="campo">
            <label className="titulo-secao">Função</label>
            <div className="funcoes centro">
              <button
                type="button"
                className={`funcao-card ${funcao === "proprietario" ? "ativo" : ""}`}
                onClick={() => setFuncao("proprietario")}
              >
                <span className="emoji" role="img" aria-label="proprietário">
                  👤
                </span>
                <p className="funcao-titulo">Proprietário</p>
                <small className="funcao-sub">Acompanha o progresso da obra</small>
              </button>

              <button
                type="button"
                className={`funcao-card ${funcao === "engenheiro" ? "ativo" : ""}`}
                onClick={() => setFuncao("engenheiro")}
              >
                <span className="emoji" role="img" aria-label="engenheiro">
                  🛠️
                </span>
                <p className="funcao-titulo">Engenheiro</p>
                <small className="funcao-sub">Responsável técnico pela obra</small>
              </button>
            </div>
          </div>

          {/* Botão verde centralizado */}
          <div className="alinha-centro">
            <button type="submit" className="botao">
              Criar conta e entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
