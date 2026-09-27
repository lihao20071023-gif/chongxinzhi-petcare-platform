Component({
  properties: {
    role: { type: String, value: 'pet_owner' },
    active: { type: String, value: 'home' }
  },
  methods: {
    go(event) {
      const url = event.currentTarget.dataset.url;
      if (!url) return;
      wx.reLaunch({ url });
    }
  }
});
