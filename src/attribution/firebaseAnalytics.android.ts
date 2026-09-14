import { getAnalytics, getAppInstanceId, logEvent, setConsent, setUserProperty } from '@react-native-firebase/analytics';
import type { AttributionAnalytics } from './firebaseAnalytics';

export async function configureAttributionAnalytics(): Promise<AttributionAnalytics> {
  const analytics = getAnalytics();
  await setConsent(analytics, {
    analytics_storage: true,
    ad_storage: true,
    ad_user_data: false,
    ad_personalization: false,
  });
  await setUserProperty(analytics, 'allow_personalized_ads', 'false');
  const appInstanceId = await getAppInstanceId(analytics).catch(() => null);
  return {
    appInstanceId,
    logCaptured: async (source, hasGclid, hasGbraid, hasWbraid) => {
      await logEvent(analytics, 'install_attribution_captured', {
        traffic_source: source,
        has_gclid: hasGclid ? 1 : 0,
        has_gbraid: hasGbraid ? 1 : 0,
        has_wbraid: hasWbraid ? 1 : 0,
      });
    },
  };
}
