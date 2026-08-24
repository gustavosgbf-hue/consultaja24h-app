import { getSessionToken } from '../auth/session';

const API_BASE_URL = 'https://triagem-api.onrender.com';

export type MensagemChatV2 = {
  id: number;
  atendimento_id: number;
  autor: 'paciente' | 'medico';
  texto: string;
  arquivo_url?: string | null;
  arquivo_tipo?: string | null;
  arquivo_nome?: string | null;
  criado_em: string;
  reply_to_id?: number | null;
  lido_paciente_em?: string | null;
  lido_medico_em?: string | null;
};

async function token() {
  const value = await getSessionToken();
  if (!value) throw new Error('Sessão não encontrada');
  return value;
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Erro ao acessar o servidor');
  }
  return data as T;
}

export async function carregarChatPacienteV2(atendimentoId: number) {
  const auth = await token();
  const response = await fetch(
    `${API_BASE_URL}/api/paciente/atendimento/${encodeURIComponent(String(atendimentoId))}/chat-v2`,
    { headers: { Authorization: `Bearer ${auth}` } },
  );
  if (response.status === 401) throw new Error('Sessão expirada');
  return parseJson<{
    ok: boolean;
    atendimento: { id: number; status?: string | null; medico_nome?: string | null };
    mensagens: MensagemChatV2[];
  }>(response);
}

export async function enviarMensagemChatPacienteV2(
  atendimentoId: number,
  texto: string,
  replyToId?: number | null,
) {
  const auth = await token();
  const response = await fetch(
    `${API_BASE_URL}/api/paciente/atendimento/${encodeURIComponent(String(atendimentoId))}/chat-v2`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texto,
        reply_to_id: replyToId || null,
      }),
    },
  );
  if (response.status === 401) throw new Error('Sessão expirada');
  return parseJson<{ ok: boolean; mensagem: MensagemChatV2 }>(response);
}
