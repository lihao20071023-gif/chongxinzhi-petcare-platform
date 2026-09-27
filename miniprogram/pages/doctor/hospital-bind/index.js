const api = require('../../../services/api');
const { requireRole } = require('../../../utils/role-router');

Page({
  data: {
    hospitals: [], application: null, mode: 'existing', error: '', saved: false,
    form: { hospitalId: '', hospitalName: '', legalName: '', phone: '', licenseNo: '', address: '' }
  },
  onShow() { if (requireRole(['doctor'])) this.load(); },
  async load() { try { const result = await api.request('/doctor/hospital-bindings'); if (result.application && result.application.status === 'approved') { wx.reLaunch({ url: '/pages/doctor/home/index' }); return; } this.setData({ hospitals: result.hospitals || [], application: result.application || null, error: '' }); } catch (error) { this.setData({ error: error.message }); } },
  mode(event) { this.setData({ mode: event.currentTarget.dataset.mode, error: '' }); },
  input(event) { this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value }); },
  chooseHospital(event) { this.setData({ 'form.hospitalId': this.data.hospitals[Number(event.detail.value)].id }); },
  async submit() {
    try { await api.request('/doctor/hospital-bindings', { method: 'POST', data: { ...this.data.form, mode: this.data.mode } }); this.setData({ saved: true }); await this.load(); }
    catch (error) { this.setData({ error: error.message }); }
  }
});
