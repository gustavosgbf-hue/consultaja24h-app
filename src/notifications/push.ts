import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registrarPushTokenPaciente } from '../api/client';
import { getSessionToken } from '../auth/session';

const PROJECT_ID = 'a97b44ed-ec7f-45ce-adc5-0f7b87cf1bf9';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let ultimoTokenRegistrado = '';
let ultimaSessaoRegistrada = '';
let registrando = false;

export async function registrarPushDoPaciente() {
  if (registrando) return null;
  const session = await getSessionToken();
  if (!session) return null;

  registrando = true;
  try {
    const atual = await Notifications.getPermissionsAsync();
    let status = atual.status;
    if (status !== 'granted') {
      const solicitado = await Notifications.requestPermissionsAsync();
      status = solicitado.status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Atendimentos',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    const value = String(token.data || '');
    if (!value) return null;
    if (value !== ultimoTokenRegistrado || session !== ultimaSessaoRegistrada) {
      await registrarPushTokenPaciente(value, Platform.OS);
      ultimoTokenRegistrado = value;
      ultimaSessaoRegistrada = session;
    }
    return value;
  } catch (error) {
    console.warn('[PUSH] Não foi possível registrar notificações.', error);
    return null;
  } finally {
    registrando = false;
  }
}

export function observarToquesEmPush(handler: (data: Record<string, unknown>) => void) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data || {};
    handler(data as Record<string, unknown>);
  });

  Notifications.getLastNotificationResponseAsync().then(async (response) => {
    if (!response) return;
    const data = response.notification.request.content.data || {};
    handler(data as Record<string, unknown>);
    await Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }).catch(() => {});

  return () => subscription.remove();
}
