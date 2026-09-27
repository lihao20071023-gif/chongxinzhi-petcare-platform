const api = require('../../../services/api');
const { requireRole } = require('../../../utils/role-router');

Page({
  data: { items: [], error: '', period: 7 },
  onShow() { if (requireRole(['doctor'])) this.load(); },
  selectPeriod(event) { this.setData({ period: Number(event.currentTarget.dataset.days) }); this.load(); },
  async load() { try { const result = await api.request(`/doctor/execution?days=${this.data.period}`); this.setData({ items: result.items || [], error: '' }); } catch (error) { this.setData({ error: error.message }); } }
});
