const api = require('../../../services/api');
const { requireRole } = require('../../../utils/role-router');

Page({
  data: { caseId: '', cases: [], generated: null, error: '', generating: false, publishing: false, form: { title: '院后护理方案', medicalOrder: '', startDate: '' } },
  onLoad(options) { if (!requireRole(['doctor'])) return; this.setData({ caseId: options.caseId || '' }); this.loadCases(); },
  async loadCases() { try { const result = await api.request('/cases?status=active'); const cases = (result.items || []).map((item) => ({ ...item, displayName: `${item.pets && item.pets.name ? item.pets.name : '未命名宠物'} · ${item.title}` })); this.setData({ cases, caseId: this.data.caseId || (cases[0] && cases[0].id) || '' }); } catch (error) { this.setData({ error: error.message }); } },
  input(event) { this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value }); },
  chooseCase(event) { this.setData({ caseId: this.data.cases[Number(event.detail.value)].id, generated: null }); },
  async generate() { try { this.setData({ generating: true, error: '' }); const generated = await api.request(`/cases/${this.data.caseId}/care-plans/generate-tasks`, { method: 'POST', data: this.data.form }); this.setData({ generated, generating: false }); } catch (error) { this.setData({ error: error.message, generating: false }); } },
  async publish() { try { this.setData({ publishing: true }); await api.request(`/care-plans/${this.data.generated.plan.id}/publish`, { method: 'POST' }); wx.showToast({ title: '医嘱已发布' }); wx.redirectTo({ url: `/pages/doctor/case-detail/index?id=${this.data.caseId}` }); } catch (error) { this.setData({ error: error.message, publishing: false }); } }
});
