const api = require('../../../services/api');
const { requireRole } = require('../../../utils/role-router');

Page({
  data: { reports: [], error: '', uploading: false },
  onShow() { if (requireRole(['pet_owner'])) this.load(); },
  async load() { try { const result = await api.request('/owner/reports'); this.setData({ reports: result.items || [], error: '' }); } catch (error) { this.setData({ error: error.message }); } },
  choose() {
    wx.chooseMedia({ count: 4, mediaType: ['image'], sourceType: ['album', 'camera'], success: async ({ tempFiles }) => {
      this.setData({ uploading: true });
      try {
        for (const file of tempFiles) {
          const filePath = file.tempFilePath;
          const extension = (filePath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/) || [null, 'jpg'])[1].toLowerCase();
          const contentType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
          const ticket = await api.request('/owner/reports/upload-ticket', {
            method: 'POST',
            data: { fileName: `lab-report.${extension}` }
          });
          await api.uploadSignedFile(ticket.signedUrl, filePath, contentType);
          await api.request(`/pets/${ticket.petId}/lab-reports`, {
            method: 'POST',
            data: { reportType: '宠主上传化验单', sourceFilePath: ticket.path }
          });
        }
        await this.load();
        wx.showToast({ title: '已安全存档', icon: 'success' });
      }
      catch (error) { this.setData({ error: error.message }); }
      finally { this.setData({ uploading: false }); }
    }});
  }
});
