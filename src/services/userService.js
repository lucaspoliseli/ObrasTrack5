import { USE_API } from '../config';
import { api } from '../api/client';
import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

class UserService {
  constructor() {
    this.collectionName = 'users';
  }

  // Criar um novo usuário
  async createUser(userData) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return { id: docRef.id, ...userData };
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  // Obter todos os usuários
  async getUsers() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collectionName));
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      return users;
    } catch (error) {
      console.error('Erro ao obter usuários:', error);
      throw error;
    }
  }

  // Obter usuário por ID
  async getUserById(id) {
    try {
      const querySnapshot = await getDocs(query(collection(db, this.collectionName), where('id', '==', id)));
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Erro ao obter usuário por ID:', error);
      throw error;
    }
  }

  // Obter usuário por email (busca no Firestore ou API)
  async getUserByEmail(email) {
    if (USE_API) {
      if (!email) return null;
      try {
        const e = encodeURIComponent(String(email).trim().toLowerCase());
        const u = await api.get(`/api/users/email/${e}`);
        return u ? { ...u, uid: u.id } : null;
      } catch {
        return null;
      }
    }
    try {
      if (!email) return null;
      const emailLower = String(email).toLowerCase().trim();
      const querySnapshot = await getDocs(
        query(collection(db, this.collectionName), where('email', '==', emailLower))
      );
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return { 
          id: doc.id, 
          uid: doc.id, // uid é o document ID no Firestore
          ...data 
        };
      }
      return null;
    } catch (error) {
      console.error('Erro ao obter usuário por email:', error);
      // Se houver erro de índice, tentar buscar todos e filtrar (não ideal, mas funciona)
      try {
        const allUsers = await this.getUsers();
        const emailLower = String(email).toLowerCase().trim();
        return allUsers.find(u => String(u.email || '').toLowerCase() === emailLower) || null;
      } catch (e2) {
        console.error('Erro ao buscar todos os usuários:', e2);
        return null;
      }
    }
  }

  // Atualizar usuário
  async updateUser(id, userData) {
    if (USE_API) {
      try {
        return await api.put(`/api/users/${id}`, userData);
      } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        throw error;
      }
    }
    try {
      const userRef = doc(db, this.collectionName, id);
      await updateDoc(userRef, {
        ...userData,
        updatedAt: new Date()
      });
      return { id, ...userData };
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  }

  // Deletar usuário
  async deleteUser(id) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      throw error;
    }
  }

  // Autenticar usuário (simples, baseado em email e senha)
  async authenticateUser(email, password) {
    try {
      const user = await this.getUserByEmail(email);
      if (user && user.password === password) { // Em produção, use hash
        return user;
      }
      return null;
    } catch (error) {
      console.error('Erro ao autenticar usuário:', error);
      throw error;
    }
  }
}

const userService = new UserService();
export default userService;
