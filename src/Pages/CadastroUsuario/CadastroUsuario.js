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
    
    // Validar senha antes de enviar
    const erroSenha = validarSenha(senha);
    if (erroSenha) {
      setSenhaTocou(true);
      setSenhaErro(erroSenha);
      return;
    }
    
    try {
      // Limpar dados antigos do localStorage que podem causar conflito
      localStorage.removeItem("auth_user");
      localStorage.removeItem("usuarioLogado");
      localStorage.removeItem("currentUser");
      
      await signUp({ nome, sobrenome, email, senha, funcao });
      if (!USE_API) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      alert("Cadastro realizado com sucesso! Você será redirecionado.");
      // Redirecionar para /obras ao invés de /home para ser consistente com o login
      navigate("/obras", { replace: true });
    } catch (err) {
      // Verificar se realmente há um erro válido
      if (!err) {
        return;
      }
      
      console.error("Erro no cadastro:", err);
      
      // Mensagens de erro mais amigáveis - só mostrar mensagem específica se o código for exatamente o esperado
      let errorMessage = "Erro ao cadastrar. Por favor, tente novamente.";
      
      // Verificar se o erro realmente é do tipo esperado e tem o código correto
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "Este email já está cadastrado no sistema.\n\n" +
          "Se você já possui uma conta, por favor faça login.\n" +
          "Se você esqueceu sua senha, use a opção de recuperação de senha.\n\n" +
          "Se você não criou esta conta, entre em contato com o suporte.";
      } else if (err.code === "firestore/error") {
        errorMessage = "Conta criada, mas houve um erro ao salvar seus dados.\n\n" +
          "Por favor, tente fazer login. Se o problema persistir, entre em contato com o suporte.";
      } else if (err.message) {
        // Usar a mensagem do erro apenas se não for um dos casos específicos acima
        errorMessage = err.message;
      }
      
      alert(errorMessage);
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
            <button type="submit" className="botao">
              Criar conta e entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
