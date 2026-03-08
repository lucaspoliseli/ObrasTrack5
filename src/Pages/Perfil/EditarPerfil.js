import React, { useState, useEffect } from 'react';
import InputForm from '../../components/Formulario/InputForm';
import { useNavigate } from 'react-router-dom';
import Botao from '../../components/Botao/Botao';
import './EditarPerfil.css';
import { useAuth } from '../../AuthContext/AuthContext';
import userService from '../../services/userService';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../firebase';

function maskPhone(v = '') {
  const only = v.replace(/\D/g, '').slice(0, 11);
  if (only.length <= 10) {
    return only.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return only.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

export default function EditarPerfil() {
  const navigate = useNavigate();
  const { user, setUser, loading } = useAuth() || {};

  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [cargo, setCargo] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!user) return;
    setNome(user.nome || '');
    setSobrenome(user.sobrenome || '');
    setCargo(user.cargo || user.funcao || '');
    setEmail(user.email || '');
    setTelefone(user.telefone || '');
  }, [user]);

  function validar() {
    if (!nome.trim()) return 'Informe o nome.';
    if (!sobrenome.trim()) return 'Informe o sobrenome.';
    if (!cargo.trim()) return 'Informe o cargo.';
    if (!email.trim()) return 'Informe o email.';
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email.trim())) return 'Email inválido.';
    if (telefone.trim()) {
      const only = telefone.replace(/\D/g, '');
      if (only.length < 10) return 'Telefone incompleto.';
    }
    return '';
  }

  async function salvarAlteracoes(e) {
    e?.preventDefault?.();
    const erro = validar();
    if (erro) return alert(erro);
    if (!user) return;

    const payload = {
      nome: nome.trim(),
      sobrenome: sobrenome.trim(),
      cargo: cargo.trim(),
      funcao: cargo.trim(),
      email: email.trim().toLowerCase(),
      telefone: telefone.trim(),
    };

    try {
      setSalvando(true);
      await userService.updateUser(user.uid, payload);

      // Atualiza displayName no Auth se necessário
      const displayName = `${payload.nome} ${payload.sobrenome}`.trim();
      if (auth.currentUser && displayName) {
        await updateProfile(auth.currentUser, { displayName }).catch(() => {});
      }

      const atualizado = { ...user, ...payload, displayName };
      setUser?.(atualizado);
      alert('Perfil atualizado com sucesso!');
      navigate('/detalhesperfil', { replace: true });
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      alert(err.message || 'Não foi possível salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  }

  function cancelarEdicao() {
    navigate('/detalhesperfil', { replace: true });
  }

  if (loading) {
    return <p>Carregando perfil...</p>;
  }

  if (!user) {
    return <p>Usuário não logado.</p>;
  }

  return (
    <div className="container-editar-perfil">
      <h2>Editar Perfil</h2>

      <InputForm
        label="Nome"
        value={String(nome)}
        onChange={(e) => setNome(e.target.value)}
      />

      <InputForm
        label="Sobrenome"
        value={String(sobrenome)}
        onChange={(e) => setSobrenome(e.target.value)}
      />

      <InputForm
        label="Cargo"
        placeholder="Engenheiro, Proprietário, etc."
        value={String(cargo)}
        onChange={(e) => setCargo(e.target.value)}
      />

      <InputForm
        label="Email"
        type="email"
        value={String(email)}
        onChange={(e) => setEmail(e.target.value)}
      />

      <InputForm
        label="Telefone"
        placeholder="(48) 99999-9999"
        value={String(telefone)}
        onChange={(e) => setTelefone(maskPhone(e.target.value))}
      />

      <div className="botoes-editar-perfil">
        <Botao onClick={cancelarEdicao} disabled={salvando}>Cancelar</Botao>
        <Botao onClick={salvarAlteracoes} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </Botao>
      </div>
    </div>
  );
}
