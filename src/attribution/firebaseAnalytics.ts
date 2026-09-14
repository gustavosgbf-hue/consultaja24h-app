export type AttributionAnalytics = {
  appInstanceId: string | null;
  logCaptured: (source: string, hasGclid: boolean, hasGbraid: boolean, hasWbraid: boolean) => Promise<void>;
};

export async function configureAttributionAnalytics(): Promise<AttributionAnalytics> {
  return {
    appInstanceId: null,
    logCaptured: async () => {},
  };
}
