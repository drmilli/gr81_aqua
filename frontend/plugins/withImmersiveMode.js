const { withAndroidStyles, withAndroidManifest } = require('@expo/config-plugins');

// Forces true immersive fullscreen on Android:
// - Hides status bar + navigation bar
// - Uses LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES for notch/cutout displays
// - Sticky immersive mode so bars don't reappear on swipe
module.exports = function withImmersiveMode(config) {
  // 1. Set the app theme to fullscreen in styles.xml
  config = withAndroidStyles(config, (cfg) => {
    const styles = cfg.modResults.resources.style;
    const appTheme = styles?.find(s => s.$?.name === 'AppTheme');
    if (appTheme) {
      if (!appTheme.item) appTheme.item = [];
      const set = (name, value) => {
        const existing = appTheme.item.find(i => i.$?.name === name);
        if (existing) existing._ = value;
        else appTheme.item.push({ $: { name }, _: value });
      };
      set('android:windowFullscreen', 'true');
      set('android:windowLayoutInDisplayCutoutMode', 'shortEdges');
    }
    return cfg;
  });

  // 2. Add systemUiVisibility flags via manifest activity attribute
  config = withAndroidManifest(config, (cfg) => {
    const activities = cfg.modResults.manifest?.application?.[0]?.activity || [];
    const main = activities.find(a =>
      (a['intent-filter'] || []).some(f =>
        (f.action || []).some(ac => ac.$?.['android:name'] === 'android.intent.action.MAIN')
      )
    );
    if (main) {
      main.$['android:screenOrientation'] = 'landscape';
    }
    return cfg;
  });

  return config;
};
