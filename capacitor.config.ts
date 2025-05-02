import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thelightcome.glasspuzzle',
  appName: 'Glass Puzzle',
  webDir: 'docs',
  server: {
    androidScheme: 'https'
  }
};

export default config;
