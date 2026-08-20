import { getSessionToken } from '../auth/session';
import type { Agendamento, LoginResponse, Paciente } from '../types';

const API_BASE_URL = 'https://triagem-api.onrender.com';

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Erro ao acessar o servidor';
    throw new Error(message);
  }
  return data as T;
}

export async function loginPaciente(email: string, senha: string) {
  const response = await fetch(`${API_BASE_URL}/api/paciente/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });
  return parseJson<LoginResponse>(response);
}

async function authenticatedFetch<T>(path: string): Promise<T> {
  const token = await getSessionToken();
  if (!token) throw new Error('Sessão não encontrada');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) throw new Error('Sessão expirada');
  return parseJson<T>(response);
}

export async function carregarPaciente() {
  return authenticatedFetch<{ ok: boolean; paciente: Paciente }>('/api/paciente/me');
}

export async function carregarAgendamentos() {
  return authenticatedFetch<{ ok: boolean; agendamentos: Agendamento[] }>('/api/paciente/agendamentos');
}
