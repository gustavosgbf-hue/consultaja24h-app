import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { readInstallReferrer, type InstallReferrerDetails } from './nativeInstallReferrer';
import { configureAttributionAnalytics } from './firebaseAnalytics';

const API_URL = 'https://triagem-api.onrender.com/api/tracking/app-install';
const STORAGE_KEY = 'consultaja_install_attribution_v1';

export type AppAttribution = {
  install_id: string;
  attribution_id?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  raw_referrer?: string;
  referrer_click_timestamp_seconds?: number;
  install_begin_timestamp_seconds?: number;
  install_version?: string;
  captured_at: string;
  reported_at?: string;
};

let bootstrapPromise: Promise<AppAttribution | null> | null = null;

function clean(value: string | null, max = 500): string | undefined {
  const normalized = String(value || '').trim().slice(0, max);
  return normalized || undefined;
}

export function parseInstallReferrer(details: InstallReferrerDetails, installId: string): AppAttribution {
  const params = new URLSearchParams(details.rawReferrer || '');
  return {
    install_id: installId,
    attribution_id: clean(params.get('cjaid'), 160),
    gclid: clean(params.get('gclid'), 220),
    gbraid: clean(params.get('gbraid'), 220),
    wbraid: clean(params.get('wbraid'), 220),
    utm_source: clean(params.get('utm_source'), 220),
    utm_medium: clean(params.get('utm_medium'), 220),
    utm_campaign: clean(params.get('utm_campaign'), 220),
    utm_term: clean(params.get('utm_term'), 220),
    utm_content: clean(params.get('utm_content'), 220),
    raw_referrer: clean(details.rawReferrer, 1800),
    referrer_click_timestamp_seconds: details.referrerClickTimestampServerSeconds || details.referrerClickTimestampSeconds || undefined,
    install_begin_timestamp_seconds: details.installBeginTimestampServerSeconds || details.installBeginTimestampSeconds || undefined,
    install_version: clean(details.installVersion, 80),
    captured_at: new Date().toISOString(),
  };
}

async function readStored(): Promise<AppAttribution | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppAttribution;
    return parsed?.install_id ? parsed : null;
  } catch {
    return null;
  }
}

async function store(value: AppAttribution): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(value));
}

async function capture(): Promise<AppAttribution> {
  const existing = await readStored();
  if (existing) return existing;

  const installId = `install_${randomUUID()}`;
  try {
    const details = await readInstallReferrer();
    if (details) {
      const captured = parseInstallReferrer(details, installId);
      await store(captured);
      return captured;
    }
  } catch {
    // Instalação fora da Play ou serviço temporariamente indisponível: ainda mantemos identidade anônima.
  }

  const organic: AppAttribution = {
    install_id: installId,
    captured_at: new Date().toISOString(),
  };
  await store(organic);
  return organic;
}

async function report(attribution: AppAttribution): Promise<AppAttribution> {
  if (attribution.reported_at) return attribution;
  const analytics = await configureAttributionAnalytics();
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ConsultaJa-Platform': 'android' },
    body: JSON.stringify({
      ...attribution,
      platform: 'android',
      package_name: 'com.consultaja24h.app',
      firebase_app_instance_id: analytics.appInstanceId || undefined,
    }),
  });
  if (!response.ok) throw new Error(`app_attribution_${response.status}`);

  await analytics.logCaptured(
    attribution.utm_source || 'organic_or_unknown',
    !!attribution.gclid,
    !!attribution.gbraid,
    !!attribution.wbraid,
  );
  const reported = { ...attribution, reported_at: new Date().toISOString() };
  await store(reported);
  return reported;
}

export function initializeAndroidAttribution(): Promise<AppAttribution | null> {
  if (Platform.OS !== 'android') return Promise.resolve(null);
  if (!bootstrapPromise) {
    bootstrapPromise = capture().then(report).catch(async () => readStored());
  }
  return bootstrapPromise;
}

export async function getAndroidAttributionPayload(): Promise<Record<string, unknown> | undefined> {
  const attribution = await initializeAndroidAttribution();
  if (!attribution) return undefined;
  return {
    install_id: attribution.install_id,
    attribution_id: attribution.attribution_id,
    gclid: attribution.gclid,
    gbraid: attribution.gbraid,
    wbraid: attribution.wbraid,
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_term: attribution.utm_term,
    utm_content: attribution.utm_content,
    referrer: attribution.raw_referrer,
    first_touch_at: attribution.captured_at,
    attribution_stage: 'attendance_start',
  };
}
