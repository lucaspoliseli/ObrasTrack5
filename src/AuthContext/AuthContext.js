// src/AuthContext/AuthContext.js
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { USE_API } from "../config";
import { api, setToken, getToken } from "../api/client";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import obraService from "../services/obraService";

const AuthContext = createContext();

function makeError(code, message) {
  const err = new Error(message || "Erro de autenticação");
  err.code = code;
  return err;
}

function normalizeUserFromApi(u) {
  if (!u) return null;
  const funcao = (u.funcao || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
  return {
    uid: u.id,
    id: u.id,
    email: u.email,
    nome: u.nome,
    sobrenome: u.sobrenome,
    displayName: u.displayName || `${u.nome || ""} ${u.sobrenome || ""}`.trim(),
    telefone: u.telefone,
    funcao: funcao || "engenheiro"
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const userUpdateCallbacks = useRef(new Map());

  useEffect(() => {
    if (USE_API) {
      const onLogout = () => setUser(null);
      window.addEventListener('auth-logout', onLogout);
      return () => window.removeEventListener('auth-logout', onLogout);
    }
  }, []);

  useEffect(() => {
    if (USE_API) {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      api.get("/api/auth/me")
        .then((data) => {
          if (data?.user) setUser(normalizeUserFromApi(data.user));
        })
        .catch(() => setToken(null))
        .finally(() => setLoading(false));
      return;
    }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        let u = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || "",
          provider: fbUser.providerData?.[0]?.providerId || "password",
        };

        try {
          const userDocRef = doc(db, "users", fbUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            // Garantir que funcao seja sempre uma string normalizada
            const funcao = (data.funcao || "")
              .toString()
              .normalize("NFD")
              .replace(/\p{Diacritic}/gu, "")
              .trim()
              .toLowerCase();
            u = { 
              ...u, 
              ...data,
              funcao: funcao || "engenheiro" // default para engenheiro se não tiver
            };
          } else {
            // Se o documento não existir, tentar novamente após um delay (pode ser um problema de timing)
            console.warn("Documento do usuário não encontrado no Firestore na primeira tentativa, tentando novamente...");
            await new Promise(resolve => setTimeout(resolve, 500));
            const snapRetry = await getDoc(userDocRef);
            if (snapRetry.exists()) {
              const dataRetry = snapRetry.data();
              const funcaoRetry = (dataRetry.funcao || "")
                .toString()
                .normalize("NFD")
                .replace(/\p{Diacritic}/gu, "")
                .trim()
                .toLowerCase();
              u = { 
                ...u, 
                ...dataRetry,
                funcao: funcaoRetry || "engenheiro"
              };
              console.log("Documento encontrado na segunda tentativa, função:", u.funcao);
            } else {
              console.error("Documento do usuário não encontrado no Firestore após retry");
              u.funcao = "engenheiro"; // fallback
            }
          }
        } catch (err) {
          console.warn("Erro ao buscar user doc:", err);
          // Em caso de erro, usar padrão
          u.funcao = "engenheiro";
        }

        setUser(u);
        
        // Notificar callbacks de atualização do usuário
        if (userUpdateCallbacks.current.has(fbUser.uid)) {
          const callback = userUpdateCallbacks.current.get(fbUser.uid);
          callback();
          userUpdateCallbacks.current.delete(fbUser.uid);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  async function signUp({ nome, sobrenome, email, telefone, senha, funcao }) {
    if (!email || !senha) throw makeError("auth/invalid-input", "Email e senha são obrigatórios.");

    if (USE_API) {
      try {
        const data = await api.post("/api/auth/register", {
          nome: (nome || "").trim(),
          sobrenome: (sobrenome || "").trim(),
          email,
          telefone: (telefone || "").trim(),
          senha,
          funcao: (funcao || "engenheiro").toString().trim().toLowerCase()
        });
        setToken(data.token);
        setUser(normalizeUserFromApi(data.user));
        return { uid: data.user.id, email: data.user.email, displayName: data.user.displayName || "", funcao: data.user.funcao };
      } catch (err) {
        const code = err.code || "auth/error";
        const message = err.message || "Erro ao criar conta.";
        if (code === "auth/email-already-in-use")
          throw makeError("auth/email-already-in-use", message);
        throw makeError(code, message);
      }
    }

    // Normalizar função antes de salvar
    const funcaoNormalizada = (funcao || "engenheiro")
      .toString()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()
      .toLowerCase();
    
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      const displayName = `${(nome || "").trim()} ${(sobrenome || "").trim()}`.trim();
      if (displayName) {
        try { await updateProfile(cred.user, { displayName }); } catch(e){ console.warn(e); }
      }
      
      // Garantir que o documento seja salvo antes de continuar
      try {
        const userDocRef = doc(db, "users", cred.user.uid);
        const userData = {
          uid: cred.user.uid,
          nome: (nome || "").trim(),
          sobrenome: (sobrenome || "").trim(),
          telefone: (telefone || "").trim(),
          displayName: displayName,
          email: email.toLowerCase(),
          funcao: funcaoNormalizada,
          criadoEm: serverTimestamp()
        };
        await setDoc(userDocRef, userData);
        console.log("Usuário criado no Firestore com função:", funcaoNormalizada);
        
        // Aguardar um pouco para garantir que o documento foi escrito
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Ler o documento de volta para garantir que foi salvo
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          console.log("Documento confirmado no Firestore:", data.funcao);
        } else {
          console.warn("Documento não encontrado após criação, tentando novamente...");
          // Tentar mais uma vez
          await setDoc(userDocRef, userData);
        }
        
        // Se o usuário é proprietário, vincular obras pendentes
        if (funcaoNormalizada === "proprietario") {
          try {
            const emailLower = email.toLowerCase();
            const obrasVinculadas = await obraService.vincularObrasAoProprietario(
              emailLower,
              cred.user.uid
            );
            if (obrasVinculadas > 0) {
              console.log(`Vinculadas ${obrasVinculadas} obra(s) ao novo proprietário`);
            }
          } catch (e) {
            console.warn("Erro ao vincular obras ao proprietário (não crítico):", e);
            // Não bloquear o cadastro se isso falhar
          }
        }
      } catch (e) {
        console.error("Falha ao gravar user doc em Firestore:", e);
        // Se falhar ao salvar no Firestore, ainda temos o usuário no Auth
        // Isso é um problema, mas não vamos bloquear o cadastro
        throw makeError("firestore/error", "Erro ao salvar dados do usuário no banco de dados. Por favor, tente fazer login.");
      }
      
      return { uid: cred.user.uid, email: cred.user.email, displayName: displayName || "", funcao: funcaoNormalizada };
    } catch (err) {
      // Verificar se realmente há um erro válido
      if (!err) {
        throw makeError("auth/error", "Erro desconhecido ao criar conta. Tente novamente.");
      }
      
      // Verificar se o erro realmente é do Firebase Auth e tem o código específico
      // IMPORTANTE: Só lançar erro de email já cadastrado se o código for exatamente "auth/email-already-in-use"
      if (err.code === "auth/email-already-in-use") {
        throw makeError(
          "auth/email-already-in-use", 
          "Este email já está cadastrado. Por favor, faça login ao invés de criar uma nova conta. Se você esqueceu sua senha, use a opção de recuperação de senha."
        );
      }
      
      // Tratar outros erros específicos do Firebase Auth
      const errorMessage = err.code === "auth/weak-password" 
        ? "A senha é muito fraca. Use pelo menos 6 caracteres."
        : err.code === "auth/invalid-email"
        ? "O email fornecido não é válido."
        : err.message 
        ? err.message 
        : "Erro ao criar conta. Tente novamente.";
      
      throw makeError(err.code || "auth/error", errorMessage);
    }
  }

  
  async function signIn({ email, senha }) {
    if (!email || !senha) throw makeError("auth/invalid-input", "Email e senha são obrigatórios.");

    if (USE_API) {
      try {
        const data = await api.post("/api/auth/login", { email, senha });
        setToken(data.token);
        setUser(normalizeUserFromApi(data.user));
        return { uid: data.user.id, email: data.user.email, displayName: data.user.displayName || "" };
      } catch (err) {
        const msg = err.message || "Erro ao fazer login.";
        throw makeError(err.code || "auth/error", msg);
      }
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          
          userUpdateCallbacks.current.delete(cred.user.uid);
          resolve({ uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName || "" });
        }, 3000);
        
        
        userUpdateCallbacks.current.set(cred.user.uid, () => {
          clearTimeout(timeout);
          resolve({ uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName || "" });
        });
      });
    } catch (err) {
      
      let errorMessage = "Erro ao fazer login. Tente novamente.";
      
      if (err.code === "auth/user-not-found") {
        errorMessage = "Email não cadastrado. Verifique o email ou crie uma conta.";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Senha incorreta. Tente novamente.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "O email fornecido não é válido.";
      } else if (err.code === "auth/user-disabled") {
        errorMessage = "Esta conta foi desativada. Entre em contato com o suporte.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
      } else if (err.code === "auth/invalid-credential") {
        errorMessage = "Email ou senha incorretos. Verifique suas credenciais.";
      } else if (err.message && !err.message.includes("Firebase")) {
        
        errorMessage = err.message;
      }
      
      throw makeError(err.code || "auth/error", errorMessage);
    } 
  }

  async function signOut() {
    if (USE_API) {
      setToken(null);
      setUser(null);
      return true;
    }
    try {
      await firebaseSignOut(auth);
      return true;
    } catch (err) {
      throw makeError(err.code || "auth/error", err.message || String(err));
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
