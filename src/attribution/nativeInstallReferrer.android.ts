import InstallReferrer, {
  type InstallReferrerDetails,
} from '../../modules/expo-install-referrer';

export async function readInstallReferrer(): Promise<InstallReferrerDetails | null> {
  return InstallReferrer.getInstallReferrerAsync();
}
