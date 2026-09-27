const session = require('./services/session');

App({
  globalData: { session: null },
  onLaunch() {
    this.globalData.session = session.load();
  }
});
