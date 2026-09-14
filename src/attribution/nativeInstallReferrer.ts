export type InstallReferrerDetails = {
  rawReferrer: string;
  referrerClickTimestampSeconds: number;
  referrerClickTimestampServerSeconds: number;
  installBeginTimestampSeconds: number;
  installBeginTimestampServerSeconds: number;
  installVersion: string | null;
  googlePlayInstant: boolean;
};

export async function readInstallReferrer(): Promise<InstallReferrerDetails | null> {
  return null;
}
