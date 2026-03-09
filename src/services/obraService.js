// src/services/obraService.js
import { USE_API } from '../config';
import { api } from '../api/client';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  Timestamp,
  query,
  where,
  orderBy
} from 'firebase/firestore';

/**
 * Serviço para coleção "obras"
 * - export default: instancia obraService
 * - export named: addObra, listObras, getObraById, updateObra, deleteObra
 */

class ObraService {
  constructor() {
    this.collectionName = 'obras';
  }

  _toPlainObject(docSnap) {
    if (!docSnap || !docSnap.exists()) return null;
    const data = docSnap.data() || {};
    const createdAt = data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : data.createdAt || null;
    const updatedAt = data.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate().toISOString()
      : data.updatedAt || null;

    return {
      id: docSnap.id,
      ...data,
      createdAt,
      updatedAt
    };
  }

  /** Create and return the newly created doc (reads it back to normalize timestamps) */
  async createObra(obraData = {}) {
    if (USE_API) {
      try {
        const created = await api.post('/api/obras', obraData);
        return { ...created, createdAt: created.createdAt, updatedAt: created.updatedAt };
      } catch (error) {
        console.error('Erro ao criar obra:', error);
        throw error;
      }
    }
    try {
      // normalize expected fields BEFORE saving
      const normalized = {
        ...obraData,
        proprietarioEmail: (obraData.proprietarioEmail || '').toString().trim().toLowerCase(),
        ownerEmail: (obraData.ownerEmail || obraData.proprietarioEmail || '').toString().trim().toLowerCase(),
        engenheiroId: obraData.engenheiroId || obraData.createdById || null,
        createdById: obraData.createdById || obraData.engenheiroId || null,
      };

      const payload = {
        ...normalized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const colRef = collection(db, this.collectionName);
      const docRef = await addDoc(colRef, payload);

      // read back snapshot to get server timestamps as Timestamps and normalize
      const snap = await getDoc(doc(db, this.collectionName, docRef.id));
      return this._toPlainObject(snap);
    } catch (error) {
      console.error('Erro ao criar obra:', error);
      throw error;
    }
  }

  async getObras() {
    if (USE_API) {
      try {
        return await api.get('/api/obras');
      } catch (error) {
        console.error('Erro ao listar obras:', error);
        throw error;
      }
    }
    try {
      const colRef = collection(db, this.collectionName);
      const q = query(colRef, orderBy('createdAt', 'desc'));
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (e) {
        // fallback: try without orderBy if index missing
        console.warn('getObras orderBy fallback:', e);
        snapshot = await getDocs(colRef);
      }
      const arr = [];
      snapshot.forEach((d) => {
        const o = this._toPlainObject(d);
        if (o) arr.push(o);
      });
      return arr;
    } catch (error) {
      console.error('Erro ao listar obras:', error);
      throw error;
    }
  }

  async getObraById(id) {
    console.log('[obraService.getObraById] USE_API:', USE_API, 'id:', id);
    if (USE_API) {
      if (!id) return null;
      const url = `/api/obras/${id}`;
      console.log('[obraService.getObraById] calling', url);
      try {
        const data = await api.get(url);
        console.log('[obraService.getObraById] API ok, obra.id:', data?.id);
        return data;
      } catch (e) {
        console.error('[obraService.getObraById] API error for id:', id, e);
        return null;
      }
    }
    try {
      if (!id) return null;
      const snap = await getDoc(doc(db, this.collectionName, id));
      return this._toPlainObject(snap);
    } catch (error) {
      console.error('Erro ao buscar obra por ID:', error);
      throw error;
    }
  }

  async getObrasByProprietario(email) {
    try {
      if (!email) return [];
      const e = String(email).toLowerCase().trim();
      const colRef = collection(db, this.collectionName);

      // try several keys and fallbacks
      const candidates = [
        { field: 'proprietarioEmail', value: e },
        { field: 'ownerEmail', value: e },
        { field: 'proprietario', value: e },
      ];

      const found = [];
      for (const c of candidates) {
        try {
          const q = query(colRef, where(c.field, '==', c.value), orderBy('createdAt', 'desc'));
          let snap;
          try { snap = await getDocs(q); }
          catch (err) {
            // if index error, try without orderBy
            const q2 = query(colRef, where(c.field, '==', c.value));
            snap = await getDocs(q2);
          }
          snap.forEach(d => {
            const o = this._toPlainObject(d);
            if (o) found.push(o);
          });
          if (found.length) break; // prioritize first match
        } catch (e) {
          console.warn('fallback proprietario query error:', e);
        }
      }

      // dedupe by id
      const map = new Map();
      found.forEach(f => { if (f && f.id) map.set(f.id, f); });
      return Array.from(map.values());
    } catch (error) {
      console.error('Erro getObrasByProprietario:', error);
      throw error;
    }
  }

  async getObrasByEngenheiro(userId) {
    try {
      if (!userId) return [];
      const colRef = collection(db, this.collectionName);
      const fieldsToTry = ['engenheiroId', 'createdById', 'responsavelId'];
      const found = [];

      for (const field of fieldsToTry) {
        try {
          const q = query(colRef, where(field, '==', userId), orderBy('createdAt', 'desc'));
          let snap;
          try { snap = await getDocs(q); }
          catch (err) {
            const q2 = query(colRef, where(field, '==', userId));
            snap = await getDocs(q2);
          }
          snap.forEach(d => {
            const o = this._toPlainObject(d);
            if (o) found.push(o);
          });
          if (found.length) break;
        } catch (e) {
          console.warn('fallback engenheiro query error:', e);
        }
      }

      // dedupe
      const map = new Map();
      found.forEach(f => { if (f && f.id) map.set(f.id, f); });
      return Array.from(map.values());
    } catch (error) {
      console.error('Erro getObrasByEngenheiro:', error);
      throw error;
    }
  }

  /** General fallback multi-field search for a user */
  async getObrasDoUsuario({ uid, email } = {}) {
    if (USE_API) {
      try {
        return await api.get('/api/obras/usuario');
      } catch (error) {
        console.error('Erro ao listar obras do usuário:', error);
        return [];
      }
    }
    const colRef = collection(db, this.collectionName);
    const found = new Map();
    const tryAndPush = async (q) => {
      try {
        const snap = await getDocs(q);
        snap.forEach(d => {
          const o = this._toPlainObject(d);
          if (o && o.id) found.set(o.id, o);
        });
      } catch (e) {
        // ignore
      }
    };

    if (uid) {
      await tryAndPush(query(colRef, where('proprietarioUid', '==', uid)));
      await tryAndPush(query(colRef, where('ownerUid', '==', uid)));
      await tryAndPush(query(colRef, where('engenheiroId', '==', uid)));
      await tryAndPush(query(colRef, where('createdById', '==', uid)));
    }

    if (email) {
      const e = String(email).toLowerCase().trim();
      await tryAndPush(query(colRef, where('proprietarioEmail', '==', e)));
      await tryAndPush(query(colRef, where('ownerEmail', '==', e)));
      await tryAndPush(query(colRef, where('proprietario', '==', e)));
    }

    return Array.from(found.values()).sort((a, b) => {
      const A = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const B = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return B - A;
    });
  }

  async updateObra(id, obraData) {
    if (USE_API) {
      try {
        const updated = await api.put(`/api/obras/${id}`, obraData);
        return { id, ...obraData, ...updated };
      } catch (error) {
        console.error('Erro ao atualizar obra:', error);
        throw error;
      }
    }
    try {
      if (!id) throw new Error('ID obrigatório');
      const obraRef = doc(db, this.collectionName, id);
      await updateDoc(obraRef, { ...obraData, updatedAt: serverTimestamp() });
      return { id, ...obraData };
    } catch (error) {
      console.error('Erro ao atualizar obra:', error);
      throw error;
    }
  }

  async deleteObra(id) {
    if (USE_API) {
      try {
        await api.delete(`/api/obras/${id}`);
        return true;
      } catch (error) {
        console.error('Erro ao deletar obra:', error);
        throw error;
      }
    }
    try {
      if (!id) throw new Error('ID obrigatório');
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar obra:', error);
      throw error;
    }
  }

  /** Vincula obras pendentes a um proprietário quando ele se cadastra */
  async vincularObrasAoProprietario(proprietarioEmail, proprietarioId) {
    try {
      if (!proprietarioEmail || !proprietarioId) return;
      
      const emailLower = String(proprietarioEmail).toLowerCase().trim();
      const colRef = collection(db, this.collectionName);
      
      // Buscar obras que têm o email do proprietário mas não têm proprietarioId
      const obrasParaVincular = [];
      
      try {
        // Tentar buscar por proprietarioEmail
        const q1 = query(colRef, where('proprietarioEmail', '==', emailLower));
        const snap1 = await getDocs(q1);
        snap1.forEach(d => {
          const o = this._toPlainObject(d);
          if (o && (!o.proprietarioId || o.proprietarioPendente)) {
            obrasParaVincular.push(o.id);
          }
        });
      } catch (e) {
        console.warn('Erro ao buscar obras por proprietarioEmail:', e);
      }
      
      // Tentar também por ownerEmail
      try {
        const q2 = query(colRef, where('ownerEmail', '==', emailLower));
        const snap2 = await getDocs(q2);
        snap2.forEach(d => {
          const o = this._toPlainObject(d);
          if (o && o.id && !obrasParaVincular.includes(o.id)) {
            if (!o.proprietarioId || o.proprietarioPendente) {
              obrasParaVincular.push(o.id);
            }
          }
        });
      } catch (e) {
        console.warn('Erro ao buscar obras por ownerEmail:', e);
      }
      
      // Atualizar todas as obras encontradas
      let atualizadas = 0;
      for (const obraId of obrasParaVincular) {
        try {
          const obraRef = doc(db, this.collectionName, obraId);
          await updateDoc(obraRef, {
            proprietarioId: proprietarioId,
            proprietarioPendente: false,
            updatedAt: serverTimestamp()
          });
          atualizadas++;
        } catch (e) {
          console.warn(`Erro ao vincular obra ${obraId}:`, e);
        }
      }
      
      if (atualizadas > 0) {
        console.log(`Vinculadas ${atualizadas} obra(s) ao proprietário ${proprietarioId}`);
      }
      
      return atualizadas;
    } catch (error) {
      console.error('Erro ao vincular obras ao proprietário:', error);
      // Não lançar erro, apenas logar
      return 0;
    }
  }
}

const obraService = new ObraService();

/* named exports for compatibility */
export async function listObras() {
  return await obraService.getObras();
}
export async function getObraByIdNamed(id) {
  return await obraService.getObraById(id);
}
export async function addObra(data) {
  return await obraService.createObra(data);
}
export async function updateObraNamed(id, partial) {
  return await obraService.updateObra(id, partial);
}
export async function deleteObraNamed(id) {
  return await obraService.deleteObra(id);
}
export async function getObrasByProprietarioNamed(email) {
  return await obraService.getObrasByProprietario(email);
}
export async function getObrasByEngenheiroNamed(userId) {
  return await obraService.getObrasByEngenheiro(userId);
}
export async function getObrasDoUsuarioNamed(obj) {
  return await obraService.getObrasDoUsuario(obj);
}

export default obraService;
