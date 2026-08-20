export type Paciente = {
  id: number;
  nome: string;
  email: string;
  cpf?: string | null;
  tel?: string | null;
};

export type Agendamento = {
  id: number;
  profissional_nome?: string | null;
  psicologo_nome?: string | null;
  tipo_consulta?: string | null;
  modulo?: string | null;
  horario_agendado: string;
  valor_cobrado?: number | string | null;
  pagamento_status?: string | null;
  status?: string | null;
  link_sessao?: string | null;
};

export type LoginResponse = {
  ok: boolean;
  token?: string;
  paciente?: Paciente;
  error?: string;
};
