import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  DynamicColorIOS,
  KeyboardAvoidingView,
  LayoutAnimation,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function themeColor(light: string, dark: string) {
  return Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : dark;
}
import {
  atualizarAtendimento,
  carregarAgendamentos,
  carregarHistoricoPaciente,
  carregarDocumentosPaciente,
  carregarPaciente,
  carregarAtendimentoEmAndamento,
  completarPerfilPaciente,
  carregarRenovacoesPaciente,
  carregarRenovacaoPaciente,
  conversarTriagem,
  solicitarExclusaoConta,
  solicitarOtpPaciente,
  verificarOtpPaciente,
  type RenovacaoPaciente,
  type TriageMessage,
  type AtendimentoEmAndamento,
} from './src/api/client';
import {
  clearSessionToken,
  getSessionToken,
  saveSessionToken,
} from './src/auth/session';
import PagamentoConsulta from './src/components/PagamentoConsulta';
import ChatPaciente from './src/components/ChatPaciente';
import ThemeToggle from './src/components/ThemeToggle';
import DocumentViewer from './src/components/DocumentViewer';
import { setPushNavigationHandler } from './src/navigation/pushNavigation';
import { WebView } from 'react-native-webview';
import type { Agendamento, AtendimentoHistorico, DocumentoPaciente, Paciente } from './src/types';

const URL_RENOVACAO = 'https://consultaja24h.com.br/renovacao-de-receita';
const URL_ESPECIALISTAS = 'https://consultaja24h.com.br/especialistas';
const SUPPORT_WHATSAPP = '5598989272727';

const PERGUNTA_DOCUMENTO = 'Você precisa de atestado, receita, declaração ou outro documento nesta consulta?';

const SYSTEM_TRIAGE = `Você é o assistente de triagem do ConsultaJá24h para uma consulta médica por chat.
O paciente já informou a queixa inicial. NÃO peça nome, telefone ou CPF.
Conduza uma anamnese breve, em português brasileiro, com UMA pergunta por vez.
Faça NO MÁXIMO 3 perguntas clínicas adicionais, priorizando somente o que muda a segurança e a condução: tempo de evolução, intensidade, febre, sintomas associados, sinais de alarme, alergias, doenças crônicas, medicamentos em uso e possibilidade de gestação quando pertinente.
Depois das perguntas clínicas e ANTES de concluir, pergunte obrigatoriamente, em uma pergunta separada, se o paciente precisa de atestado, receita, declaração ou outro documento nesta consulta.
Não faça diagnóstico, não prescreva, não prometa atestado e não substitua o médico.
Se houver um sinal de alarme importante, deixe isso claro sem alarmismo e ainda finalize o resumo para o médico.
Depois que a solicitação de documento tiver sido respondida, NÃO faça outra pergunta. Responda exatamente começando por TRIAGEM_CONCLUIDA: e depois gere um resumo clínico objetivo com: Queixa principal; Tempo/evolução; Intensidade/febre; Sintomas associados; Alergias; Comorbidades; Medicações em uso; Sinais de alarme; Solicitação/observações.
Nunca use o prefixo TRIAGEM_CONCLUIDA: antes de ter feito pelo menos uma pergunta clínica adicional e antes de o paciente responder sobre atestado/receita/declaração/outro documento.`;

type Tela = 'home' | 'perfil' | 'nova-consulta' | 'documentos' | 'historico-chat' | 'servicos' | 'web' | 'renovacao';
type AtendimentoPara = 'mim' | 'outra-pessoa';
type EtapaConsulta = 'dados' | 'pagamento' | 'triagem' | 'fila';
const finalNavigationPolishApplied = true;

function atendimentoConcluido(status?: string | null) {
  const valor = String(status || '').trim().toLowerCase();
  return ['encerrado', 'finalizado', 'finalizada', 'concluido', 'concluído', 'arquivado'].includes(valor);
}

