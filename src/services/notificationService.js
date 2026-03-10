import { USE_API } from '../config';
import { api } from '../api/client';

class NotificationService {
  async getUnreadSummary() {
    if (!USE_API) {
      return { byObra: {}, total: 0 };
    }
    try {
      const data = await api.get('/api/notifications/unread');
      const byObra = data?.byObra || {};
      const total = data?.total || 0;

      // Normalizar estrutura para facilitar uso no frontend
      const normalized = {};
      Object.keys(byObra).forEach((obraId) => {
        const entry = byObra[obraId] || {};
        const mensagens = entry.mensagem || 0;
        const imagens = entry.imagem || 0;
        normalized[obraId] = {
          mensagens,
          imagens,
          total: mensagens + imagens
        };
      });

      return { byObra: normalized, total };
    } catch (error) {
      console.error('Erro ao buscar notificações não lidas:', error);
      return { byObra: {}, total: 0 };
    }
  }

  async markAsRead({ obraId, tipo } = {}) {
    if (!USE_API) return 0;
    if (!obraId) return 0;
    try {
      const body = { obraId };
      if (tipo === 'mensagem' || tipo === 'imagem') {
        body.tipo = tipo;
      }
      const res = await api.post('/api/notifications/mark-read', body);
      return res?.updated || 0;
    } catch (error) {
      console.error('Erro ao marcar notificações como lidas:', error);
      return 0;
    }
  }
}

const notificationService = new NotificationService();

export default notificationService;

