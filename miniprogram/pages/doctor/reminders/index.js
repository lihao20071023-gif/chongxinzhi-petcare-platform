const api = require('../../../services/api');
const { requireRole } = require('../../../utils/role-router');

Page({
  data: { cases: [], items: [], form: { petId: '', dueAt: '', reason: '' }, error: '' },
  onShow() { if (requireRole(['doctor'])) this.load(); },
  async load() { try { const result = await api.request('/doctor/followups'); this.setData({ cases: result.cases || [], items: result.items || [], 'form.petId': this.data.form.petId || ((result.cases || [])[0] || {}).id || '', error: '' }); } catch (error) { this.setData({ error: error.message }); } },
  input(event) { this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value }); },
  chooseCase(event) { this.setData({ 'form.petId': this.data.cases[Number(event.detail.value)].id }); },
  async save() { try { await api.request('/doctor/followups', { method: 'POST', data: this.data.form }); await this.load(); wx.showToast({ title: '提醒已保存' }); } catch (error) { this.setData({ error: error.message }); } }
});
