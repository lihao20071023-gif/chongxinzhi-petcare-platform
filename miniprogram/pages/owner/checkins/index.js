const api = require('../../../services/api');
const { requireRole } = require('../../../utils/role-router');

const emptyForm = { petId: '', weightKg: '', waterMl: '', appetite: '正常', spirit: '正常', urineNote: '', stoolNote: '', vomitingCount: '0', symptomNote: '' };

Page({
  data: { pets: [], history: [], form: { ...emptyForm }, error: '', saved: false },
  onShow() { if (requireRole(['pet_owner'])) this.load(); },
  async load() {
    try {
      const result = await api.request('/owner/checkins');
      const pets = result.pets || [];
      this.setData({ pets, history: result.items || [], 'form.petId': this.data.form.petId || (pets[0] && pets[0].id) || '', error: '' });
    } catch (error) { this.setData({ error: error.message }); }
  },
  input(event) { this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value, saved: false }); },
  choosePet(event) { const index = Number(event.detail.value); this.setData({ 'form.petId': this.data.pets[index].id }); },
  async save() {
    try { await api.request('/owner/checkins', { method: 'POST', data: this.data.form }); this.setData({ form: { ...emptyForm, petId: this.data.form.petId }, saved: true }); await this.load(); }
    catch (error) { this.setData({ error: error.message }); }
  }
});
