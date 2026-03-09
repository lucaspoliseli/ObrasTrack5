// src/Pages/CadastroUsuario/CadastroUsuario.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext/AuthContext";
import { USE_API } from "../../config";
import "../../components/Formulario/CadastroForm.css"; // importa o CSS certo

export default function CadastroUsuario() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [funcao, setFuncao] = useState("engenheiro"); // 'engenheiro' | 'proprietario'

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erroTela, setErroTela] = useState("");
  
  // Validação de senha
  const [senhaErro, setSenhaErro] = useState("");
  const [senhaTocou, setSenhaTocou] = useState(false);
  
  const MIN_SENHA = 6;
  
  const validarSenha = (valor) => {
    if (!valor) {
      return "A senha é obrigatória";
    }
    if (valor.length < MIN_SENHA) {
      return `A senha deve ter pelo menos ${MIN_SENHA} caracteres`;
    }
    return "";
  };
  
  const handleSenhaChange = (e) => {
    const valor = e.target.value;
    setSenha(valor);
    if (senhaTocou || valor.length > 0) {
      setSenhaErro(validarSenha(valor));
    }
  };
  
  const handleSenhaBlur = () => {
    setSenhaTocou(true);
    setSenhaErro(validarSenha(senha));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErroTela("");

    const erroSenha = validarSenha(senha);
    if (erroSenha) {
      setSenhaTocou(true);
      setSenhaErro(erroSenha);
      setErroTela("Preencha todos os campos obrigatórios corretamente.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload = { nome, sobrenome, email, senha: "[REDACTED]", funcao };
    console.log("[Cadastro] Submit disparado. Payload (senha mascarada):", payload);

    try {
      localStorage.removeItem("auth_user");
      localStorage.removeItem("usuarioLogado");
      localStorage.removeItem("currentUser");

      await signUp({ nome, sobrenome, email, senha, funcao });
      console.log("[Cadastro] Resposta OK. Redirecionando.");
      if (!USE_API) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
      navigate("/obras", { replace: true });
    } catch (err) {
      if (!err) {
        setErroTela("Erro desconhecido. Tente novamente.");
        setIsSubmitting(false);
        return;
      }

      console.error("[Cadastro] Erro capturado:", err);
      console.error("[Cadastro] err.message:", err.message, "err.code:", err.code);
      console.error("[Cadastro] err.responseStatus:", err.responseStatus, "err.responseBody:", err.responseBody);

      let errorMessage = err.message || err.responseBody || "Erro ao cadastrar. Tente novamente.";
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "Este email já está cadastrado. Faça login ou use recuperação de senha.";
      } else if (err.code === "auth/invalid-input") {
        errorMessage = err.message;
      } else if (err.code === "firestore/error") {
        errorMessage = "Erro ao salvar dados. Tente fazer login.";
      } else if (err.message === "Failed to fetch" || err.name === "TypeError") {
        errorMessage = "Não foi possível conectar ao servidor. Verifique se o backend está rodando e se REACT_APP_API_URL está correto.";
      }
      setErroTela(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    // Centraliza toda a página
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9fafb",
      }}
    >
      <div className="cadastro-container">
        <h2
          style={{
            textAlign: "center",
            color: "#007f5f",
            marginBottom: "1.5rem",
          }}
        >
          Cadastro de Usuário
        </h2>

        {erroTela && (
          <div
            role="alert"
            style={{
              marginBottom: "1rem",
              padding: "12px 16px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#b91c1c",
              fontSize: "0.95rem",
            }}
          >
            {erroTela}
          </div>
        )}

        <form className="form-cadastro" onSubmit={handleSubmit}>
          {/* Nome / Sobrenome */}
          <div className="linha">
            <div>
              <label htmlFor="nome">Nome</label>
              <input
                id="nome"
                placeholder="Digite seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="sobrenome">Sobrenome</label>
              <input
                id="sobrenome"
                placeholder="Digite seu sobrenome"
                value={sobrenome}
                onChange={(e) => setSobrenome(e.target.value)}
              />
            </div>
          </div>

          {/* Email / Senha */}
          <div className="linha">
            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="senha">Senha {senha && <span style={{fontSize: '0.85em', color: senha.length >= MIN_SENHA ? '#22c55e' : '#ef4444'}}>
                ({senha.length}/{MIN_SENHA} caracteres)
              </span>}</label>
              <input
                id="senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={handleSenhaChange}
                onBlur={handleSenhaBlur}
                required
                style={{
                  borderColor: senhaTocou && senhaErro ? '#ef4444' : senha && !senhaErro ? '#22c55e' : undefined,
                  boxShadow: senhaTocou && senhaErro ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : senha && !senhaErro ? '0 0 0 3px rgba(34, 197, 94, 0.1)' : undefined
                }}
              />
              {senhaTocou && senhaErro && (
                <small style={{color: '#ef4444', fontSize: '0.85rem', marginTop: '4px', display: 'block'}}>
                  {senhaErro}
                </small>
              )}
              {senha && !senhaErro && (
                <small style={{color: '#22c55e', fontSize: '0.85rem', marginTop: '4px', display: 'block'}}>
                  ✓ Senha válida
                </small>
              )}
            </div>
          </div>

          {/* Função (cards com emoji centralizados) */}
          <div>
            <label className="titulo-secao">Função</label>
            <div className="funcoes centro">
              <div
                className={`funcao-card ${
                  funcao === "proprietario" ? "ativo" : ""
                }`}
                onClick={() => setFuncao("proprietario")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === "Enter" && setFuncao("proprietario")
                }
              >
                <span className="emoji" role="img" aria-label="proprietário">
                  👤
                </span>
                <p>Proprietário</p>
                <small>Acompanha o progresso da obra</small>
              </div>

              <div
                className={`funcao-card ${
                  funcao === "engenheiro" ? "ativo" : ""
                }`}
                onClick={() => setFuncao("engenheiro")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === "Enter" && setFuncao("engenheiro")
                }
              >
                <span className="emoji" role="img" aria-label="engenheiro">
                  🛠️
                </span>
                <p>Engenheiro</p>
                <small>Responsável técnico pela obra</small>
              </div>
            </div>
          </div>

          {/* Botão verde centralizado */}
          <div style={{ textAlign: "center" }}>
            <button
              type="submit"
              className="botao"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Criando conta..." : "Criar conta e entrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
