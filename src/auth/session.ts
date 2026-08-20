import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'cj24h_patient_token';

export async function getSessionToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveSessionToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearSessionToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
