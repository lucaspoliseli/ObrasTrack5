import React from 'react';
import './Footer.css';

function Footer({ className = '' }) {
  return (
    <footer className={`footer ${className}`}>
      <div className="footer-content">
        <p className="footer-title">© 2025 ObrasTrack</p>
        <p className="footer-subtitle">Tecnologia a favor do acompanhamento de obras</p>
        <p>Contato: (48) 99578-5566</p>
        <p>Email: suporte@obrastrack.com.br</p>
      </div>
    </footer>
  );
}

export default Footer;