function digits(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function formatarTelefone(valor: string) {
  const numeros = digits(valor).slice(0, 11);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function formatarNascimentoInput(valor: string) {
  const n = digits(valor).slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return n.slice(0, 2) + '/' + n.slice(2);
  return n.slice(0, 2) + '/' + n.slice(2, 4) + '/' + n.slice(4);
}

function nascimentoValido(valor: string) {
  const m = String(valor || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const dia = Number(m[1]), mes = Number(m[2]), ano = Number(m[3]);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia && d.getTime() <= Date.now();
}

function formatarCpf(valor: string) {
  const n = digits(valor).slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
  if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
}

function formatarData(data?: string | null) {
  if (!data) return '';
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace('.', '');
}

function resumirTexto(texto?: string | null, limite = 120) {
  const limpo = String(texto || '').replace(/\s+/g, ' ').trim();
  if (!limpo) return 'Registro clínico disponível neste atendimento.';
  return limpo.length > limite ? `${limpo.slice(0, limite).trim()}…` : limpo;
}

function formatarStatus(status?: string | null) {
  const valor = String(status || '').trim().toLowerCase();
  if (!valor) return 'Finalizado';
  const mapa: Record<string, string> = {
    pagamento_pendente: 'Pagamento pendente',
    aguardando_pagamento: 'Pagamento pendente',
    pago: 'Pagamento confirmado',
    triagem: 'Triagem',
    aguardando: 'Aguardando médico',
    fila: 'Aguardando médico',
    assumido: 'Em atendimento',
    encerrado: 'Finalizado',
    finalizado: 'Finalizado',
  };
  return mapa[valor] || valor.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function mascararEmail(email?: string | null) {
  const valor = String(email || '').trim();
  const [local, dominio] = valor.split('@');
  if (!local || !dominio) return valor || 'Não informado';
  return `${local.slice(0, Math.min(2, local.length))}${'*'.repeat(Math.max(3, local.length - 2))}@${dominio}`;
}

function mascararCpf(cpf?: string | null) {
  const n = digits(cpf);
  if (n.length !== 11) return cpf || 'Não informado';
  return formatarCpf(n);
}

function mascararTelefone(tel?: string | null) {
  const n = digits(tel).slice(-11);
  if (n.length < 10) return tel || 'Não informado';
  const f = formatarTelefone(n);
  return f.replace(/\d(?=\d{4})/g, '•');
}

function jaPerguntouSobreDocumento(history: TriageMessage[]) {
  return history.some(
    (mensagem) =>
      mensagem.role === 'assistant' &&
      /(atestado|receita|declara[cç][aã]o|documento)/i.test(mensagem.content),
  );
}

async function abrirLink(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Não foi possível abrir', 'Tente novamente em instantes.');
  }
}

async function abrirSuporte() {
  const mensagem = encodeURIComponent('Olá, preciso de ajuda com meu atendimento.');
  await abrirLink(`https://wa.me/${SUPPORT_WHATSAPP}?text=${mensagem}`);
}

function usePageSlide(onClose: () => void) {
  const x = useRef(new Animated.Value(28)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(x, { toValue: 0, duration: 230, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 190, useNativeDriver: true }),
    ]).start();
  }, [opacity, x]);

  function close() {
    Animated.parallel([
      Animated.timing(x, { toValue: 34, duration: 170, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 145, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onClose();
    });
  }

  return {
    style: { flex: 1, opacity, transform: [{ translateX: x }] },
    close,
  };
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [homeLoading, setHomeLoading] = useState(false);
  const [etapa, setEtapa] = useState<'telefone' | 'dados' | 'codigo'>('telefone');
  const [tela, setTela] = useState<Tela>('home');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [codigo, setCodigo] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [emailMascarado, setEmailMascarado] = useState('');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [historico, setHistorico] = useState<AtendimentoHistorico[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoPaciente[]>([]);
  const [renovacoes, setRenovacoes] = useState<RenovacaoPaciente[]>([]);
  const [renovacaoSelecionada, setRenovacaoSelecionada] = useState<RenovacaoPaciente | null>(null);
  const [historicoSelecionado, setHistoricoSelecionado] = useState<AtendimentoHistorico | null>(null);
  const [historicoOrigem, setHistoricoOrigem] = useState<'home' | 'documentos'>('home');
  const [mostrarHistoricoCompleto, setMostrarHistoricoCompleto] = useState(false);
  const [webPage, setWebPage] = useState<{ title: string; url: string } | null>(null);
  const [atendimentoEmAndamento, setAtendimentoEmAndamento] = useState<AtendimentoEmAndamento | null>(null);
  const [retomarAtendimento, setRetomarAtendimento] = useState<AtendimentoEmAndamento | null>(null);
  const homeScrollOffsetRef = useRef(0);

  useEffect(() => {
    restaurarSessao();
  }, []);

  useEffect(() => {
    setPushNavigationHandler((action) => {
      if (action.kind !== 'renovacao') return;
      setTela('renovacao');
      setRenovacaoSelecionada(null);
      carregarRenovacaoPaciente(action.atendimentoId)
        .then((data) => setRenovacaoSelecionada(data.renovacao))
        .catch(() => {
          setTela('home');
          Alert.alert('Renovação', 'Não foi possível abrir esta renovação agora.');
        });
    });
    return () => setPushNavigationHandler(null);
  }, []);

  async function restaurarSessao() {
    try {
      const token = await getSessionToken();
      if (!token) return;
      await carregarHome();
    } catch {
      await clearSessionToken();
    } finally {
      setBooting(false);
    }
  }

  async function carregarHome() {
    setHomeLoading(true);
    const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    async function comRetry<T>(fn: () => Promise<T>, tentativas = 3): Promise<T | null> {
      for (let i = 0; i < tentativas; i += 1) {
        try {
          return await fn();
        } catch {
          if (i < tentativas - 1) await esperar(450 * (i + 1));
        }
      }
      return null;
    }

    try {
      const me = await comRetry(carregarPaciente);
      if (!me?.paciente) return;
      setPaciente(me.paciente);

      const [agenda, history, docs, renewalData, activeData] = await Promise.all([
        comRetry(carregarAgendamentos),
        comRetry(carregarHistoricoPaciente),
        comRetry(carregarDocumentosPaciente),
        comRetry(carregarRenovacoesPaciente),
        comRetry(carregarAtendimentoEmAndamento),
      ]);

      if (agenda) setAgendamentos(agenda.agendamentos || []);
      if (history) setHistorico(history.atendimentos || []);
      if (docs) setDocumentos(docs.documentos || []);
      if (renewalData) setRenovacoes(renewalData.renovacoes || []);
      setAtendimentoEmAndamento(activeData?.atendimento || null);
    } finally {
      setHomeLoading(false);
    }
  }

  function abrirCodigo(challenge: string, maskedEmail?: string) {
    setChallengeId(challenge);
    setEmailMascarado(maskedEmail || 'seu e-mail');
    setCodigo('');
    setEtapa('codigo');
  }

  async function continuarComTelefone() {
    const numeros = digits(telefone);
    if (numeros.length < 10) {
      Alert.alert('Confira o celular', 'Digite um número de celular válido com DDD.');
      return;
    }
    setLoading(true);
    try {
      const data = await solicitarOtpPaciente(numeros);
      if (data.precisa_dados) {
        setEtapa('dados');
        return;
      }
      if (!data.challenge_id) throw new Error('Não foi possível iniciar a verificação.');
      abrirCodigo(data.challenge_id, data.email_mascarado);
    } catch (error) {
      Alert.alert('Não foi possível continuar', error instanceof Error ? error.message : 'Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }

  async function enviarDadosPrimeiroAcesso() {
    const numeros = digits(telefone);
    const cpfNumeros = digits(cpf);
    const emailLimpo = email.trim().toLowerCase();
    if (cpfNumeros.length !== 11) {
      Alert.alert('Confira o CPF', 'Digite um CPF com 11 números.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(emailLimpo)) {
      Alert.alert('Confira o e-mail', 'Digite um e-mail válido para receber o código.');
      return;
    }
    setLoading(true);
    try {
      const data = await solicitarOtpPaciente(numeros, emailLimpo, cpfNumeros);
      if (!data.challenge_id) throw new Error('Não foi possível enviar o código.');
      abrirCodigo(data.challenge_id, data.email_mascarado);
    } catch (error) {
      Alert.alert('Não foi possível vincular o cadastro', error instanceof Error ? error.message : 'Confira seus dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmarCodigo() {
    const numeros = digits(codigo);
    if (numeros.length !== 6) {
      Alert.alert('Confira o código', 'Digite os 6 dígitos do código de acesso.');
      return;
    }
    if (!challengeId) {
      Alert.alert('Código expirado', 'Solicite um novo código.');
      return;
    }
    setLoading(true);
    try {
      const data = await verificarOtpPaciente(challengeId, numeros);
      if (!data.token || !data.paciente) throw new Error('Não foi possível concluir o acesso.');
      await saveSessionToken(data.token);
      setPaciente(data.paciente);
      setTela('home');
      await carregarHome();
    } catch (error) {
      Alert.alert('Não foi possível entrar', error instanceof Error ? error.message : 'Confira o código e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function reenviarCodigo() {
    setLoading(true);
    try {
      const data = await solicitarOtpPaciente(
        digits(telefone),
        email.trim() || undefined,
        digits(cpf) || undefined,
      );
      if (data.precisa_dados) {
        setEtapa('dados');
        return;
      }
      if (!data.challenge_id) throw new Error('Não foi possível reenviar o código.');
      abrirCodigo(data.challenge_id, data.email_mascarado);
      Alert.alert('Código reenviado', `Enviamos um novo código para ${data.email_mascarado || 'seu e-mail'}.`);
    } catch (error) {
      Alert.alert('Não foi possível reenviar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function voltarTelefone() {
    setEtapa('telefone');
    setCodigo('');
    setChallengeId('');
    setEmailMascarado('');
  }

  async function sair() {
    await clearSessionToken();
    setPaciente(null);
    setAgendamentos([]);
    setHistorico([]);
    setDocumentos([]);
    setRenovacoes([]);
    setRenovacaoSelecionada(null);
    setHistoricoSelecionado(null);
    setTela('home');
    setTelefone('');
    setEmail('');
    setCpf('');
    setCodigo('');
    setChallengeId('');
    setEtapa('telefone');
  }

  if (booting) {
    return <AppSkeleton />;
  }

  if (!paciente) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.loginWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>ConsultaJá24h</Text>
            <Text style={styles.subtitle}>Sua saúde, no seu tempo.</Text>
          </View>

          {etapa === 'telefone' && (
            <>
              <View style={styles.card}>
                <Badge text="ACESSO DO PACIENTE" />
                <Text style={styles.cardTitle}>Entre com seu celular</Text>
                <Text style={styles.cardSubtitle}>Use o número informado nas suas consultas. Se já houver um cadastro vinculado, enviaremos o código para o e-mail cadastrado.</Text>
                <Text style={styles.inputLabel}>Número de celular</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryBox}><Text style={styles.countryText}>+55</Text></View>
                  <TextInput value={telefone} onChangeText={(valor) => setTelefone(formatarTelefone(valor))} placeholder="(98) 99999-9999" placeholderTextColor="#94a09c" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" style={[styles.input, styles.phoneInput]} maxLength={15} />
                </View>
                <PrimaryButton label="Continuar" loading={loading} onPress={continuarComTelefone} />
                <Text style={styles.privacyText}>Seu celular é usado para localizar o cadastro do paciente. Dados do pagador não são usados como identidade clínica.</Text>
              </View>
              <Text style={styles.helperText}>Primeiro acesso ao app? Confirmaremos seus dados antes de vincular seu histórico.</Text>
            </>
          )}

          {etapa === 'dados' && (
            <View style={styles.card}>
              <Badge text="PRIMEIRO ACESSO" />
              <Text style={styles.cardTitle}>Confirme seus dados</Text>
              <Text style={styles.cardSubtitle}>Para vincular este celular com segurança, informe seu CPF e um e-mail para receber o código de acesso.</Text>
              <Text style={styles.inputLabel}>CPF do paciente</Text>
              <TextInput value={cpf} onChangeText={(valor) => setCpf(formatarCpf(valor))} placeholder="000.000.000-00" placeholderTextColor="#94a09c" keyboardType="number-pad" style={styles.input} maxLength={14} />
              <Text style={styles.inputLabel}>E-mail do paciente</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="voce@email.com" placeholderTextColor="#94a09c" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" style={styles.input} />
              <PrimaryButton label="Enviar código" loading={loading} onPress={enviarDadosPrimeiroAcesso} />
              <Pressable onPress={voltarTelefone} style={styles.singleSecondary}><Text style={styles.secondaryActionText}>Alterar número</Text></Pressable>
            </View>
          )}

          {etapa === 'codigo' && (
            <View style={styles.card}>
              <Badge text="VERIFICAÇÃO" />
              <Text style={styles.cardTitle}>Digite o código</Text>
              <Text style={styles.cardSubtitle}>Enviamos um código de 6 dígitos para {emailMascarado}.</Text>
              <Text style={styles.inputLabel}>Código de acesso</Text>
              <TextInput value={codigo} onChangeText={(valor) => setCodigo(digits(valor).slice(0, 6))} placeholder="000000" placeholderTextColor="#aeb8b4" keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" style={[styles.input, styles.codeInput]} maxLength={6} />
              <PrimaryButton label="Entrar" loading={loading} onPress={confirmarCodigo} />
              <View style={styles.secondaryActions}>
                <Pressable onPress={reenviarCodigo} disabled={loading}><Text style={styles.secondaryActionText}>Reenviar código</Text></Pressable>
                <View style={styles.actionDivider} />
                <Pressable onPress={voltarTelefone}><Text style={styles.secondaryActionText}>Alterar número</Text></Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (tela === 'perfil') {
    return <Perfil paciente={paciente} onVoltar={() => setTela('home')} onSair={sair} />;
  }

  if (tela === 'nova-consulta') {
    return <NovaConsulta paciente={paciente} atendimentoInicial={retomarAtendimento} onVoltar={() => { setRetomarAtendimento(null); setTela('home'); carregarHome(); }} onPerfilAtualizado={setPaciente} />;
  }

  if (tela === 'documentos') {
    return <DocumentosPaciente documentos={documentos} onVoltar={() => setTela('home')} onAbrirConsulta={(id) => {
      const item = historico.find((h) => h.id === id) || null;
      if (item) { setHistoricoOrigem('documentos'); setHistoricoSelecionado(item); setTela('historico-chat'); }
    }} />;
  }

  if (tela === 'renovacao') {
    return <RenovacaoAcompanhamento renovacao={renovacaoSelecionada} onVoltar={() => { setRenovacaoSelecionada(null); setTela('home'); carregarHome(); }} onAtualizar={async () => { if (!renovacaoSelecionada?.id) return; const data = await carregarRenovacaoPaciente(renovacaoSelecionada.id); setRenovacaoSelecionada(data.renovacao); await carregarHome(); }} />;
  }

  if (tela === 'servicos') {
    return <ServicosSaude onVoltar={() => setTela('home')} onAbrir={(title, url) => { setWebPage({ title, url }); setTela('web'); }} />;
  }

  if (tela === 'web' && webPage) {
    return <InternalWebScreen title={webPage.title} url={webPage.url} onVoltar={() => { const voltarHome = webPage.title === 'Renovar receita' || webPage.title === 'Psicologia'; const eraRenovacao = webPage.title === 'Renovar receita'; setWebPage(null); setTela(voltarHome ? 'home' : 'servicos'); if (eraRenovacao) carregarHome(); }} />;
  }

  if (tela === 'historico-chat' && historicoSelecionado) {
    return (
      <HistoricoChatPage
        item={historicoSelecionado}
        onVoltar={() => { setTela(historicoOrigem === 'documentos' ? 'documentos' : 'home'); setHistoricoSelecionado(null); }}
      />
    );
  }

  return (
    <PacienteHome
      paciente={paciente}
      agendamentos={agendamentos}
      historico={historico}
      atendimentoEmAndamento={atendimentoEmAndamento}
      documentos={documentos}
      renovacoes={renovacoes}
      loading={homeLoading}
      initialScrollOffset={homeScrollOffsetRef.current}
      onScrollOffset={(y) => { homeScrollOffsetRef.current = y; }}
      mostrarTudo={mostrarHistoricoCompleto}
      onMostrarTudo={() => setMostrarHistoricoCompleto((valor) => !valor)}
      onAtualizar={carregarHome}
      onPerfil={() => setTela('perfil')}
      onNovaConsulta={() => { setRetomarAtendimento(null); setTela('nova-consulta'); }}
      onRetomarAtendimento={(item) => { setRetomarAtendimento(item); setTela('nova-consulta'); }}
      onDocumentos={() => setTela('documentos')}
      onRenovacao={() => { setWebPage({ title: 'Renovar receita', url: URL_RENOVACAO }); setTela('web'); }}
      onEspecialistas={() => setTela('servicos')}
      onPsicologia={() => { setWebPage({ title: 'Psicologia', url: 'https://consultaja24h.com.br/psicologo-online' }); setTela('web'); }}
      onAbrirRenovacao={(item) => { setRenovacaoSelecionada(item); setTela('renovacao'); }}
      onAbrirAtendimento={(item) => { setHistoricoOrigem('home'); setHistoricoSelecionado(item); setTela('historico-chat'); }}
    />
  );
}

function PacienteHome({ paciente, agendamentos, historico, atendimentoEmAndamento, documentos, renovacoes, loading, initialScrollOffset, onScrollOffset, mostrarTudo, onMostrarTudo, onAtualizar, onPerfil, onNovaConsulta, onRetomarAtendimento, onDocumentos, onRenovacao, onEspecialistas, onPsicologia, onAbrirRenovacao, onAbrirAtendimento }: {
  paciente: Paciente;
  agendamentos: Agendamento[];
  historico: AtendimentoHistorico[];
  atendimentoEmAndamento: AtendimentoEmAndamento | null;
  documentos: DocumentoPaciente[];
  renovacoes: RenovacaoPaciente[];
  loading: boolean;
  initialScrollOffset: number;
  onScrollOffset: (y: number) => void;
  mostrarTudo: boolean;
  onMostrarTudo: () => void;
  onAtualizar: () => void;
  onPerfil: () => void;
  onNovaConsulta: () => void;
  onRetomarAtendimento: (item: AtendimentoEmAndamento) => void;
  onDocumentos: () => void;
  onRenovacao: () => void;
  onEspecialistas: () => void;
  onPsicologia: () => void;
  onAbrirRenovacao: (item: RenovacaoPaciente) => void;
  onAbrirAtendimento: (item: AtendimentoHistorico) => void;
}) {
  const primeiroNome = paciente.nome?.split(' ')[0] || 'Paciente';
  const historicoConsultas = historico.filter((item) => !String(item.tipo || '').toLowerCase().startsWith('renovacao_'));
  const atendimentoAtivoHistorico = historicoConsultas.find((item) => String(item.status || '').trim().toLowerCase() === 'assumido');
  const atendimentoAtivo = atendimentoEmAndamento || atendimentoAtivoHistorico || null;
  const historicoFinalizados = historicoConsultas.filter((item) => atendimentoConcluido(item.status));
  const ultimo = historicoFinalizados[0] || null;
  const itensHistorico = mostrarTudo ? historicoFinalizados : historicoFinalizados.slice(0, 4);
  const renovacaoAtual = renovacoes.find((item) => String(item.pagamento_status || '').toLowerCase() === 'confirmado') || null;
  const proximos = useMemo(
    () => agendamentos.filter((item) => new Date(item.horario_agendado).getTime() >= Date.now()).slice(0, 2),
    [agendamentos],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.home}
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: initialScrollOffset }}
        onScroll={(event) => onScrollOffset(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={32}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onAtualizar} tintColor="#16c783" colors={["#16c783"]} />}
      >
        <View style={styles.topbar}>
          <View>
            <Text style={styles.kicker}>CONSULTAJÁ24H</Text>
            <Text style={styles.greeting}>Olá, {primeiroNome}</Text>
            <Text style={styles.homeSubtitle}>O que você precisa hoje?</Text>
          </View>
          <View style={styles.topActions}>
            <ThemeToggle />
            <Pressable onPress={onPerfil} style={styles.avatarButton} accessibilityLabel="Abrir perfil">
              <Text style={styles.avatarText}>{primeiroNome.slice(0, 1).toUpperCase()}</Text>
            </Pressable>
          </View>
        </View>

        {atendimentoAtivo ? (
          <Pressable onPress={() => atendimentoEmAndamento ? onRetomarAtendimento(atendimentoEmAndamento) : onAbrirAtendimento(atendimentoAtivo as AtendimentoHistorico)} style={({ pressed }) => [styles.activeCareCard, pressed && styles.primaryPressed]}>
            <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.activeCareEyebrow}>ATENDIMENTO EM ANDAMENTO</Text></View>
            <Text style={styles.activeCareTitle}>Continuar atendimento</Text>
            <Text style={styles.activeCareText}>{atendimentoEmAndamento?.etapa === 'pagamento' ? 'Seu pagamento ainda precisa ser concluído.' : atendimentoEmAndamento?.etapa === 'triagem' ? 'Pagamento confirmado. Continue sua triagem.' : atendimentoEmAndamento?.etapa === 'fila' ? 'Sua triagem foi concluída. Continue acompanhando o atendimento.' : atendimentoAtivo.medico_nome ? 'Voltar para a conversa com ' + atendimentoAtivo.medico_nome + '.' : 'Retome de onde você parou.'}</Text>
            <Text style={styles.activeCareAction}>Continuar ›</Text>
          </Pressable>
        ) : null}

        {!atendimentoAtivo ? (
          <View style={styles.heroCard}>
            <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.heroEyebrow}>MÉDICO ONLINE AGORA</Text></View>
            <Text style={styles.heroTitle}>Consulta por chat, direto pelo app.</Text>
            <Text style={styles.heroText}>Sem videochamada. Sem precisar agendar.</Text>
            <Pressable onPress={onNovaConsulta} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}><Text style={styles.primaryButtonText}>Falar com um médico agora</Text></Pressable>
          </View>
        ) : null}

        <View style={styles.quickGrid}>
          <QuickCard title="Renovar receita" subtitle="Solicite pelo app" onPress={onRenovacao} featured />
          <QuickCard title="Especialistas" subtitle="Escolha o profissional" onPress={onEspecialistas} />
        </View>
        <Pressable onPress={onPsicologia} style={({ pressed }) => [styles.psychologyHomeCard, pressed && styles.quickCardPressed]}>
          <View style={styles.psychologyHomeBadge}><Text style={styles.psychologyHomeBadgeText}>PSI</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.psychologyHomeTitle}>Psicologia</Text>
            <Text style={styles.psychologyHomeText}>Psicoterapia online com horário marcado</Text>
          </View>
        </Pressable>

        {renovacaoAtual ? (
          <Pressable onPress={() => onAbrirRenovacao(renovacaoAtual)} style={({ pressed }) => [styles.renewalStatusCard, pressed && styles.quickCardPressed]}>
            <View style={styles.renewalStatusTop}>
              <Text style={styles.renewalStatusKicker}>RENOVAÇÃO DE RECEITA</Text>
              <View style={[styles.renewalStatusPill, renovacaoAtual.etapa === 'pronta' && styles.renewalStatusPillReady]}>
                <Text style={[styles.renewalStatusPillText, renovacaoAtual.etapa === 'pronta' && styles.renewalStatusPillTextReady]}>
                  {renovacaoAtual.etapa === 'pronta' ? 'RECEITA PRONTA' : renovacaoAtual.etapa === 'enviada' ? 'ENVIADA' : 'EM ANÁLISE'}
                </Text>
              </View>
            </View>
            <Text style={styles.renewalStatusTitle}>{renovacaoAtual.tipo === 'renovacao_fisica' ? 'Receita física' : 'Receita digital'}</Text>
            <Text style={styles.renewalStatusText}>{renovacaoAtual.etapa === 'pronta' ? 'Seu documento já está disponível no app.' : renovacaoAtual.etapa === 'enviada' ? 'A receita foi enviada. Toque para acompanhar.' : 'Sua solicitação foi recebida e está sendo analisada.'}</Text>
            <Text style={styles.renewalStatusAction}>{renovacaoAtual.etapa === 'pronta' ? 'Ver receita' : 'Acompanhar solicitação'} ›</Text>
          </Pressable>
        ) : null}

        {ultimo && (
          <>
            <SectionHeader title="Último atendimento" />
            <Pressable onPress={() => onAbrirAtendimento(ultimo)} style={styles.lastCard}>
              <View style={styles.lastTop}>
                <View style={styles.datePill}><Text style={styles.datePillText}>{formatarData(ultimo.criado_em)}</Text></View>
                <Text style={styles.statusText}>{formatarStatus(ultimo.status)}</Text>
              </View>
              <Text style={styles.lastDoctor}>{ultimo.medico_nome || 'Consulta médica'}</Text>
              <Text style={styles.lastSummary}>{resumirTexto(ultimo.triagem)}</Text>
              <Text style={styles.openHistoryHint}>Ver conversa e documentos ›</Text>
            </Pressable>
          </>
        )}

        <SectionHeader title="Meus atendimentos" action={historicoFinalizados.length > 4 ? (mostrarTudo ? 'Ver menos' : 'Ver todos') : undefined} onAction={onMostrarTudo} />
        {loading && historicoFinalizados.length === 0 ? (
          <HomeHistorySkeleton />
        ) : itensHistorico.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.historyCarousel} snapToInterval={286} decelerationRate="fast">
            {itensHistorico.map((item) => (
              <Pressable key={String(item.id)} onPress={() => onAbrirAtendimento(item)} style={[styles.historyCard, styles.historyCardHorizontal]}>
                <View style={styles.historyLine}><View style={styles.timelineDot} /><View style={styles.historyBody}>
                  <Text style={styles.historyTitle}>{item.medico_nome || 'Atendimento médico'}</Text>
                  <Text style={styles.historyMeta}>{formatarData(item.criado_em)}</Text>
                  <Text style={styles.historyText}>{resumirTexto(item.triagem, 105)}</Text>
                  <Text style={styles.historyOpen}>Abrir conversa ›</Text>
                </View></View>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <EmptyCard title="Seu histórico aparecerá aqui" text="Os atendimentos vinculados ao seu cadastro ficam organizados no app." />
        )}

        {proximos.length > 0 && (
          <>
            <SectionHeader title="Próximos atendimentos" />
            {proximos.map((item) => (
              <View key={String(item.id)} style={styles.appointmentCard}>
                <Text style={styles.appointmentName}>{item.profissional_nome || item.psicologo_nome || 'Profissional'}</Text>
                <Text style={styles.appointmentMeta}>{new Date(item.horario_agendado).toLocaleString('pt-BR')}</Text>
              </View>
            ))}
          </>
        )}

        <Pressable onPress={onDocumentos} style={styles.docsCard}>
          <View style={styles.docsIcon}>
            <View style={styles.docsGlyph}>
              <View style={styles.docsGlyphFold} />
              <View style={styles.docsGlyphLine} />
              <View style={[styles.docsGlyphLine, styles.docsGlyphLineShort]} />
            </View>
          </View>
          <View style={{ flex: 1 }}><Text style={styles.docsTitle}>Meus documentos</Text><Text style={styles.docsText}>{documentos.length ? (documentos.length === 1 ? '1 documento disponível' : `${documentos.length} documentos disponíveis`) : 'Receitas, atestados e pedidos ficarão reunidos aqui.'}</Text></View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

function HistoricoChatPage({ item, onVoltar }: { item: AtendimentoHistorico; onVoltar: () => void }) {
  const motion = usePageSlide(onVoltar);
  return (
    <Animated.View style={motion.style}>
      <ChatPaciente
        atendimentoId={item.id}
        medicoNome={item.medico_nome || item.profissional_nome}
        somenteLeitura={String(item.status || '').trim().toLowerCase() !== 'assumido'}
        avaliavel={atendimentoConcluido(item.status)}
        onVoltar={motion.close}
      />
    </Animated.View>
  );
}

function RenovacaoAcompanhamento({ renovacao, onVoltar, onAtualizar }: { renovacao: RenovacaoPaciente | null; onVoltar: () => void; onAtualizar: () => Promise<void> | void }) {
  const motion = usePageSlide(onVoltar);
  const [docAberto, setDocAberto] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function atualizar() {
    setRefreshing(true);
    try { await onAtualizar(); } finally { setRefreshing(false); }
  }

  const pronta = renovacao?.etapa === 'pronta' || renovacao?.etapa === 'enviada';
  const fisica = renovacao?.tipo === 'renovacao_fisica';

  return (
    <Animated.View style={motion.style}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.pageWrap} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={atualizar} tintColor="#16c783" colors={["#16c783"]} />}>
          <PageHeader title="Renovação de receita" onVoltar={motion.close} />
          {!renovacao ? (
            <View style={styles.renewalLoading}><ActivityIndicator color="#16c783" /><Text style={styles.renewalLoadingText}>Carregando solicitação...</Text></View>
          ) : (
            <>
              <View style={styles.renewalHero}>
                <Text style={styles.renewalHeroKicker}>{fisica ? 'RECEITA FÍSICA' : 'RECEITA DIGITAL'}</Text>
                <Text style={styles.renewalHeroTitle}>{renovacao.etapa === 'pronta' ? 'Sua receita está pronta' : renovacao.etapa === 'enviada' ? 'Sua receita foi enviada' : 'Sua solicitação está em análise'}</Text>
                <Text style={styles.renewalHeroText}>{renovacao.etapa === 'pronta' ? 'O documento já pode ser aberto, salvo ou compartilhado pelo app.' : renovacao.etapa === 'enviada' ? 'A emissão foi concluída e o envio já foi realizado.' : 'Assim que a emissão for concluída, o documento aparecerá aqui automaticamente.'}</Text>
              </View>

              <View style={styles.renewalTimeline}>
                <RenewalStep done title="Pagamento confirmado" />
                <RenewalStep done={pronta} active={!pronta} title="Análise e emissão" />
                <RenewalStep done={pronta} active={renovacao.etapa === 'pronta'} title={fisica ? 'Receita emitida' : 'Receita disponível'} />
                {fisica ? <RenewalStep done={renovacao.etapa === 'enviada'} active={renovacao.etapa === 'enviada'} title="Envio" last /> : null}
              </View>

              {renovacao.receita_url ? (
                <Pressable onPress={() => setDocAberto(true)} style={({ pressed }) => [styles.renewalDocumentCard, pressed && styles.quickCardPressed]}>
                  <View style={styles.documentPdf}><Text style={styles.documentPdfText}>PDF</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.renewalDocumentTitle}>{renovacao.receita_nome || 'Receita médica.pdf'}</Text>
                    <Text style={styles.renewalDocumentText}>Abrir receita no app</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ) : null}

              {fisica && renovacao.rastreio ? (
                <View style={styles.renewalTracking}>
                  <Text style={styles.renewalTrackingLabel}>CÓDIGO DE RASTREIO</Text>
                  <Text style={styles.renewalTrackingCode}>{renovacao.rastreio}</Text>
                </View>
              ) : null}

              <Text style={styles.renewalUpdatedHint}>Puxe a tela para baixo para atualizar o status.</Text>
            </>
          )}
        </ScrollView>
        <DocumentViewer visible={docAberto} url={renovacao?.receita_url} name={renovacao?.receita_nome || 'Receita médica.pdf'} type="pdf" onClose={() => setDocAberto(false)} />
      </SafeAreaView>
    </Animated.View>
  );
}

function RenewalStep({ title, done, active, last }: { title: string; done?: boolean; active?: boolean; last?: boolean }) {
  return <View style={[styles.renewalStep, last && { marginBottom: 0 }]}>
    <View style={styles.renewalStepRail}>
      <View style={[styles.renewalStepDot, done && styles.renewalStepDotDone, active && styles.renewalStepDotActive]}>{done ? <Text style={styles.renewalStepCheck}>✓</Text> : null}</View>
      {!last ? <View style={[styles.renewalStepLine, done && styles.renewalStepLineDone]} /> : null}
    </View>
    <Text style={[styles.renewalStepText, (done || active) && styles.renewalStepTextActive]}>{title}</Text>
  </View>;
}

function DocumentosPaciente({ documentos, onVoltar, onAbrirConsulta }: {
  documentos: DocumentoPaciente[];
  onVoltar: () => void;
  onAbrirConsulta: (atendimentoId: number) => void;
}) {
  const [docAberto, setDocAberto] = useState<DocumentoPaciente | null>(null);
  const motion = usePageSlide(onVoltar);

  return (
    <Animated.View style={motion.style}>
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageWrap}>
        <PageHeader title="Meus documentos" onVoltar={motion.close} />
        <Text style={styles.pageLead}>Documentos recebidos nas suas consultas ficam disponíveis aqui e também dentro da conversa original.</Text>
        {documentos.length ? documentos.map((doc) => (
          <View key={String(doc.id)} style={styles.documentItem}>
            <Pressable onPress={() => setDocAberto(doc)} style={styles.documentMain}>
              <View style={styles.documentPdf}><Text style={styles.documentPdfText}>PDF</Text></View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentName} numberOfLines={2}>{doc.arquivo_nome || 'Documento médico.pdf'}</Text>
                <Text style={styles.documentMeta}>{doc.profissional_nome || 'Profissional da ConsultaJá24h'} · {formatarData(doc.criado_em)}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            <Pressable onPress={() => onAbrirConsulta(doc.atendimento_id)} style={styles.documentConsultButton}>
              <Text style={styles.documentConsultText}>Ver consulta original</Text>
            </Pressable>
          </View>
        )) : (
          <EmptyCard title="Nenhum documento ainda" text="Quando um profissional enviar um PDF pelo atendimento, ele aparecerá automaticamente aqui." />
        )}
      </ScrollView>
      <DocumentViewer
        visible={!!docAberto}
        url={docAberto?.arquivo_url}
        name={docAberto?.arquivo_nome}
        type="pdf"
        onClose={() => setDocAberto(null)}
      />
    </SafeAreaView>
    </Animated.View>
  );
}

function Perfil({ paciente, onVoltar, onSair }: { paciente: Paciente; onVoltar: () => void; onSair: () => void }) {
  const primeiroNome = paciente.nome?.split(' ')[0] || 'Paciente';
  const motion = usePageSlide(onVoltar);
  const [excluindoConta, setExcluindoConta] = useState(false);

  function confirmarExclusaoConta() {
    if (excluindoConta) return;
    Alert.alert(
      'Excluir minha conta',
      'Ao confirmar, sua solicitação de exclusão será registrada. Alguns dados médicos e documentos podem precisar ser preservados pelo prazo legal aplicável.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar exclusão',
          style: 'destructive',
          onPress: async () => {
            setExcluindoConta(true);
            try {
              await solicitarExclusaoConta();
              Alert.alert(
                'Solicitação registrada',
                'Recebemos seu pedido de exclusão da conta. Dados sujeitos a obrigação legal de guarda poderão ser preservados pelo prazo aplicável.',
                [{ text: 'OK', onPress: onSair }],
              );
            } catch (error) {
              Alert.alert('Não foi possível solicitar a exclusão', error instanceof Error ? error.message : 'Tente novamente em alguns instantes.');
            } finally {
              setExcluindoConta(false);
            }
          },
        },
      ],
    );
  }
  return (
    <Animated.View style={motion.style}>
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageWrap}>
        <PageHeader title="Meu perfil" onVoltar={motion.close} />
        <View style={styles.profileHero}>
          <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{primeiroNome.slice(0, 1).toUpperCase()}</Text></View>
          <Text style={styles.profileName}>{paciente.nome}</Text>
          <Text style={styles.profileHint}>Dados usados para identificar você nos seus atendimentos.</Text>
        </View>

        <View style={styles.profileCard}>
          <InfoRow label="Celular" value={mascararTelefone(paciente.tel)} />
          <InfoRow label="CPF" value={mascararCpf(paciente.cpf)} />
          <InfoRow label="E-mail" value={mascararEmail(paciente.email)} last />
        </View>

        <Pressable onPress={abrirSuporte} style={({ pressed }) => [styles.supportButton, pressed && { opacity: 0.82 }]} accessibilityRole="button" accessibilityLabel="Falar com o suporte">
          <View style={styles.supportIcon}>
            <View style={styles.supportBubble}>
              <View style={styles.supportBubbleDot} />
              <View style={styles.supportBubbleDot} />
              <View style={styles.supportBubbleDot} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportTitle}>Suporte</Text>
            <Text style={styles.supportText}>Fale com a equipe da ConsultaJá24h</Text>
          </View>
          <Text style={styles.supportArrow}>›</Text>
        </Pressable>

        <View style={styles.profileNotice}>
          <Text style={styles.profileNoticeTitle}>Privacidade</Text>
          <Text style={styles.profileNoticeText}>Seus dados clínicos e documentos são vinculados ao paciente, não ao titular do cartão usado no pagamento.</Text>
        </View>

        <Pressable
          onPress={confirmarExclusaoConta}
          disabled={excluindoConta}
          style={[styles.logoutButton, { marginTop: 10, borderColor: 'rgba(239,68,68,.28)' }, excluindoConta && { opacity: 0.55 }]}
          accessibilityRole="button"
          accessibilityLabel="Excluir minha conta"
        >
          <Text style={[styles.logoutButtonText, { color: '#f87171' }]}>{excluindoConta ? 'Enviando solicitação...' : 'Excluir minha conta'}</Text>
        </Pressable>

        <Pressable
          onPress={confirmarExclusaoConta}
          disabled={excluindoConta}
          style={[styles.logoutButton, { marginTop: 10, borderColor: 'rgba(239,68,68,.28)' }, excluindoConta && { opacity: 0.55 }]}
          accessibilityRole="button"
          accessibilityLabel="Excluir minha conta"
        >
          <Text style={[styles.logoutButtonText, { color: '#f87171' }]}>{excluindoConta ? 'Enviando solicitação...' : 'Excluir minha conta'}</Text>
        </Pressable>

        <Pressable
          onPress={confirmarExclusaoConta}
          disabled={excluindoConta}
          style={[styles.logoutButton, { marginTop: 10, borderColor: 'rgba(239,68,68,.28)' }, excluindoConta && { opacity: 0.55 }]}
          accessibilityRole="button"
          accessibilityLabel="Excluir minha conta"
        >
          <Text style={[styles.logoutButtonText, { color: '#f87171' }]}>{excluindoConta ? 'Enviando solicitação...' : 'Excluir minha conta'}</Text>
        </Pressable>

        <Pressable
          onPress={confirmarExclusaoConta}
          disabled={excluindoConta}
          style={[styles.logoutButton, { marginTop: 10, borderColor: 'rgba(239,68,68,.28)' }, excluindoConta && { opacity: 0.55 }]}
          accessibilityRole="button"
          accessibilityLabel="Excluir minha conta"
        >
          <Text style={[styles.logoutButtonText, { color: '#f87171' }]}>{excluindoConta ? 'Enviando solicitação...' : 'Excluir minha conta'}</Text>
        </Pressable>

        <Pressable
          onPress={confirmarExclusaoConta}
          disabled={excluindoConta}
          style={[styles.logoutButton, { marginTop: 10, borderColor: 'rgba(239,68,68,.28)' }, excluindoConta && { opacity: 0.55 }]}
          accessibilityRole="button"
          accessibilityLabel="Excluir minha conta"
        >
          <Text style={[styles.logoutButtonText, { color: '#f87171' }]}>{excluindoConta ? 'Enviando solicitação...' : 'Excluir minha conta'}</Text>
        </Pressable>

        <Pressable onPress={onSair} style={styles.logoutButton}><Text style={styles.logoutButtonText}>Sair da conta</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
    </Animated.View>
  );
}

function NovaConsulta({ paciente, atendimentoInicial, onVoltar, onPerfilAtualizado }: { paciente: Paciente; atendimentoInicial?: AtendimentoEmAndamento | null; onVoltar: () => void; onPerfilAtualizado: (paciente: Paciente) => void }) {
  const [para, setPara] = useState<AtendimentoPara>('mim');
  const [etapaConsulta, setEtapaConsulta] = useState<EtapaConsulta>('dados');
  const [nomeOutro, setNomeOutro] = useState('');
  const [cpfOutro, setCpfOutro] = useState('');
  const [nascimentoOutro, setNascimentoOutro] = useState('');
  const [nomeProprio, setNomeProprio] = useState(() => {
    const atual = String(paciente.nome || '').trim();
    return /^(paciente|paciente whatsapp|-)$/i.test(atual) ? '' : atual;
  });
  const [nascimentoProprio, setNascimentoProprio] = useState(() => {
    const atual = String(paciente.data_nascimento || '').trim();
    const iso = atual.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return iso ? iso[3] + '/' + iso[2] + '/' + iso[1] : atual;
  });
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [queixa, setQueixa] = useState('');
  const [triageMessages, setTriageMessages] = useState<TriageMessage[]>([]);
  const [perguntaAtual, setPerguntaAtual] = useState('');
  const [respostaTriagem, setRespostaTriagem] = useState('');
  const [triagemResumo, setTriagemResumo] = useState('');
  const [triagemLoading, setTriagemLoading] = useState(false);
  const [atendimentoPagoId, setAtendimentoPagoId] = useState<number | null>(null);
  const motion = usePageSlide(onVoltar);
  const stageX = useRef(new Animated.Value(0)).current;
  const stageOpacity = useRef(new Animated.Value(1)).current;

  function mudarEtapa(next: EtapaConsulta, direction: 1 | -1 = 1) {
    Animated.parallel([
      Animated.timing(stageX, { toValue: direction === 1 ? -28 : 28, duration: 150, useNativeDriver: true }),
      Animated.timing(stageOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (!finished) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setEtapaConsulta(next);
      stageX.setValue(direction === 1 ? 34 : -34);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(stageX, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(stageOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]).start();
      });
    });
  }

  const stageStyle = { opacity: stageOpacity, transform: [{ translateX: stageX }] };
  const stagePan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => etapaConsulta === 'pagamento' && g.dx > 24 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderRelease: (_, g) => {
      if (etapaConsulta === 'pagamento' && g.dx > 68) mudarEtapa('dados', -1);
    },
  }), [etapaConsulta]);

  const nomeCadastro = String(paciente.nome || '').trim();
  const perfilIncompleto = !nomeCadastro || /^(paciente|paciente whatsapp|-)$/i.test(nomeCadastro) || !String(paciente.data_nascimento || '').trim();
  const pacienteNomeSelecionado = para === 'outra-pessoa' ? nomeOutro.trim() : (perfilIncompleto ? nomeProprio.trim() : paciente.nome);
  const pacienteCpfSelecionado = para === 'outra-pessoa' ? digits(cpfOutro) : digits(paciente.cpf);
  const pacienteNascimentoSelecionado = para === 'outra-pessoa' ? nascimentoOutro.trim() : (perfilIncompleto ? nascimentoProprio.trim() : (paciente.data_nascimento || undefined));
  const telefoneContato = digits(paciente.tel);

  useEffect(() => {
    if (!atendimentoInicial?.id) return;
    setAtendimentoPagoId(atendimentoInicial.id);
    const queixaSalva = String(atendimentoInicial.queixa || atendimentoInicial.triagem || '').trim();
    const queixaBase = queixaSalva && !queixaSalva.startsWith('(') ? queixaSalva : 'Queixa informada anteriormente';
    setQueixa(queixaBase);

    if (atendimentoInicial.etapa === 'pagamento') {
      setEtapaConsulta('pagamento');
      return;
    }
    if (atendimentoInicial.etapa === 'fila' || atendimentoInicial.etapa === 'chat') {
      setEtapaConsulta('fila');
      return;
    }
    if (atendimentoInicial.etapa === 'triagem') {
      const history: TriageMessage[] = [{ role: 'user', content: `Queixa inicial informada pelo paciente: ${queixaBase}` }];
      setTriageMessages(history);
      setPerguntaAtual('');
      setRespostaTriagem('');
      setEtapaConsulta('triagem');
      setTriagemLoading(true);
      conversarTriagem(SYSTEM_TRIAGE, history)
        .then((data) => tratarRetornoTriagem(data.text, history, atendimentoInicial.id))
        .catch(() => Alert.alert('Triagem', 'Não foi possível retomar a triagem agora. Tente novamente em instantes.'))
        .finally(() => setTriagemLoading(false));
    }
  }, [atendimentoInicial?.id]);

  function validarDados() {
    if (para === 'outra-pessoa') {
      if (nomeOutro.trim().split(/\s+/).length < 2) {
        Alert.alert('Confira o nome', 'Informe o nome completo do paciente.');
        return false;
      }
      if (digits(cpfOutro).length !== 11) {
        Alert.alert('Confira o CPF', 'Informe o CPF do paciente.');
        return false;
      }
      if (nascimentoOutro.trim().length < 8) {
        Alert.alert('Confira a data', 'Informe a data de nascimento do paciente.');
        return false;
      }
    } else {
      if (digits(paciente.cpf).length !== 11) {
        Alert.alert('CPF não encontrado', 'Seu cadastro precisa ter um CPF válido antes de iniciar a consulta.');
        return false;
      }
      if (perfilIncompleto && nomeProprio.trim().split(/\s+/).filter(Boolean).length < 2) {
        Alert.alert('Confira o nome', 'Informe seu nome completo.');
        return false;
      }
      if (perfilIncompleto && !nascimentoValido(nascimentoProprio)) {
        Alert.alert('Confira a data', 'Informe sua data de nascimento no formato DD/MM/AAAA.');
        return false;
      }
    }
    if (queixa.trim().length < 5) {
      Alert.alert('Conte um pouco mais', 'Descreva brevemente o que está acontecendo.');
      return false;
    }
    return true;
  }

  async function irParaPagamento() {
    if (!validarDados() || salvandoPerfil) return;

    const modoReviewFluxo = digits(paciente.tel).slice(-11) === '98991344646';
    if (!modoReviewFluxo) {
      try {
        const existente = await carregarAtendimentoEmAndamento();
        if (existente.atendimento) {
          Alert.alert('Atendimento em andamento', 'Você já tem uma consulta em andamento. Continue o atendimento atual antes de iniciar outra.');
          onVoltar();
          return;
        }
      } catch {
        // Se a checagem temporária falhar, o fluxo existente continua normalmente.
      }
    }

    if (para === 'mim' && perfilIncompleto) {
      setSalvandoPerfil(true);
      try {
        const salvo = await completarPerfilPaciente(nomeProprio.trim(), nascimentoProprio.trim());
        if (!salvo?.paciente) throw new Error('Não foi possível atualizar o cadastro.');
        onPerfilAtualizado(salvo.paciente);
      } catch (error) {
        Alert.alert('Não foi possível salvar seus dados', error instanceof Error ? error.message : 'Tente novamente em instantes.');
        return;
      } finally {
        setSalvandoPerfil(false);
      }
    }

    mudarEtapa('pagamento', 1);
    return;
  }

  async function iniciarTriagemAposPagamento(atendimentoId: number) {
    setAtendimentoPagoId(atendimentoId);
    const history: TriageMessage[] = [
      { role: 'user', content: `Queixa inicial informada pelo paciente: ${queixa.trim()}` },
    ];
    setTriagemLoading(true);
    mudarEtapa('triagem', 1);
    setTriageMessages(history);
    setPerguntaAtual('');
    setRespostaTriagem('');
    try {
      const data = await conversarTriagem(SYSTEM_TRIAGE, history);
      await tratarRetornoTriagem(data.text, history, atendimentoId);
    } catch (error) {
      Alert.alert('Pagamento confirmado', 'O pagamento foi confirmado, mas não conseguimos iniciar a triagem agora. Tente novamente em instantes.');
    } finally {
      setTriagemLoading(false);
    }
  }

  async function concluirTriagem(resumo: string, history: TriageMessage[], atendimentoId: number) {
    setTriagemResumo(resumo || queixa.trim());
    setPerguntaAtual('');
    // O prefixo TRIAGEM_CONCLUIDA é protocolo interno e nunca deve aparecer para o paciente.
    setTriageMessages(history);
    setTriagemLoading(true);
    try {
      await atualizarAtendimento(atendimentoId, {
        nome: pacienteNomeSelecionado,
        telefone: telefoneContato,
        cpf: pacienteCpfSelecionado,
        email: paciente.email || undefined,
        dataNascimento: pacienteNascimentoSelecionado,
        triagem: resumo || queixa.trim(),
        atendimentoParaTerceiro: para === 'outra-pessoa',
      });
      mudarEtapa('fila', 1);
    } catch (error) {
      Alert.alert('Triagem concluída', 'A triagem terminou, mas não conseguimos salvar o resumo no atendimento. Tente novamente.');
    } finally {
      setTriagemLoading(false);
    }
  }

  async function tratarRetornoTriagem(texto: string, history: TriageMessage[], atendimentoId = atendimentoPagoId) {
    const limpo = String(texto || '').trim();
    if (!limpo) throw new Error('A triagem não retornou uma resposta.');
    if (limpo.startsWith('TRIAGEM_CONCLUIDA:')) {
      if (!atendimentoId) throw new Error('Atendimento pago não encontrado.');

      // Fallback determinístico: mesmo que o modelo tente concluir cedo,
      // a pergunta de solicitação documental é obrigatória antes da fila.
      if (!jaPerguntouSobreDocumento(history)) {
        const historyComPergunta: TriageMessage[] = [
          ...history,
          { role: 'assistant', content: PERGUNTA_DOCUMENTO },
        ];
        setPerguntaAtual(PERGUNTA_DOCUMENTO);
        setTriageMessages(historyComPergunta);
        return;
      }

      const resumo = limpo.replace(/^TRIAGEM_CONCLUIDA:\s*/i, '').trim();
      await concluirTriagem(resumo || queixa.trim(), history, atendimentoId);
      return;
    }
    setPerguntaAtual(limpo);
    setTriageMessages([...history, { role: 'assistant', content: limpo }]);
  }

  async function enviarRespostaTriagem() {
    const resposta = respostaTriagem.trim();
    if (!resposta || triagemLoading || !atendimentoPagoId) return;
    const history: TriageMessage[] = [...triageMessages, { role: 'user', content: resposta }];
    setRespostaTriagem('');
    setPerguntaAtual('');
    setTriageMessages(history);
    setTriagemLoading(true);
    try {
      const data = await conversarTriagem(SYSTEM_TRIAGE, history);
      await tratarRetornoTriagem(data.text, history, atendimentoPagoId);
    } catch (error) {
      Alert.alert('Não foi possível continuar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setTriagemLoading(false);
    }
  }

  function voltarEtapa() {
    if (etapaConsulta === 'dados') return motion.close();
    if (etapaConsulta === 'pagamento') return mudarEtapa('dados', -1);
    if (etapaConsulta === 'fila') return motion.close();
    if (etapaConsulta === 'triagem') {
      Alert.alert('Pagamento já confirmado', 'Conclua a triagem para seguir ao atendimento.');
    }
  }

  if (etapaConsulta === 'pagamento') {
    return (
      <Animated.View style={motion.style}>
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[{ flex: 1 }, stageStyle]} {...stagePan.panHandlers}>
        <ScrollView contentContainerStyle={styles.pageWrap} keyboardShouldPersistTaps="handled">
          <PageHeader title="Pagamento" onVoltar={voltarEtapa} />
          <ConsultaProgress current="pagamento" />
          <PagamentoConsulta
            pacienteLogado={paciente}
            atendimentoParaTerceiro={para === 'outra-pessoa'}
            pacienteNome={pacienteNomeSelecionado}
            pacienteCpf={pacienteCpfSelecionado}
            pacienteNascimento={pacienteNascimentoSelecionado}
            onVoltar={voltarEtapa}
            onPagamentoConfirmado={iniciarTriagemAposPagamento}
          />
        </ScrollView>
        </Animated.View>
      </SafeAreaView>
      </Animated.View>
    );
  }

  if (etapaConsulta === 'triagem') {
    const respostasPaciente = triageMessages.filter((m) => m.role === 'user').slice(1);
    return (
      <Animated.View style={motion.style}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <Animated.View style={[{ flex: 1 }, stageStyle]}>
          <View style={styles.pageWrapFlex}>
            <PageHeader title="Triagem" onVoltar={voltarEtapa} />
            <ConsultaProgress current="triagem" />
            <View style={styles.paidBadge}><Text style={styles.paidBadgeText}>✓ PAGAMENTO CONFIRMADO</Text></View>
            <View style={styles.triageProgressRow}>
              <View style={styles.liveDot} />
              <Text style={styles.triageProgressText}>TRIAGEM RÁPIDA · {Math.min(respostasPaciente.length + 1, 4)}/4</Text>
            </View>
            <Text style={styles.pageLead}>Só mais algumas perguntas para organizar seu quadro antes do médico.</Text>

            <ScrollView style={styles.triageChat} contentContainerStyle={styles.triageChatContent} keyboardShouldPersistTaps="handled">
              <View style={styles.patientBubble}><Text style={styles.patientBubbleLabel}>VOCÊ INFORMOU</Text><Text style={styles.patientBubbleText}>{queixa.trim()}</Text></View>
              {triageMessages.slice(1).map((msg, index) => (
                msg.role === 'assistant' ? (
                  <View key={`${index}-${msg.content.slice(0, 8)}`} style={styles.aiBubble}><Text style={styles.aiBubbleLabel}>TRIAGEM</Text><Text style={styles.aiBubbleText}>{msg.content}</Text></View>
                ) : (
                  <View key={`${index}-${msg.content.slice(0, 8)}`} style={styles.userBubble}><Text style={styles.userBubbleText}>{msg.content}</Text></View>
                )
              ))}
              {triagemLoading && !perguntaAtual ? (
                <View style={styles.aiBubble}>
                  <Text style={styles.aiBubbleLabel}>TRIAGEM</Text>
                  <View style={styles.typingRow}>
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.triageComposer}>
              <TextInput
                value={respostaTriagem}
                onChangeText={setRespostaTriagem}
                placeholder={triagemLoading ? 'Aguarde...' : 'Digite sua resposta...'}
                placeholderTextColor="#66736e"
                style={styles.triageInput}
                multiline={false}
      editable={!triagemLoading && !!perguntaAtual}
                maxLength={700}
      returnKeyType="send"
      blurOnSubmit={false}
      onSubmitEditing={() => {
        if (!triagemLoading && respostaTriagem.trim()) enviarRespostaTriagem();
      }}
              />
              <Pressable onPress={enviarRespostaTriagem} disabled={triagemLoading || !respostaTriagem.trim()} style={[styles.sendButton, (triagemLoading || !respostaTriagem.trim()) && styles.sendButtonDisabled]}>
                {triagemLoading ? <ActivityIndicator color="#07100f" /> : <Text style={styles.sendButtonText}>↑</Text>}
              </Pressable>
            </View>
          </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </Animated.View>
    );
  }

  if (etapaConsulta === 'fila') {
    return (
      <Animated.View style={motion.style}>
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[{ flex: 1 }, stageStyle]}>
        <ScrollView contentContainerStyle={styles.pageWrap}>
          <PageHeader title="Atendimento" onVoltar={motion.close} />
          <ConsultaProgress current="fila" />
          <View style={styles.queueHero}>
            <View style={styles.queueCheck}><Text style={styles.queueCheckText}>✓</Text></View>
            <Text style={styles.queueTitle}>Triagem concluída</Text>
            <Text style={styles.queueText}>Pronto. Suas informações já foram enviadas para o médico. Agora é só aguardar por aqui.</Text>
          </View>
          <View style={styles.queueCard}>
            <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.queueKicker}>ATENDIMENTO EM ANDAMENTO</Text></View>
            <Text style={styles.queueCardTitle}>Aguardando um médico</Text>
            <Text style={styles.queueCardText}>Quando um médico assumir, a conversa será aberta automaticamente no app. Você também pode voltar ao início e continuar depois sem perder o atendimento.</Text>
          </View>
          <PrimaryButton label="Voltar ao início" loading={false} onPress={onVoltar} />
        </ScrollView>
        </Animated.View>
      </SafeAreaView>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={motion.style}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={[{ flex: 1 }, stageStyle]}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.consultDataScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <PageHeader title="Nova consulta" onVoltar={voltarEtapa} />
              <ConsultaProgress current="dados" />
              <Text style={styles.consultIntro}>Quem será atendido?</Text>

              <View style={styles.choiceRow}>
                <ChoiceCard active={para === 'mim'} title="Para mim" subtitle={paciente.nome?.split(' ')[0] || 'Paciente'} onPress={() => setPara('mim')} />
                <ChoiceCard active={para === 'outra-pessoa'} title="Outra pessoa" subtitle="Filho ou familiar" onPress={() => setPara('outra-pessoa')} />
              </View>

              {para === 'mim' ? (
                perfilIncompleto ? (
                  <View style={styles.formCard}>
                    <Text style={styles.inputLabelDark}>Nome completo</Text>
                    <TextInput value={nomeProprio} onChangeText={setNomeProprio} placeholder="Nome e sobrenome" placeholderTextColor="#66736e" style={styles.darkInput} autoCapitalize="words" />
                    <Text style={styles.inputLabelDark}>Data de nascimento</Text>
                    <TextInput value={nascimentoProprio} onChangeText={(v) => setNascimentoProprio(formatarNascimentoInput(v))} placeholder="DD/MM/AAAA" placeholderTextColor="#66736e" style={styles.darkInput} keyboardType="number-pad" maxLength={10} />
                    <Text style={styles.identityMeta}>CPF {mascararCpf(paciente.cpf)}</Text>
                  </View>
                ) : (
                  <View style={styles.identityCard}>
                    <Text style={styles.identityKicker}>PACIENTE</Text>
                    <Text style={styles.identityName}>{paciente.nome}</Text>
                    <Text style={styles.identityMeta}>{mascararCpf(paciente.cpf)} · {mascararTelefone(paciente.tel)}</Text>
                  </View>
                )
              ) : (
                <View style={styles.formCard}>
                  <Text style={styles.inputLabelDark}>Nome completo do paciente</Text>
                  <TextInput value={nomeOutro} onChangeText={setNomeOutro} placeholder="Nome e sobrenome" placeholderTextColor="#66736e" style={styles.darkInput} autoCapitalize="words" />
                  <Text style={styles.inputLabelDark}>CPF</Text>
                  <TextInput value={cpfOutro} onChangeText={(v) => setCpfOutro(formatarCpf(v))} placeholder="000.000.000-00" placeholderTextColor="#66736e" style={styles.darkInput} keyboardType="number-pad" maxLength={14} />
                  <Text style={styles.inputLabelDark}>Data de nascimento</Text>
                  <TextInput value={nascimentoOutro} onChangeText={(v) => setNascimentoOutro(formatarNascimentoInput(v))} placeholder="DD/MM/AAAA" placeholderTextColor="#66736e" style={styles.darkInput} keyboardType="number-pad" maxLength={10} />
                </View>
              )}

              <Text style={styles.formSectionTitle}>O que está acontecendo?</Text>
              <TextInput
                value={queixa}
                onChangeText={setQueixa}
                placeholder="Ex.: dor de garganta, febre desde ontem..."
                placeholderTextColor="#66736e"
                style={[styles.darkInput, styles.textArea]}
                multiline
                textAlignVertical="top"
                maxLength={1200}
              />
              <Text style={styles.counter}>{queixa.length}/1200</Text>

            </ScrollView>

            <View style={styles.stickyCta}>
              <PrimaryButton label="Continuar para pagamento" loading={salvandoPerfil} onPress={irParaPagamento} />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
  );
}

