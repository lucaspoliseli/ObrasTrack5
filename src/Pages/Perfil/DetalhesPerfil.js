import React from 'react';
import { useNavigate } from 'react-router-dom';
import Botao from '../../components/Botao/Botao';
import InputForm from '../../components/Formulario/InputForm';
import './DetalhesPerfil.css';
import { useAuth } from '../../AuthContext/AuthContext';

function splitNomeSobrenome(nomeStr = '', sobrenomeStr = '') {
  let nome = String(nomeStr || '').trim();
  let sobrenome = String(sobrenomeStr || '').trim();
  if (!sobrenome && nome.includes(' ')) {
    const partes = nome.split(/\s+/);
    nome = partes.shift();
    sobrenome = partes.join(' ');
  }
  return { nome, sobrenome };
}

export default function DetalhesPerfil() {
  const navigate = useNavigate();

  const { user, loading } = useAuth() || {};

  if (loading) {
    return <p>Carregando perfil...</p>;
  }

  if (!user) {
    return <p>Usuário não logado.</p>;
  }

  const { nome, sobrenome } = splitNomeSobrenome(user.nome, user.sobrenome);
  const cargo = String(user.cargo ?? user.funcao ?? '');
  const email = String(user.email ?? '');
  const telRaw = String(user.telefone ?? '');
  const telefone = telRaw
    ? telRaw.replace(/\D/g, '')
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4,5})(\d{4})$/, '$1-$2')
    : '';

  return (
    <div className="container-detalhes-perfil">
      <h2>Perfil do Usuário</h2>

      <InputForm label="Nome" value={nome} disabled />
      <InputForm label="Sobrenome" value={sobrenome} disabled />
      <InputForm label="Cargo" value={cargo} disabled />
      <InputForm label="Email" value={email} disabled />
      <InputForm label="Telefone" value={telefone} disabled />

      <Botao onClick={() => navigate('/editar-perfil')}>Editar</Botao>
    </div>
  );
}