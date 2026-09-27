const api = require('../../../services/api');
const { requireRole } = require('../../../utils/role-router');

Page({
  data: { pets: [], hospitals: [], error: '', binding: { petId: '', hospitalId: '' }, form: { name: '', species: 'cat', breed: '', weightKg: '', disease: '', stage: '' } },
  onShow() { if (requireRole(['pet_owner'])) this.load(); },
  async load() { try { const [petsResult, hospitalsResult] = await Promise.all([api.request('/owner/pets'), api.request('/owner/hospitals')]); const pets = petsResult.items || []; const hospitals = hospitalsResult.items || []; this.setData({ pets, hospitals, 'binding.petId': this.data.binding.petId || (pets[0] && pets[0].id) || '', 'binding.hospitalId': this.data.binding.hospitalId || (hospitals[0] && hospitals[0].id) || '', error: '' }); } catch (error) { this.setData({ error: error.message }); } },
  input(event) { this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value }); },
  selectSpecies(event) { this.setData({ 'form.species': event.currentTarget.dataset.value }); },
  choosePet(event) { this.setData({ 'binding.petId': this.data.pets[Number(event.detail.value)].id }); },
  chooseHospital(event) { this.setData({ 'binding.hospitalId': this.data.hospitals[Number(event.detail.value)].id }); },
  async savePet() {
    try { await api.request('/owner/pets', { method: 'POST', data: this.data.form }); this.setData({ form: { name: '', species: 'cat', breed: '', weightKg: '', disease: '', stage: '' } }); await this.load(); wx.showToast({ title: '档案已保存' }); }
    catch (error) { this.setData({ error: error.message }); }
  },
  async bindHospital() {
    try { await api.request('/owner/hospitals', { method: 'POST', data: this.data.binding }); await this.load(); wx.showToast({ title: '医院已授权' }); }
    catch (error) { this.setData({ error: error.message }); }
  },
  openReports() { wx.navigateTo({ url: '/pages/owner/reports/index' }); }
});