function ConsultaProgress({ current }: { current: EtapaConsulta }) {
  const etapas: { key: EtapaConsulta; label: string }[] = [
    { key: 'dados', label: 'Queixa' },
    { key: 'pagamento', label: 'Pagamento' },
    { key: 'triagem', label: 'Triagem' },
    { key: 'fila', label: 'Atendimento' },
  ];
  const atual = etapas.findIndex((item) => item.key === current);
  return (
    <View style={styles.consultaProgressWrap}>
      <View style={styles.consultaProgressHead}>
        <Text style={styles.consultaProgressLabel}>{etapas[atual]?.label}</Text>
        <Text style={styles.consultaProgressCount}>{atual + 1} de {etapas.length}</Text>
      </View>
      <View style={styles.consultaProgress}>
        {etapas.map((item, index) => (
          <View key={item.key} style={[styles.consultaSegment, index <= atual && styles.consultaSegmentActive]} />
        ))}
      </View>
      {current === 'pagamento' ? <Text style={styles.consultaSwipeHint}>Deslize para a direita para voltar</Text> : null}
    </View>
  );
}

function ServicosSaude({ onVoltar, onAbrir }: { onVoltar: () => void; onAbrir: (title: string, url: string) => void }) {
  const motion = usePageSlide(onVoltar);
  const servicos = [
    { title: 'Psiquiatria', text: 'Saúde mental e acompanhamento médico', code: '01', url: 'https://consultaja24h.com.br/especialistas/psiquiatria' },
    { title: 'Dermatologia', text: 'Avaliação de pele, cabelos e unhas', code: '02', url: 'https://consultaja24h.com.br/especialistas/dermatologia' },
    { title: 'Endocrinologia', text: 'Hormônios, metabolismo e acompanhamento', code: '03', url: 'https://consultaja24h.com.br/especialistas/endocrinologia' },
  ];
  return (
    <Animated.View style={motion.style}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.pageWrap}>
          <PageHeader title="Especialistas" onVoltar={motion.close} />
          <Text style={styles.pageLead}>Escolha a especialidade para ver profissionais, valores e horários.</Text>
          <View style={styles.serviceList}>
            {servicos.map((item) => (
              <Pressable key={item.title} onPress={() => onAbrir(item.title, item.url)} style={({ pressed }) => [styles.serviceCard, pressed && styles.quickCardPressed]}>
                <View style={styles.serviceCardTop}>
                  <Text style={styles.serviceCode}>{item.code}</Text>
                  <View style={styles.serviceStatus}><View style={styles.serviceStatusDot} /><Text style={styles.serviceStatusText}>ONLINE</Text></View>
                </View>
                <Text style={styles.serviceTitle}>{item.title}</Text>
                <Text style={styles.serviceText}>{item.text}</Text>
                <Text style={styles.serviceAction}>Ver profissionais</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const renewalWebCleanupScript = `
(function() {
  function hideInternalHeader() {
    var links = Array.from(document.querySelectorAll('a, button'));
    var plantao = links.find(function(el) {
      return /Plantão\s*24h/i.test((el.innerText || el.textContent || '').trim());
    });
    if (!plantao) return false;

    var target = plantao.closest('header, nav');
    if (!target) {
      var node = plantao.parentElement;
      while (node && node !== document.body) {
        var text = (node.innerText || '').replace(/\s+/g, ' ').trim();
        if (/ConsultaJá24h/i.test(text) && /Plantão\s*24h/i.test(text)) {
          target = node;
          break;
        }
        node = node.parentElement;
      }
    }

    if (!target) target = plantao.parentElement && plantao.parentElement.parentElement;
    if (!target) return false;

    target.style.setProperty('display', 'none', 'important');
    target.style.setProperty('height', '0', 'important');
    target.style.setProperty('min-height', '0', 'important');
    target.style.setProperty('margin', '0', 'important');
    target.style.setProperty('padding', '0', 'important');
    target.style.setProperty('border', '0', 'important');
    return true;
  }

  hideInternalHeader();
  var attempts = 0;
  var timer = setInterval(function() {
    attempts += 1;
    if (hideInternalHeader() || attempts >= 30) clearInterval(timer);
  }, 200);

  var observer = new MutationObserver(function() { hideInternalHeader(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(function() { observer.disconnect(); }, 8000);
})();
true;
`;

function InternalWebScreen({ title, url, onVoltar }: { title: string; url: string; onVoltar: () => void }) {
  const motion = usePageSlide(onVoltar);
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loadingWeb, setLoadingWeb] = useState(true);
  function voltar() {
    if (canGoBack) webRef.current?.goBack();
    else motion.close();
  }
  return (
    <Animated.View style={motion.style}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.internalWebHeader}>
          <Pressable onPress={voltar} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
          <Text style={styles.pageTitle} numberOfLines={1}>{title}</Text>
          <View style={{ width: 42 }} />
        </View>
        <View style={styles.webWrap}>
          {loadingWeb ? <View style={styles.webLoading}><ActivityIndicator color="#16c783" /><Text style={styles.webLoadingText}>Carregando...</Text></View> : null}
          <WebView
            ref={webRef}
            source={{ uri: url }}
            injectedJavaScriptBeforeContentLoaded={title === 'Renovar receita' ? renewalWebCleanupScript : undefined}
            injectedJavaScript={title === 'Renovar receita' ? renewalWebCleanupScript : undefined}
            style={styles.webView}
            startInLoadingState={false}
            onLoadStart={() => setLoadingWeb(true)}
            onLoadEnd={() => setLoadingWeb(false)}
            onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
            setSupportMultipleWindows={false}
            javaScriptEnabled
            domStorageEnabled
          />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

function PageHeader({ title, onVoltar }: { title: string; onVoltar: () => void }) {
  return <View style={styles.pageHeader}><Pressable onPress={onVoltar} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable><Text style={styles.pageTitle}>{title}</Text><View style={{ width: 42 }} /></View>;
}

function ChoiceCard({ active, title, subtitle, onPress }: { active: boolean; title: string; subtitle: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choiceCard, active && styles.choiceCardActive]}><View style={[styles.radio, active && styles.radioActive]}>{active && <View style={styles.radioInner} />}</View><Text style={styles.choiceTitle}>{title}</Text><Text style={styles.choiceSubtitle}>{subtitle}</Text></Pressable>;
}

function FlowRow({ number, title, text, last }: { number: string; title: string; text: string; last?: boolean }) {
  return <View style={[styles.flowRow, last && { borderBottomWidth: 0, paddingBottom: 0 }]}><View style={styles.flowNumber}><Text style={styles.flowNumberText}>{number}</Text></View><View style={{ flex: 1 }}><Text style={styles.flowTitle}>{title}</Text><Text style={styles.flowText}>{text}</Text></View></View>;
}

function FlowChip({ number, title }: { number: string; title: string }) {
  return <View style={styles.flowChip}><View style={styles.flowChipNumber}><Text style={styles.flowChipNumberText}>{number}</Text></View><Text style={styles.flowChipTitle}>{title}</Text></View>;
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

function Badge({ text }: { text: string }) {
  return <View style={styles.badge}><Text style={styles.badgeText}>{text}</Text></View>;
}

function PrimaryButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} disabled={loading} style={({ pressed }) => [styles.primaryButton, loading && styles.buttonLoading, pressed && !loading && styles.primaryPressed]}>{loading ? <ActivityIndicator color="#07100f" /> : <Text style={styles.primaryButtonText}>{label}</Text>}</Pressable>;
}

function QuickCard({ title, subtitle, onPress, featured }: { title: string; subtitle: string; onPress: () => void; featured?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.quickCard, featured && styles.quickCardFeatured, pressed && styles.quickCardPressed]}><Text style={[styles.quickTitle, featured && styles.quickTitleFeatured]}>{title}</Text><Text style={styles.quickSubtitle}>{subtitle}</Text></Pressable>;
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action ? <Pressable onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}</View>;
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text></View>;
}

