import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_STORAGE_KEY = 'repnet-wms-session';

export type OperatorSession = {
  sessionId: string;
  sessionToken: string;
  operator: {
    id: string;
    displayName: string;
    employeeCode: string;
    warehouseId: string;
    roles: string[];
  };
};

type FunctionError = {
  message?: string;
};

function getSupabaseConfig() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error('Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }

  return { publishableKey, url };
}

async function invokeFunction<T>(name: string, body: Record<string, string>): Promise<T> {
  const { publishableKey, url } = getSupabaseConfig();
  const response = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as T & FunctionError;
  if (!response.ok) {
    throw new Error(payload.message ?? 'No fue posible completar la operación.');
  }

  return payload;
}

async function saveSession(session: OperatorSession) {
  const serializedSession = JSON.stringify(session);

  if (Platform.OS === 'web') {
    globalThis.sessionStorage?.setItem(SESSION_STORAGE_KEY, serializedSession);
    return;
  }

  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, serializedSession);
}

export async function getStoredSession(): Promise<OperatorSession | null> {
  const serializedSession =
    Platform.OS === 'web'
      ? globalThis.sessionStorage?.getItem(SESSION_STORAGE_KEY)
      : await SecureStore.getItemAsync(SESSION_STORAGE_KEY);

  if (!serializedSession) {
    return null;
  }

  try {
    return JSON.parse(serializedSession) as OperatorSession;
  } catch {
    await clearStoredSession();
    return null;
  }
}

export async function clearStoredSession() {
  if (Platform.OS === 'web') {
    globalThis.sessionStorage?.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}

export async function loginWithQr(qrValue: string, scanSource: 'camera' | 'pda_imager' = 'camera') {
  const session = await invokeFunction<OperatorSession>('qr-login', { qrValue, scanSource });
  await saveSession(session);
  return session;
}

export async function logoutSession(sessionToken: string) {
  await invokeFunction<{ ok: boolean }>('logout', { sessionToken });
  await clearStoredSession();
}
