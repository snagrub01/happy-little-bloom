import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ce3c2b63ca1a46948ac4629876f3aab7',
  appName: 'Bag Au Pair',
  webDir: 'dist',
  androidScheme: 'https',
  // NOTE: For local development with hot-reload from the Lovable sandbox,
  // temporarily uncomment the `server` block below. For production builds
  // submitted to the App Store / Play Store, leave it commented out so the
  // app loads bundled assets from `dist/`.
  // server: {
  //   url: 'https://ce3c2b63-ca1a-4694-8ac4-629876f3aab7.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
    },
    BackgroundGeolocation: {
      debug: false,
      stopOnTerminate: false,
      startOnBoot: true,
    },
  },
};

export default config;