function SkeletonPulse({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0.42)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.82, duration: 720, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.42, duration: 720, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

function HomeHistorySkeleton() {
  return (
    <SkeletonPulse>
      <View style={styles.skeletonHistoryCard}>
        <View style={styles.skeletonDot} />
        <View style={{ flex: 1 }}>
          <View style={[styles.skeletonLine, { width: '48%', height: 13 }]} />
          <View style={[styles.skeletonLine, { width: '30%', height: 9, marginTop: 9 }]} />
          <View style={[styles.skeletonLine, { width: '88%', height: 10, marginTop: 13 }]} />
          <View style={[styles.skeletonLine, { width: '68%', height: 10, marginTop: 7 }]} />
        </View>
      </View>
      <View style={[styles.skeletonHistoryCard, { opacity: 0.72 }]}>
        <View style={styles.skeletonDot} />
        <View style={{ flex: 1 }}>
          <View style={[styles.skeletonLine, { width: '42%', height: 13 }]} />
          <View style={[styles.skeletonLine, { width: '26%', height: 9, marginTop: 9 }]} />
          <View style={[styles.skeletonLine, { width: '80%', height: 10, marginTop: 13 }]} />
        </View>
      </View>
    </SkeletonPulse>
  );
}

function AppSkeleton() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.skeletonPage}>
        <SkeletonPulse>
          <View style={styles.skeletonTop}>
            <View>
              <View style={[styles.skeletonLine, { width: 92, height: 9 }]} />
              <View style={[styles.skeletonLine, { width: 150, height: 25, marginTop: 9 }]} />
              <View style={[styles.skeletonLine, { width: 126, height: 10, marginTop: 9 }]} />
            </View>
            <View style={styles.skeletonAvatar} />
          </View>
          <View style={styles.skeletonHero}>
            <View style={[styles.skeletonLine, { width: 86, height: 9 }]} />
            <View style={[styles.skeletonLine, { width: '83%', height: 20, marginTop: 15 }]} />
            <View style={[styles.skeletonLine, { width: '68%', height: 20, marginTop: 8 }]} />
            <View style={[styles.skeletonLine, { width: '92%', height: 10, marginTop: 15 }]} />
            <View style={[styles.skeletonLine, { width: '74%', height: 10, marginTop: 7 }]} />
            <View style={styles.skeletonButton} />
          </View>
          <View style={styles.skeletonGrid}>
            <View style={styles.skeletonQuick} />
            <View style={styles.skeletonQuick} />
          </View>
          <View style={[styles.skeletonLine, { width: 170, height: 17, marginBottom: 13 }]} />
          <View style={styles.skeletonLast} />
        </SkeletonPulse>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: themeColor('#e8efeb', '#07100f') },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#e8efeb', '#07100f') },
  loginWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 22 },
  brandBlock: { marginBottom: 22 },
  brand: { color: themeColor('#14201d', '#fff'), fontSize: 34, fontWeight: '700', letterSpacing: -1.2 },
  subtitle: { color: themeColor('#66736e', '#8a97a6'), marginTop: 6, fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 22 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#eafaf3', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 14 },
  badgeText: { color: '#0b8f61', fontSize: 10, fontWeight: '800', letterSpacing: .9 },
  cardTitle: { color: '#14201d', fontWeight: '800', fontSize: 25, letterSpacing: -.5 },
  cardSubtitle: { color: '#66736e', marginTop: 7, marginBottom: 20, lineHeight: 21 },
  inputLabel: { color: '#25322e', fontSize: 13, fontWeight: '700', marginBottom: 7 },
  input: { backgroundColor: '#f7fbf8', borderWidth: 1, borderColor: '#dfe9e3', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 15, marginBottom: 12, color: '#14201d', fontSize: 17 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  countryBox: { minWidth: 58, height: 54, borderWidth: 1, borderColor: '#dfe9e3', borderRadius: 14, backgroundColor: '#eef7f1', alignItems: 'center', justifyContent: 'center' },
  countryText: { color: '#25322e', fontSize: 16, fontWeight: '700' },
  phoneInput: { flex: 1, height: 54 },
  codeInput: { textAlign: 'center', fontSize: 28, fontWeight: '800', letterSpacing: 10, paddingLeft: 24 },
  primaryButton: { minHeight: 54, backgroundColor: '#16c783', borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryPressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  buttonLoading: { opacity: .75 },
  primaryButtonText: { color: '#07100f', fontSize: 15.5, fontWeight: '700' },
  privacyText: { color: themeColor('#66736e', '#84908c'), fontSize: 11.5, lineHeight: 17, marginTop: 14 },
  helperText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 16, paddingHorizontal: 16 },
  secondaryActions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  singleSecondary: { alignItems: 'center', marginTop: 18 },
  secondaryActionText: { color: '#0b8f61', fontSize: 13, fontWeight: '700' },
  actionDivider: { width: 1, height: 14, backgroundColor: '#dfe9e3', marginHorizontal: 13 },

  home: { padding: 20, paddingBottom: 48 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  kicker: { color: '#16c783', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  greeting: { color: themeColor('#14201d', '#fff'), fontSize: 29, fontWeight: '600', marginTop: 3, letterSpacing: -.5 },
  homeSubtitle: { color: themeColor('#66736e', '#8a97a6'), fontSize: 14, marginTop: 4 },
  avatarButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: themeColor('#dce9e2', '#10201d'), alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 17, fontWeight: '800' },
  heroCard: { backgroundColor: themeColor('#dfe9e3', '#10201d'), borderRadius: 24, padding: 22, marginBottom: 14 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#78f25f' },
  heroEyebrow: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
  heroTitle: { color: themeColor('#14201d', '#fff'), fontSize: 24, fontWeight: '600', lineHeight: 30, marginTop: 10, letterSpacing: -.3 },
  heroText: { color: themeColor('#5f6c67', '#a9b5b0'), lineHeight: 20, marginTop: 8, marginBottom: 15, fontSize: 13.5 },
  activeCareCard: { backgroundColor: themeColor('#d7e8df', '#10251f'), borderRadius: 20, padding: 18, marginBottom: 12 },
  activeCareEyebrow: { color: themeColor('#18724f', '#78f25f'), fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  activeCareTitle: { color: themeColor('#14201d', '#f3f8f5'), fontSize: 19, fontWeight: '600', marginTop: 9 },
  activeCareText: { color: themeColor('#596763', '#9fb0a9'), fontSize: 13, lineHeight: 19, marginTop: 5 },
  activeCareAction: { color: '#16c783', fontSize: 12.5, fontWeight: '600', marginTop: 11 },
  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  quickCard: { flex: 1, minHeight: 116, borderRadius: 18, backgroundColor: themeColor('#f0f5f2', '#0c1816'), padding: 15 },
  quickCardFeatured: { borderColor: themeColor('#cfe1d6', '#346342'), backgroundColor: themeColor('#e3eee7', '#101d14') },
  quickTitle: { color: themeColor('#14201d', '#fff'), fontSize: 15, fontWeight: '700' },
  quickTitleFeatured: { color: themeColor('#18724f', '#dfff9e') },
  quickSubtitle: { color: themeColor('#66736e', '#84908c'), fontSize: 12, lineHeight: 17, marginTop: 5 },
  quickArrow: { color: '#16c783', fontSize: 20, marginTop: 'auto' },
  quickCardPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  psychologyHomeCard: { minHeight: 76, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 14, marginBottom: 28, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: themeColor('#e9eef6', '#101921') },
  psychologyHomeBadge: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dbe6f5', '#172536') },
  psychologyHomeBadgeText: { color: themeColor('#315b93', '#8ab9f5'), fontSize: 10, fontWeight: '900', letterSpacing: .8 },
  psychologyHomeTitle: { color: themeColor('#14201d', '#fff'), fontSize: 15.5, fontWeight: '800' },
  psychologyHomeText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 12, marginTop: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 12 },
  sectionTitle: { color: themeColor('#14201d', '#fff'), fontSize: 18.5, fontWeight: '600' },
  sectionAction: { color: '#16c783', fontSize: 13, fontWeight: '700' },
  lastCard: { backgroundColor: themeColor('#edf3ef', '#0d1916'), borderRadius: 20, padding: 18, marginBottom: 27 },
  lastTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  datePill: { backgroundColor: '#e5f7eb', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  datePillText: { color: '#18724f', fontSize: 11, fontWeight: '800' },
  statusText: { color: themeColor('#66736e', '#75827e'), fontSize: 11, fontWeight: '700' },
  lastDoctor: { color: themeColor('#14201d', '#eef5f1'), fontSize: 17, fontWeight: '700', marginTop: 14 },
  lastSummary: { color: themeColor('#596763', '#94a39d'), lineHeight: 20, marginTop: 6 },
  historyCard: { marginBottom: 9 },
  historyCarousel: { gap: 10, paddingBottom: 9, paddingRight: 12 },
  historyCardHorizontal: { width: 276, marginBottom: 0 },
  historyLine: { flexDirection: 'row', backgroundColor: themeColor('#eef4f0', '#0c1816'), borderRadius: 17, padding: 15 },
  timelineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#16c783', marginTop: 5, marginRight: 12 },
  historyBody: { flex: 1 },
  historyTitle: { color: themeColor('#14201d', '#fff'), fontWeight: '700', fontSize: 15 },
  historyMeta: { color: '#769087', fontSize: 12, marginTop: 4 },
  historyText: { color: themeColor('#596763', '#9ba9a4'), fontSize: 13, lineHeight: 19, marginTop: 8 },
  emptyCard: { backgroundColor: themeColor('#f7faf8', '#0c1816'), borderRadius: 16, padding: 18, marginBottom: 24 },
  emptyTitle: { color: themeColor('#14201d', '#fff'), fontWeight: '700' },
  emptyText: { color: themeColor('#66736e', '#8a97a6'), marginTop: 5, lineHeight: 19 },
  appointmentCard: { backgroundColor: themeColor('#f7faf8', '#0c1816'), borderRadius: 16, padding: 17, marginBottom: 10 },
  appointmentName: { color: themeColor('#14201d', '#fff'), fontWeight: '700', fontSize: 16 },
  appointmentMeta: { color: themeColor('#5f6c67', '#a9b5b0'), marginTop: 5 },
  docsCard: { flexDirection: 'row', gap: 13, alignItems: 'center', backgroundColor: themeColor('#eaf1ed', '#0d1916'), borderRadius: 18, padding: 16, marginTop: 25 },
  docsIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: themeColor('#e7f7ee', '#123027'), alignItems: 'center', justifyContent: 'center' },
  docsIconText: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 25, fontWeight: '400', marginTop: -2 },
  docsGlyph: { width: 18, height: 22, borderWidth: 1.7, borderColor: themeColor('#0b8f61', '#78f25f'), borderRadius: 3, paddingTop: 8, paddingHorizontal: 3 },
  docsGlyphFold: { position: 'absolute', right: -1.7, top: -1.7, width: 7, height: 7, borderLeftWidth: 1.7, borderBottomWidth: 1.7, borderColor: themeColor('#0b8f61', '#78f25f'), backgroundColor: themeColor('#e7f7ee', '#123027'), borderBottomLeftRadius: 2 },
  docsGlyphLine: { height: 1.5, borderRadius: 1, backgroundColor: themeColor('#0b8f61', '#78f25f'), marginBottom: 3 },
  docsGlyphLineShort: { width: '65%' },
  docsTitle: { color: themeColor('#14201d', '#fff'), fontSize: 15, fontWeight: '700' },
  openHistoryHint: { marginTop: 12, color: '#68c99a', fontSize: 12, fontWeight: '700' },
  historyOpen: { marginTop: 7, color: '#67bd94', fontSize: 11, fontWeight: '700' },
  documentItem: { backgroundColor: themeColor('#eef4f0', '#0d1916'), borderRadius: 18, marginBottom: 12, overflow: 'hidden' },
  documentMain: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  documentPdf: { width: 44, height: 50, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#e8f1ec', '#14231f') },
  documentPdfText: { color: '#91b4a6', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  documentInfo: { flex: 1, minWidth: 0 },
  documentName: { color: themeColor('#14201d', '#eef5f1'), fontSize: 14, lineHeight: 19, fontWeight: '700' },
  documentMeta: { color: themeColor('#66736e', '#76867f'), fontSize: 11, marginTop: 4 },
  documentConsultButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#edf3ef', '#101e1a') },
  documentConsultText: { color: '#69c99a', fontSize: 12, fontWeight: '800' },
  docsText: { color: themeColor('#66736e', '#84908c'), fontSize: 12, lineHeight: 17, marginTop: 3 },
  chevron: { color: '#66736e', fontSize: 27 },
  refreshButton: { alignItems: 'center', marginTop: 22, paddingVertical: 12 },
  refreshText: { color: themeColor('#66736e', '#71807b'), fontWeight: '700', fontSize: 13 },
  skeletonPage: { flex: 1, paddingHorizontal: 20, paddingTop: 12, backgroundColor: themeColor('#e8efeb', '#07100f') },
  skeletonTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  skeletonLine: { borderRadius: 999, backgroundColor: themeColor('#d7e1dc', '#1b2925') },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: themeColor('#d7e1dc', '#172823') },
  skeletonHero: { minHeight: 225, borderRadius: 24, padding: 22, backgroundColor: themeColor('#e3ebe6', '#0f1d19'), marginBottom: 14 },
  skeletonButton: { height: 48, borderRadius: 15, backgroundColor: themeColor('#d0dbd5', '#193027'), marginTop: 20 },
  skeletonGrid: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  skeletonQuick: { flex: 1, height: 116, borderRadius: 18, backgroundColor: themeColor('#e1e8e4', '#0c1816') },
  skeletonLast: { height: 150, borderRadius: 20, backgroundColor: themeColor('#e1e8e4', '#0d1916') },
  skeletonHistoryCard: { minHeight: 120, flexDirection: 'row', borderRadius: 17, padding: 15, marginBottom: 9, backgroundColor: themeColor('#e4ebe7', '#0c1816') },
  skeletonDot: { width: 9, height: 9, borderRadius: 5, marginTop: 3, marginRight: 12, backgroundColor: themeColor('#c6d3cc', '#20352e') },

  renewalStatusCard: { backgroundColor: themeColor('#e7f0eb', '#0e1c18'), borderRadius: 20, padding: 17, marginBottom: 22 },
  renewalStatusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  renewalStatusKicker: { color: themeColor('#18724f', '#78f25f'), fontSize: 9.5, fontWeight: '900', letterSpacing: .9 },
  renewalStatusPill: { backgroundColor: themeColor('#dfe8e3', '#17251f'), borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  renewalStatusPillReady: { backgroundColor: themeColor('#d9f7e7', '#153a2b') },
  renewalStatusPillText: { color: themeColor('#66736e', '#9aa7a2'), fontSize: 9, fontWeight: '800' },
  renewalStatusPillTextReady: { color: themeColor('#0b8f61', '#78f25f') },
  renewalStatusTitle: { color: themeColor('#14201d', '#fff'), fontSize: 17, fontWeight: '800', marginTop: 12 },
  renewalStatusText: { color: themeColor('#596763', '#9ba9a4'), fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  renewalStatusAction: { color: '#16c783', fontSize: 12, fontWeight: '800', marginTop: 11 },
  renewalLoading: { minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 10 },
  renewalLoadingText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 12 },
  renewalHero: { backgroundColor: themeColor('#e6eee9', '#0e1c18'), borderRadius: 22, padding: 20, marginBottom: 18 },
  renewalHeroKicker: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  renewalHeroTitle: { color: themeColor('#14201d', '#fff'), fontSize: 22, lineHeight: 28, fontWeight: '800', marginTop: 9 },
  renewalHeroText: { color: themeColor('#596763', '#9ba9a4'), fontSize: 13, lineHeight: 20, marginTop: 8 },
  renewalTimeline: { backgroundColor: themeColor('#edf3ef', '#0b1715'), borderRadius: 18, padding: 17, marginBottom: 14 },
  renewalStep: { flexDirection: 'row', minHeight: 48, marginBottom: 2 },
  renewalStepRail: { width: 30, alignItems: 'center' },
  renewalStepDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: themeColor('#b8c5bf', '#31423c'), alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#edf3ef', '#0b1715') },
  renewalStepDotDone: { borderColor: '#16c783', backgroundColor: '#16c783' },
  renewalStepDotActive: { borderColor: '#16c783' },
  renewalStepCheck: { color: '#07100f', fontSize: 12, fontWeight: '900' },
  renewalStepLine: { flex: 1, width: 1.5, backgroundColor: themeColor('#c9d4ce', '#24332e'), marginVertical: 4 },
  renewalStepLineDone: { backgroundColor: '#16c783' },
  renewalStepText: { color: themeColor('#71807a', '#75827e'), fontSize: 13, fontWeight: '700', paddingTop: 2, marginLeft: 9 },
  renewalStepTextActive: { color: themeColor('#14201d', '#eef5f1') },
  renewalDocumentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: themeColor('#edf3ef', '#0d1916'), borderRadius: 18, padding: 15, marginBottom: 14 },
  renewalDocumentTitle: { color: themeColor('#14201d', '#eef5f1'), fontSize: 14, fontWeight: '800' },
  renewalDocumentText: { color: '#67bd94', fontSize: 11.5, fontWeight: '700', marginTop: 4 },
  renewalTracking: { backgroundColor: themeColor('#edf3ef', '#0d1916'), borderRadius: 16, padding: 15, marginBottom: 14 },
  renewalTrackingLabel: { color: themeColor('#66736e', '#75827e'), fontSize: 9.5, fontWeight: '900', letterSpacing: .8 },
  renewalTrackingCode: { color: themeColor('#14201d', '#fff'), fontSize: 16, fontWeight: '800', marginTop: 7, letterSpacing: .5 },
  renewalUpdatedHint: { color: themeColor('#71807a', '#75827e'), textAlign: 'center', fontSize: 11, marginTop: 8, marginBottom: 8 },

  pageWrap: { padding: 20, paddingBottom: 50 },
  pageWrapFlex: { flex: 1, minHeight: 0, padding: 20, paddingBottom: 10 },
  consultaProgressWrap: { marginTop: -10, marginBottom: 20 },
  consultaProgressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  consultaProgressLabel: { color: themeColor('#34413d', '#dce7e2'), fontSize: 12, fontWeight: '800' },
  consultaProgressCount: { color: themeColor('#71807a', '#75827e'), fontSize: 11, fontWeight: '700' },
  consultaProgress: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  consultaSegment: { flex: 1, height: 4, borderRadius: 999, backgroundColor: themeColor('#cbd6d0', '#20302b') },
  consultaSegmentActive: { backgroundColor: '#16c783' },
  consultaSwipeHint: { color: themeColor('#71807a', '#75827e'), fontSize: 10.5, marginTop: 7, textAlign: 'right' },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  serviceList: { gap: 12 },
  serviceCard: { minHeight: 148, borderRadius: 22, padding: 18, backgroundColor: themeColor('#eef3f0', '#0d1916') },
  serviceCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  serviceCode: { color: themeColor('#9aa8a1', '#53635d'), fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  serviceStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: themeColor('#dff2e8', '#10271f') },
  serviceStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16c783' },
  serviceStatusText: { color: themeColor('#18724f', '#78f25f'), fontSize: 9, fontWeight: '900', letterSpacing: .8 },
  serviceTitle: { color: themeColor('#14201d', '#fff'), fontSize: 21, fontWeight: '800', letterSpacing: -.3 },
  serviceText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  serviceAction: { color: '#16c783', fontSize: 12, fontWeight: '800', marginTop: 16 },
  internalWebHeader: { height: 62, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  webWrap: { flex: 1, overflow: 'hidden', backgroundColor: themeColor('#e8efeb', '#07100f') },
  webView: { flex: 1, backgroundColor: 'transparent' },
  webLoading: { position: 'absolute', zIndex: 5, left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: themeColor('#e8efeb', '#07100f') },
  webLoadingText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 12 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: themeColor('#dce7e1', '#0b1715'), alignItems: 'center', justifyContent: 'center' },
  backText: { color: themeColor('#14201d', '#fff'), fontSize: 30, lineHeight: 32, marginTop: -3 },
  pageTitle: { color: themeColor('#14201d', '#fff'), fontSize: 20, fontWeight: '800' },
  pageLead: { color: themeColor('#5f6c67', '#a9b5b0'), lineHeight: 21, marginTop: -7, marginBottom: 18 },
  profileHero: { alignItems: 'center', marginBottom: 22 },
  profileAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: themeColor('#dce9e2', '#10201d'), alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 27, fontWeight: '800' },
  profileName: { color: themeColor('#14201d', '#fff'), fontSize: 22, fontWeight: '800', marginTop: 13, textAlign: 'center' },
  profileHint: { color: themeColor('#66736e', '#8a97a6'), fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5, maxWidth: 290 },
  profileCard: { backgroundColor: themeColor('#e9f0ec', '#0b1715'), borderRadius: 18, paddingHorizontal: 17 },
  infoRow: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: themeColor('#dce6e1', '#1d342f') },
  infoLabel: { color: themeColor('#66736e', '#71807b'), fontSize: 11, fontWeight: '800', letterSpacing: .6, textTransform: 'uppercase' },
  infoValue: { color: themeColor('#14201d', '#fff'), fontSize: 15, fontWeight: '700', marginTop: 5 },
  supportButton: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 66, borderRadius: 18, paddingHorizontal: 15, marginTop: 14, backgroundColor: themeColor('#e9f0ec', '#0d1916') },
  supportIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dcebe3', '#123027') },
  supportBubble: { width: 19, height: 15, borderWidth: 1.6, borderColor: themeColor('#0b8f61', '#78f25f'), borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2.2 },
  supportBubbleDot: { width: 2.5, height: 2.5, borderRadius: 2, backgroundColor: themeColor('#0b8f61', '#78f25f') },
  supportTitle: { color: themeColor('#14201d', '#eef5f1'), fontSize: 14.5, fontWeight: '800' },
  supportText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 11.5, marginTop: 3 },
  supportArrow: { color: themeColor('#7b8b84', '#6f8179'), fontSize: 24, marginTop: -1 },
  profileNotice: { backgroundColor: themeColor('#eef7f1', '#10201d'), borderRadius: 16, padding: 16, marginTop: 14 },
  profileNoticeTitle: { color: themeColor('#0b8f61', '#78f25f'), fontWeight: '800', fontSize: 13 },
  profileNoticeText: { color: themeColor('#5f6c67', '#a9b5b0'), lineHeight: 19, fontSize: 12.5, marginTop: 6 },
  logoutButton: { borderWidth: 1, borderColor: '#603438', backgroundColor: '#1a1112', borderRadius: 15, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  logoutButtonText: { color: '#ff9ca5', fontSize: 14, fontWeight: '800' },

  consultDataScroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
  consultIntro: { color: themeColor('#5f6c67', '#a9b5b0'), fontSize: 13, marginTop: -5, marginBottom: 10 },
  choiceRow: { flexDirection: 'row', gap: 10, marginBottom: 11 },
  choiceCard: { flex: 1, minHeight: 94, borderRadius: 17, backgroundColor: themeColor('#e9f0ec', '#0b1715'), padding: 13 },
  choiceCardActive: { backgroundColor: themeColor('#dcebe3', '#0f211c') },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: '#50605a', alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  radioActive: { borderColor: '#16c783' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16c783' },
  choiceTitle: { color: themeColor('#14201d', '#fff'), fontSize: 15, fontWeight: '800' },
  choiceSubtitle: { color: themeColor('#66736e', '#84908c'), fontSize: 12, lineHeight: 17, marginTop: 5 },
  identityCard: { backgroundColor: '#f7fbf8', borderRadius: 17, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 14 },
  identityKicker: { color: '#18724f', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  identityName: { color: '#14201d', fontSize: 16.5, fontWeight: '800', marginTop: 5 },
  identityMeta: { color: themeColor('#52615c', '#81908a'), fontSize: 12.5, fontWeight: '500', marginTop: 5 },
  formCard: { backgroundColor: themeColor('#e9f0ec', '#0b1715'), borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 18 },
  inputLabelDark: { color: themeColor('#34413d', '#d6dfdb'), fontSize: 12.5, fontWeight: '700', marginBottom: 6 },
  darkInput: { backgroundColor: themeColor('#dfe8e3', '#101d1a'), borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 11, color: themeColor('#14201d', '#fff'), fontSize: 15 },
  formSectionTitle: { color: themeColor('#14201d', '#fff'), fontSize: 16.5, fontWeight: '800', marginBottom: 8 },
  textArea: { minHeight: 92, paddingTop: 12 },
  counter: { color: '#64736e', fontSize: 10.5, textAlign: 'right', marginTop: -8, marginBottom: 10 },
  flowPreview: { backgroundColor: themeColor('#e9f0ec', '#0b1715'), borderRadius: 17, padding: 13, marginBottom: 4 },
  flowPreviewTitle: { color: themeColor('#14201d', '#fff'), fontSize: 13.5, fontWeight: '800', marginBottom: 10 },
  flowCompact: { flexDirection: 'row', gap: 8 },
  flowChip: { flex: 1, minHeight: 58, borderRadius: 13, paddingHorizontal: 9, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dfe9e3', '#12201c') },
  flowChipNumber: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#ccebdc', '#173329') },
  flowChipNumberText: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 10, fontWeight: '900' },
  flowChipTitle: { color: themeColor('#34413d', '#e9f2ee'), fontSize: 10.5, fontWeight: '800', marginTop: 5, textAlign: 'center' },
  stickyCta: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, backgroundColor: themeColor('#e8efeb', '#07100f') },
  flowRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  flowNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: themeColor('#e7f7ee', '#123027'), alignItems: 'center', justifyContent: 'center' },
  flowNumberText: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 12, fontWeight: '900' },
  flowTitle: { color: themeColor('#14201d', '#fff'), fontSize: 13.5, fontWeight: '800' },
  flowText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 12, lineHeight: 17, marginTop: 3 },

  paidBadge: { alignSelf: 'flex-start', backgroundColor: themeColor('#dcebe3', '#123027'), borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginTop: -8, marginBottom: 12 },
  paidBadgeText: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 9.5, fontWeight: '900', letterSpacing: .7 },
  triageProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  triageProgressText: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 10.5, fontWeight: '900', letterSpacing: .8 },
  triageChat: { flex: 1, minHeight: 0, marginTop: 2 },
  triageChatContent: { paddingBottom: 18, gap: 11 },
  patientBubble: { alignSelf: 'stretch', backgroundColor: themeColor('#eef7f1', '#10201d'), borderRadius: 17, padding: 15 },
  patientBubbleLabel: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 9.5, fontWeight: '900', letterSpacing: .8, marginBottom: 6 },
  patientBubbleText: { color: themeColor('#26332f', '#dce6e2'), lineHeight: 20, fontSize: 14 },
  aiBubble: { alignSelf: 'flex-start', maxWidth: '88%', backgroundColor: '#f7fbf8', borderRadius: 17, borderBottomLeftRadius: 5, padding: 14 },
  aiBubbleLabel: { color: '#18724f', fontSize: 9.5, fontWeight: '900', letterSpacing: .8, marginBottom: 5 },
  aiBubbleText: { color: '#26332f', lineHeight: 20, fontSize: 14 },
  userBubble: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: '#16c783', borderRadius: 17, borderBottomRightRadius: 5, paddingHorizontal: 14, paddingVertical: 11 },
  userBubbleText: { color: '#07100f', lineHeight: 19, fontSize: 14, fontWeight: '600' },
  triageComposer: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 10, paddingBottom: 2, backgroundColor: themeColor('#e8efeb', '#07100f') },
  triageInput: { flex: 1, minHeight: 50, maxHeight: 105, backgroundColor: themeColor('#ffffff', '#101d1a'), borderRadius: 15, paddingHorizontal: 14, paddingVertical: 13, color: themeColor('#14201d', '#fff'), fontSize: 15 },
  sendButton: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#16c783', alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: .35 },
  sendButtonText: { color: '#07100f', fontSize: 24, fontWeight: '900', marginTop: -2 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 20, paddingHorizontal: 2 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16c783', opacity: .65 },

  queueHero: { alignItems: 'center', paddingVertical: 22, paddingHorizontal: 8 },
  queueCheck: { width: 68, height: 68, borderRadius: 34, backgroundColor: themeColor('#e7f7ee', '#123027'), borderWidth: 1, borderColor: themeColor('#b9d9ca', '#285746'), alignItems: 'center', justifyContent: 'center' },
  queueCheckText: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 31, fontWeight: '900' },
  queueTitle: { color: themeColor('#14201d', '#fff'), fontSize: 25, fontWeight: '900', marginTop: 15 },
  queueText: { color: themeColor('#5f6c67', '#a9b5b0'), fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  queueCard: { backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#b9d9ca', '#285746'), borderRadius: 18, padding: 17, marginBottom: 15 },
  queueKicker: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 10, fontWeight: '900', letterSpacing: .8 },
  queueCardTitle: { color: themeColor('#14201d', '#fff'), fontSize: 18, fontWeight: '900', marginTop: 12 },
  queueCardText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 12.5, lineHeight: 19, marginTop: 6 },
});