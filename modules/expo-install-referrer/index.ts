import { requireNativeModule } from 'expo-modules-core';

export type InstallReferrerDetails = {
  rawReferrer: string;
  referrerClickTimestampSeconds: number;
  referrerClickTimestampServerSeconds: number;
  installBeginTimestampSeconds: number;
  installBeginTimestampServerSeconds: number;
  installVersion: string | null;
  googlePlayInstant: boolean;
};

type ExpoInstallReferrerModule = {
  getInstallReferrerAsync(): Promise<InstallReferrerDetails>;
};

export default requireNativeModule<ExpoInstallReferrerModule>('ExpoInstallReferrer');
