import { getSessionToken } from '../auth/session';

const API_BASE_URL = 'https://triagem-api.onrender.com';

export type AvaliacaoAtendimento = {
  estrelas: number;
  comentario?: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
};

export type AvaliacaoStatus = {
  ok: boolean;
  avaliavel: boolean;
  medico?: { id: number; nome: string } | null;
  avaliacao?: AvaliacaoAtendimento | null;
};

async function authHeaders() {
  const token = await getSessionToken();
  if (!token) throw new Error('Sessão não encontrada');
  return { Authorization: `Bearer ${token}` };
}

async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Erro ao acessar o servidor');
  return data as T;
}

export async function carregarAvaliacaoAtendimento(atendimentoId: number) {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/api/paciente/atendimento/${encodeURIComponent(String(atendimentoId))}/avaliacao`, { headers });
  return parse<AvaliacaoStatus>(response);
}

export async function salvarAvaliacaoAtendimento(atendimentoId: number, estrelas: number, comentario: string) {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/api/paciente/atendimento/${encodeURIComponent(String(atendimentoId))}/avaliacao`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ estrelas, comentario: comentario.trim() || null }),
  });
  return parse<{ ok: boolean; avaliacao: AvaliacaoAtendimento }>(response);
}
