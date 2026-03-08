// src/services/chatService.js
import { USE_API } from '../config';
import { api } from '../api/client';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

class ChatService {
  constructor() {
    this.collectionName = 'mensagens';
  }

  /**
   * Enviar uma mensagem no chat de uma obra
   * @param {string} obraId - ID da obra
   * @param {string} autorId - ID do usuário que está enviando
   * @param {string} autorNome - Nome do autor
   * @param {string} texto - Texto da mensagem
   * @returns {Promise<Object>} Dados da mensagem salva
   */
  async enviarMensagem(obraId, autorId, autorNome, texto) {
    if (USE_API) {
      try {
        const data = await api.post(`/api/obras/${obraId}/mensagens`, { texto: texto?.trim() });
        return { id: data.id, obraId: data.obraId, autorId: data.autorId, autorNome: data.autorNome, texto: data.texto, criadoEm: data.criadoEm, dataISO: data.dataISO };
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        throw error;
      }
    }
    try {
      if (!obraId || !autorId || !texto || !texto.trim()) {
        throw new Error('Dados incompletos para enviar mensagem');
      }

      const mensagemData = {
        obraId: obraId,
        autorId: autorId,
        autorNome: autorNome || 'Usuário',
        texto: texto.trim(),
        criadoEm: serverTimestamp(),
        dataISO: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, this.collectionName), mensagemData);
      console.log('Mensagem enviada:', docRef.id);

      return {
        id: docRef.id,
        ...mensagemData,
        criadoEm: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  /**
   * Buscar mensagens de uma obra
   * @param {string} obraId - ID da obra
   * @param {number} maxMensagens - Número máximo de mensagens (padrão: 100)
   * @returns {Promise<Array>} Lista de mensagens
   */
  async getMensagensByObra(obraId, maxMensagens = 100) {
    if (USE_API) {
      try {
        if (!obraId) return [];
        const list = await api.get(`/api/obras/${obraId}/mensagens?limit=${maxMensagens}`);
        return Array.isArray(list) ? list : [];
      } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        return [];
      }
    }
    try {
      if (!obraId) return [];

      const colRef = collection(db, this.collectionName);
      const mensagens = [];

      const montarSnapshot = (snapshot) => {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const criadoEm = data.criadoEm?.toDate
            ? data.criadoEm.toDate().toISOString()
            : data.criadoEm || data.dataISO || new Date().toISOString();

          mensagens.push({
            id: docSnap.id,
            obraId: data.obraId,
            autorId: data.autorId,
            autorNome: data.autorNome || 'Usuário',
            texto: data.texto || '',
            dataISO: criadoEm,
            criadoEm,
            ts: new Date(criadoEm).getTime(),
          });
        });
      };

      try {
        const qOrdenada = query(
          colRef,
          where('obraId', '==', obraId),
          orderBy('criadoEm', 'asc'),
          limit(maxMensagens)
        );
        const snapshot = await getDocs(qOrdenada);
        montarSnapshot(snapshot);
      } catch (errorOrdenacao) {
        if (errorOrdenacao?.code === 'failed-precondition') {
          console.warn('Índice ausente para mensagens; usando fallback sem orderBy.');
          const qSemOrdenacao = query(
            colRef,
            where('obraId', '==', obraId),
            limit(maxMensagens)
          );
          const snapshotFallback = await getDocs(qSemOrdenacao);
          montarSnapshot(snapshotFallback);
        } else {
          throw errorOrdenacao;
        }
      }

      mensagens.sort((a, b) => a.ts - b.ts);
      return mensagens;
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return [];
    }
  }

  /**
   * Escutar mensagens em tempo real (para atualização automática)
   * @param {string} obraId - ID da obra
   * @param {Function} callback - Função chamada quando há novas mensagens
   * @returns {Function} Função para cancelar a escuta
   */
  onMensagensChange(obraId, callback) {
    if (!obraId || !callback) {
      console.warn('onMensagensChange: obraId ou callback não fornecidos');
      return () => {};
    }

    if (USE_API) {
      const interval = setInterval(async () => {
        try {
          const list = await api.get(`/api/obras/${obraId}/mensagens`);
          callback(Array.isArray(list) ? list : []);
        } catch (_) {}
      }, 3000);
      return () => clearInterval(interval);
    }

    const colRef = collection(db, this.collectionName);

    const processSnapshot = (snapshot) => {
      const mensagens = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const criadoEm = data.criadoEm?.toDate
          ? data.criadoEm.toDate().toISOString()
          : data.criadoEm || data.dataISO || new Date().toISOString();

        mensagens.push({
          id: docSnap.id,
          obraId: data.obraId,
          autorId: data.autorId,
          autorNome: data.autorNome || 'Usuário',
          texto: data.texto || '',
          dataISO: criadoEm,
          criadoEm,
          ts: new Date(criadoEm).getTime(),
        });
      });

      mensagens.sort((a, b) => a.ts - b.ts);
      callback(mensagens);
    };

    const attachListener = (usarOrdenacao) => {
      try {
        const qRef = usarOrdenacao
          ? query(colRef, where('obraId', '==', obraId), orderBy('criadoEm', 'asc'))
          : query(colRef, where('obraId', '==', obraId));

        return onSnapshot(
          qRef,
          processSnapshot,
          async (error) => {
            console.error('Erro no listener de mensagens:', error);
            if (usarOrdenacao && error?.code === 'failed-precondition') {
              console.warn('Índice ausente para listener; caindo para listener sem orderBy.');
              fallbackUnsub = attachListener(false);
            } else {
              const mensagens = await this.getMensagensByObra(obraId).catch(console.error);
              if (mensagens) callback(mensagens);
            }
          }
        );
      } catch (error) {
        console.error('Erro ao anexar listener de mensagens:', error);
        return null;
      }
    };

    let fallbackUnsub = null;
    const primaryUnsub = attachListener(true) || attachListener(false);

    return () => {
      if (primaryUnsub) primaryUnsub();
      if (fallbackUnsub) fallbackUnsub();
    };
  }
}

const chatService = new ChatService();

export default chatService;

