const api = require('../../../services/api');
const { requireRole } = require('../../../utils/role-router');

Page({
  data: { items: [], error: '', petId: '' },
  onShow() { if (requireRole(['pet_owner'])) this.load(); },
  async load() { try { const result = await api.request('/owner/care-tasks'); this.setData({ items: result.items || [], petId: result.petId || '', error: '' }); } catch (error) { this.setData({ error: error.message }); } },
  async complete(event) {
    try { await api.request(`/owner/care-tasks/${event.currentTarget.dataset.id}/complete`, { method: 'POST', data: { status: 'completed', petId: this.data.petId } }); await this.load(); wx.showToast({ title: '已存档' }); }
    catch (error) { this.setData({ error: error.message }); }
  }
});
