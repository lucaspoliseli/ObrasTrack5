// src/components/Header/Header.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext/AuthContext";
import MenuHamburguer from "../MenuHamburguer/MenuHamburguer";
import "./Header.css";

function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const role = (user?.funcao || user?.role || user?.papel || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
  const isEng = !!user && (role.includes("engenheiro") || role.startsWith("eng"));

  function handleLogout() {
    signOut();
    navigate("/login", { replace: true });
  }

  return (
    <header>
      <section id="header">
        <div className="logo-menu">
          {/* se preferir que o logo leve ao /home quando logado */}
          <Link to={user ? "/home" : "/login"} id="logo" className="logo-link">
            ObrasTrack
          </Link>

          {/* deixa só o hambúrguer; as opções devem estar dentro dele */}
          <MenuHamburguer
            isEng={isEng}
            isLogged={!!user}
            onLogout={handleLogout}
          />
        </div>
      </section>
    </header>
  );
}

export default Header;
