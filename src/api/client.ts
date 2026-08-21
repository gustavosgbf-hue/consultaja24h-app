import { getSessionToken } from '../auth/session';
import type { Agendamento, AtendimentoHistorico, Paciente } from '../types';

const API_BASE_URL = 'https://triagem-api.onrender.com';

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Erro ao acessar o servidor';
    throw new Error(message);
  }
  return data as T;
}

async function postJson<T>(path: string, body: unknown, authenticated = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authenticated) {
    const token = await getSessionToken();
    if (!token) throw new Error('Sessão não encontrada');
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (response.status === 401 && authenticated) throw new Error('Sessão expirada');
  return parseJson<T>(response);
}

export type SolicitarOtpResponse = {
  ok: boolean;
  precisa_dados?: boolean;
  precisa_cpf?: boolean;
  challenge_id?: string;
  email_mascarado?: string;
};

export type VerificarOtpResponse = {
  ok: boolean;
  token: string;
  paciente: Paciente;
};

export type IniciarAtendimentoInput = {
  nome: string;
  telefone: string;
  cpf: string;
  email?: string;
  dataNascimento?: string;
  triagem: string;
  atendimentoParaTerceiro?: boolean;
};

export type IniciarAtendimentoResponse = {
  ok: boolean;
  atendimentoId: number;
  pagamentoConfirmado?: boolean;
  tipo?: string;
  error?: string;
};

export type GerarPixConsultaResponse = {
  ok: boolean;
  order_id: string;
  qr_code_text: string;
  valor?: number;
};

export type StatusPagBankResponse = {
  ok: boolean;
  pago: boolean;
  status?: string;
};

export type CobrarCartaoResponse = {
  ok: boolean;
  charge_id?: string | number;
  status?: string;
};

export type TriageMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function solicitarOtpPaciente(telefone: string, email?: string, cpf?: string) {
  return postJson<SolicitarOtpResponse>('/api/paciente/otp/solicitar', { telefone, email, cpf });
}

export async function verificarOtpPaciente(challengeId: string, codigo: string) {
  return postJson<VerificarOtpResponse>('/api/paciente/otp/verificar', {
    challenge_id: challengeId,
    codigo,
  });
}

export async function conversarTriagem(system: string, messages: TriageMessage[]) {
  return postJson<{ text: string }>('/api/triage', { system, messages });
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

export async function carregarHistoricoPaciente() {
  return authenticatedFetch<{ ok: boolean; atendimentos: AtendimentoHistorico[] }>('/api/paciente/historico');
}

export async function iniciarAtendimento(input: IniciarAtendimentoInput) {
  return postJson<IniciarAtendimentoResponse>('/api/notify', {
    nome: input.nome,
    tel: input.telefone,
    cpf: input.cpf,
    triagem: input.triagem,
    tipo: 'chat',
    data_nascimento: input.dataNascimento || '',
    email: input.email || '',
    atendimento_para_terceiro: !!input.atendimentoParaTerceiro,
    origem: 'app_paciente',
  });
}

export async function atualizarAtendimento(atendimentoId: number, input: IniciarAtendimentoInput) {
  return postJson<IniciarAtendimentoResponse>('/api/notify', {
    atendimentoId,
    nome: input.nome,
    tel: input.telefone,
    cpf: input.cpf,
    triagem: input.triagem,
    tipo: 'chat',
    data_nascimento: input.dataNascimento || '',
    email: input.email || '',
    atendimento_para_terceiro: !!input.atendimentoParaTerceiro,
    origem: 'app_paciente',
  });
}

export async function gerarPixConsulta(args: {
  atendimentoId: number;
  pagadorNome: string;
  pagadorCpf: string;
  pagadorEmail?: string;
  pacienteNome: string;
  pacienteCpf: string;
  atendimentoParaTerceiro?: boolean;
}) {
  return postJson<GerarPixConsultaResponse>('/api/pagbank/order', {
    atendimentoId: args.atendimentoId,
    nome: args.pagadorNome,
    cpf: args.pagadorCpf,
    email: args.pagadorEmail || undefined,
    paciente_nome: args.pacienteNome,
    paciente_cpf: args.pacienteCpf,
    atendimento_para_terceiro: !!args.atendimentoParaTerceiro,
  });
}

export async function cobrarCartaoConsulta(args: {
  atendimentoId: number;
  paymentToken: string;
  pagadorNome: string;
  pagadorCpf: string;
  pagadorEmail: string;
  telefone: string;
  nascimento?: string;
  parcelas?: number;
  pacienteNome: string;
  pacienteCpf: string;
  atendimentoParaTerceiro?: boolean;
}) {
  return postJson<CobrarCartaoResponse>('/api/efi/cartao/cobrar', {
    payment_token: args.paymentToken,
    nome: args.pagadorNome,
    cpf: args.pagadorCpf,
    email: args.pagadorEmail,
    telefone: args.telefone,
    nascimento: args.nascimento || '',
    parcelas: args.parcelas || 1,
    atendimentoId: args.atendimentoId,
    paciente_nome: args.pacienteNome,
    paciente_cpf: args.pacienteCpf,
    atendimento_para_terceiro: !!args.atendimentoParaTerceiro,
  });
}

export async function vincularPixAoAtendimento(atendimentoId: number, orderId: string) {
  return postJson<{ ok: boolean }>('/api/atendimento/vincular-order', {
    atendimentoId,
    orderId,
  });
}

export async function consultarStatusPix(orderId: string) {
  const response = await fetch(`${API_BASE_URL}/api/pagbank/order/${encodeURIComponent(orderId)}`);
  return parseJson<StatusPagBankResponse>(response);
}

export async function consultarStatusAtendimento(atendimentoId: number) {
  const response = await fetch(`${API_BASE_URL}/api/atendimento/status/${atendimentoId}`);
  return parseJson<{ ok: boolean; atendimento?: { pagamento_status?: string; status?: string } }>(response);
}
