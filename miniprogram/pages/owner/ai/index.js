const api = require('../../../services/api');
const { requireRole } = require('../../../utils/role-router');

Page({
  data: { question: '', messages: [], sending: false, error: '' },
  onLoad() { requireRole(['pet_owner']); },
  input(event) { this.setData({ question: event.detail.value }); },
  async send() {
    const question = this.data.question.trim(); if (!question) return;
    const messages = [...this.data.messages, { role: 'user', text: question }];
    this.setData({ messages, question: '', sending: true, error: '' });
    try { const result = await api.request('/ai/chat', { method: 'POST', data: { question } }); this.setData({ messages: [...messages, { role: 'assistant', text: result.answer, sources: result.sources || [] }], sending: false }); }
    catch (error) { this.setData({ error: error.message, sending: false }); }
  }
});
