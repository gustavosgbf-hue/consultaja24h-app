import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_URL = 'https://triagem-api.onrender.com/api/tracking/app-event';
const INSTALL_ID_KEY = 'consultaja_ios_install_id_v1';

export type IosTelemetryEvent =
  | 'ios_first_open'
  | 'ios_login'
  | 'ios_consulta_started'
  | 'ios_payment_confirmed';

let installIdPromise: Promise<string> | null = null;

async function getInstallId(): Promise<string> {
  if (!installIdPromise) {
    installIdPromise = (async () => {
      const existing = await SecureStore.getItemAsync(INSTALL_ID_KEY).catch(() => null);
      if (existing) return existing;
      const created = `ios_${randomUUID()}`;
      await SecureStore.setItemAsync(INSTALL_ID_KEY, created);
      return created;
    })();
  }
  return installIdPromise;
}

/** Passive telemetry: never interferes with the patient flow. */
export async function trackIosEvent(eventName: IosTelemetryEvent, atendimentoId?: number): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const installId = await getInstallId();
    await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ConsultaJa-Platform': 'ios',
      },
      body: JSON.stringify({
        event_name: eventName,
        install_id: installId,
        atendimento_id: atendimentoId || undefined,
        captured_at: new Date().toISOString(),
      }),
    });
  } catch {
    // Tracking failures must never affect opening, login, consultation or payment.
  }
}
