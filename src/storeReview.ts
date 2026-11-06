/**
 * Convite nativo de avaliação após o encerramento REAL de uma consulta.
 * Não condiciona a avaliação ao resultado clínico nem pede nota antes de abrir a API.
 * As lojas podem optar por não mostrar o diálogo mesmo após requestReview().
 */
import { AppState, Linking, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as StoreReview from 'expo-store-review';
import { carregarPaciente, consultarStatusAtendimento } from './api/client';
import type { AtendimentoHistorico } from './types';

const INTERVALO_DIAS = 90;
const INTERVALO_MS = INTERVALO_DIAS * 24 * 60 * 60 * 1000;
const CHAVE_DISPOSITIVO = 'cj24_review_attempt_device_v1';
const CHAVE_PACIENTE = (id: number) => `cj24_review_attempt_patient_${id}_v1`;
const CHAVE_HISTORICO = (id: number) => `cj24_review_latest_finished_${id}_v1`;
const JANELA_RECUPERACAO_MS = 48 * 60 * 60 * 1000;
const APP_STORE_URL = 'https://apps.apple.com/br/app/id6803718849?action=write-review';
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.consultaja24h.app&showAllReviews=true';
let verificando = false;

function bloqueadoPorIntervalo(ultimo: string | null, agora: number) {
  const instante = Number(ultimo);
  return !!ultimo && Number.isFinite(instante) && instante > 0 && instante <= agora && agora - instante < INTERVALO_MS;
}

/** Usado só após detectar a transição de um chat ativo para um atendimento encerrado. */
export async function tentarAvaliacaoAposEncerramento(atendimentoId: number): Promise<void> {
  if (verificando || !Number.isInteger(atendimentoId) || atendimentoId <= 0) return;
  if (AppState.currentState !== 'active') return;
  verificando = true;
  try {
    const resultado = await consultarStatusAtendimento(atendimentoId);
    if (String(resultado.atendimento?.status || '').trim().toLowerCase() !== 'encerrado') return;
    // O paciente autenticado determina a chave; não salvamos CPF nem conteúdo clínico.
    const { paciente } = await carregarPaciente();
    if (!Number.isInteger(paciente?.id) || paciente.id <= 0) return;
    if (!(await StoreReview.isAvailableAsync())) return;

    const agora = Date.now();
    const [ultimoDispositivo, ultimoPaciente] = await Promise.all([
      SecureStore.getItemAsync(CHAVE_DISPOSITIVO),
      SecureStore.getItemAsync(CHAVE_PACIENTE(paciente.id)),
    ]);
    if (bloqueadoPorIntervalo(ultimoDispositivo, agora) || bloqueadoPorIntervalo(ultimoPaciente, agora)) return;
    // Aguarda a transição de volta ao início e evita abrir o modal durante navegação.
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    if (AppState.currentState !== 'active') return;
    // Registramos tentativa (não uma avaliação confirmada: as APIs não informam se foi exibida).
    await Promise.all([
      SecureStore.setItemAsync(CHAVE_DISPOSITIVO, String(agora)),
      SecureStore.setItemAsync(CHAVE_PACIENTE(paciente.id), String(agora)),
    ]);
    if (AppState.currentState === 'active') await StoreReview.requestReview();
  } catch {
    // Falha de rede/loja nunca bloqueia retorno ao início nem mensagens do paciente.
  } finally {
    verificando = false;
  }
}

/**
 * Recupera uma oportunidade perdida se a consulta terminou com o aplicativo fechado.
 * Na primeira execução, estabelece um marco sem disparar convites retroativos.
 * O histórico só é consultado se não houver atendimento em andamento.
 */
export async function verificarAvaliacaoPendenteNoRetorno(
  pacienteId: number,
  historico: AtendimentoHistorico[],
  temAtendimentoAtivo: boolean,
): Promise<void> {
  if (temAtendimentoAtivo || !Number.isInteger(pacienteId) || pacienteId <= 0) return;
  const concluidos = historico
    .filter((item) => ['encerrado', 'finalizado', 'finalizada', 'concluido', 'concluído']
      .includes(String(item.status || '').trim().toLowerCase()))
    .filter((item) => Number.isInteger(item.id) && item.id > 0)
    .sort((a, b) => b.id - a.id);
  if (!concluidos.length) return;
  const chave = CHAVE_HISTORICO(pacienteId);
  try {
    const anterior = await SecureStore.getItemAsync(chave);
    const maior = concluidos[0];
    // Primeiro acesso com esta funcionalidade: não resgatar consultas antigas.
    if (anterior === null) {
      await SecureStore.setItemAsync(chave, String(maior.id));
      return;
    }
    if (maior.id <= Number(anterior)) return;
    const data = Date.parse(maior.data_atendimento || maior.criado_em || '');
    // Registrar como visto antes do pedido impede convites repetidos no refresh.
    await SecureStore.setItemAsync(chave, String(maior.id));
    if (!Number.isFinite(data) || Date.now() - data > JANELA_RECUPERACAO_MS || data > Date.now()) return;
    await tentarAvaliacaoAposEncerramento(maior.id);
  } catch {
    // Avaliação opcional: não deve atrasar login, pagamento ou documentos.
  }
}

/** Acesso voluntário pelo Perfil: abrir a página da loja, nunca forçar o prompt nativo via botão. */
export async function abrirAvaliacaoNaLoja(): Promise<void> {
  const url = Platform.OS === 'ios' ? APP_STORE_URL : GOOGLE_PLAY_URL;
  await Linking.openURL(url);
}
