import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.gojulls',
  appName: 'Go, Julls!',
  webDir: 'dist',
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      backgroundColor: '#0B0B0F',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
    },
    LocalNotifications: { smallIcon: 'ic_stat_gojulls', iconColor: '#FF2E93' },
    StatusBar: { style: 'DARK', backgroundColor: '#0B0B0F' },
  },
};

export default config;
