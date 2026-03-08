// src/services/fotoService.js
import { USE_API } from '../config';
import { request } from '../api/client';
import { storage, db } from '../firebase';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject
} from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

class FotoService {
  constructor() {
    this.storageRef = 'obras-fotos';
    this.collectionName = 'fotos';
  }

  /**
   * Upload de foto para Firebase Storage e salva metadados no Firestore
   * @param {File} file - Arquivo da foto
   * @param {string} obraId - ID da obra
   * @param {string} autorId - ID do usuário que está fazendo upload
   * @param {string} autorNome - Nome do autor
   * @param {string} descricao - Descrição da foto (opcional)
   * @returns {Promise<Object>} Dados da foto salva
   */
  async uploadFoto(file, obraId, autorId, autorNome, descricao = '') {
    if (USE_API) {
      try {
        if (!file || !obraId || !autorId) throw new Error('Dados incompletos para upload de foto');
        const form = new FormData();
        form.append('file', file);
        form.append('descricao', descricao || '');
        const data = await request('POST', `/api/obras/${obraId}/fotos`, form);
        return { id: data.id, obraId: data.obraId, autorId: data.autorId, autorNome: data.autorNome, descricao: data.descricao, fileName: data.fileName, storagePath: data.storagePath, url: data.url, tamanho: data.tamanho, tipo: data.tipo, criadoEm: data.criadoEm, dataISO: data.criadoEm };
      } catch (error) {
        console.error('Erro ao fazer upload da foto:', error);
        throw error;
      }
    }
    try {
      if (!file || !obraId || !autorId) {
        throw new Error('Dados incompletos para upload de foto');
      }

      // Criar referência no Storage: obras-fotos/{obraId}/{timestamp}-{nomeArquivo}
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const storagePath = `${this.storageRef}/${obraId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // Upload do arquivo
      console.log('Fazendo upload da foto:', fileName);
      const snapshot = await uploadBytes(storageRef, file);
      
      // Obter URL de download
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Foto enviada com sucesso. URL:', downloadURL);

      // Salvar metadados no Firestore
      const fotoData = {
        obraId: obraId,
        autorId: autorId,
        autorNome: autorNome || 'Engenheiro',
        descricao: descricao.trim(),
        fileName: fileName,
        storagePath: storagePath,
        url: downloadURL,
        tamanho: file.size,
        tipo: file.type,
        criadoEm: serverTimestamp(),
        dataISO: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, this.collectionName), fotoData);
      console.log('Metadados da foto salvos no Firestore:', docRef.id);

      return {
        id: docRef.id,
        ...fotoData,
        criadoEm: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      throw error;
    }
  }

  /**
   * Buscar todas as fotos de uma obra
   * @param {string} obraId - ID da obra
   * @returns {Promise<Array>} Lista de fotos
   */
  async getFotosByObra(obraId) {
    if (USE_API) {
      try {
        if (!obraId) return [];
        const list = await request('GET', `/api/obras/${obraId}/fotos`);
        return Array.isArray(list) ? list : [];
      } catch (error) {
        console.error('Erro ao buscar fotos:', error);
        return [];
      }
    }
    try {
      if (!obraId) return [];

      const q = query(
        collection(db, this.collectionName),
        where('obraId', '==', obraId),
        orderBy('criadoEm', 'desc')
      );

      const snapshot = await getDocs(q);
      const fotos = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Converter Timestamp para ISO string se necessário
        const criadoEm = data.criadoEm?.toDate 
          ? data.criadoEm.toDate().toISOString() 
          : data.criadoEm || data.dataISO;

        fotos.push({
          id: doc.id,
          obraId: data.obraId,
          autorId: data.autorId,
          autorNome: data.autorNome,
          descricao: data.descricao || '',
          url: data.url,
          fileName: data.fileName,
          storagePath: data.storagePath,
          tamanho: data.tamanho,
          tipo: data.tipo,
          dataISO: criadoEm,
          criadoEm: criadoEm
        });
      });

      return fotos;
    } catch (error) {
      console.error('Erro ao buscar fotos:', error);
      // Se houver erro de índice, tentar sem orderBy
      try {
        const q = query(
          collection(db, this.collectionName),
          where('obraId', '==', obraId)
        );
        const snapshot = await getDocs(q);
        const fotos = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const criadoEm = data.criadoEm?.toDate 
            ? data.criadoEm.toDate().toISOString() 
            : data.criadoEm || data.dataISO;
          fotos.push({
            id: doc.id,
            ...data,
            dataISO: criadoEm,
            criadoEm: criadoEm
          });
        });
        // Ordenar manualmente por data
        fotos.sort((a, b) => {
          const dateA = new Date(a.criadoEm || 0).getTime();
          const dateB = new Date(b.criadoEm || 0).getTime();
          return dateB - dateA;
        });
        return fotos;
      } catch (e2) {
        console.error('Erro ao buscar fotos (fallback):', e2);
        return [];
      }
    }
  }

  /**
   * Deletar foto (Storage + Firestore)
   * @param {string} fotoId - ID da foto no Firestore
   * @returns {Promise<boolean>}
   */
  async deleteFoto(fotoId) {
    if (USE_API) {
      try {
        if (!fotoId) throw new Error('ID da foto é obrigatório');
        await request('DELETE', `/api/obras/foto/${fotoId}`);
        return true;
      } catch (error) {
        console.error('Erro ao deletar foto:', error);
        throw error;
      }
    }
    try {
      if (!fotoId) throw new Error('ID da foto é obrigatório');

      // Buscar dados da foto no Firestore pelo ID
      const fotoDocRef = doc(db, this.collectionName, fotoId);
      const fotoSnap = await getDoc(fotoDocRef);

      if (!fotoSnap.exists()) {
        throw new Error('Foto não encontrada no Firestore');
      }

      const fotoData = fotoSnap.data();
      const storagePath = fotoData.storagePath;

      // Deletar do Storage
      if (storagePath) {
        try {
          const storageRef = ref(storage, storagePath);
          await deleteObject(storageRef);
          console.log('Foto deletada do Storage:', storagePath);
        } catch (storageError) {
          console.warn('Erro ao deletar do Storage (continuando):', storageError);
          // Continuar mesmo se falhar no Storage (pode já ter sido deletado)
        }
      }

      // Deletar do Firestore
      await deleteDoc(fotoDocRef);
      console.log('Foto deletada do Firestore:', fotoId);

      return true;
    } catch (error) {
      console.error('Erro ao deletar foto:', error);
      throw error;
    }
  }

  /**
   * Contar fotos de uma obra
   * @param {string} obraId - ID da obra
   * @returns {Promise<number>} Número de fotos
   */
  async countFotosByObra(obraId) {
    try {
      const fotos = await this.getFotosByObra(obraId);
      return fotos.length;
    } catch (error) {
      console.error('Erro ao contar fotos:', error);
      return 0;
    }
  }
}

const fotoService = new FotoService();

export default fotoService;

