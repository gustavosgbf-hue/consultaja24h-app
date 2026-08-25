import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DynamicColorIOS,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
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
  conversarTriagem,
  iniciarAtendimentoBeta,
  solicitarOtpPaciente,
  verificarOtpPaciente,
  type TriageMessage,
} from './src/api/client';
import {
  clearSessionToken,
  getSessionToken,
  saveSessionToken,
} from './src/auth/session';
import PagamentoConsulta from './src/components/PagamentoConsulta';
import ChatPaciente from './src/components/ChatPaciente';
import ThemeToggle from './src/components/ThemeToggle';
import type { Agendamento, AtendimentoHistorico, DocumentoPaciente, Paciente } from './src/types';

const URL_RENOVACAO = 'https://consultaja24h.com.br/renovacao-de-receita';
const URL_ESPECIALISTAS = 'https://consultaja24h.com.br/especialistas';

const PERGUNTA_DOCUMENTO = 'Você precisa de atestado, receita, declaração ou outro documento nesta consulta?';
const BETA_TEST_PHONE = '98991344646';

const SYSTEM_TRIAGE = `Você é o assistente de triagem do ConsultaJá24h para uma consulta médica por chat.
O paciente já informou a queixa inicial. NÃO peça nome, telefone ou CPF.
Conduza uma anamnese breve, em português brasileiro, com UMA pergunta por vez.
Faça NO MÁXIMO 3 perguntas clínicas adicionais, priorizando somente o que muda a segurança e a condução: tempo de evolução, intensidade, febre, sintomas associados, sinais de alarme, alergias, doenças crônicas, medicamentos em uso e possibilidade de gestação quando pertinente.
Depois das perguntas clínicas e ANTES de concluir, pergunte obrigatoriamente, em uma pergunta separada, se o paciente precisa de atestado, receita, declaração ou outro documento nesta consulta.
Não faça diagnóstico, não prescreva, não prometa atestado e não substitua o médico.
Se houver um sinal de alarme importante, deixe isso claro sem alarmismo e ainda finalize o resumo para o médico.
Depois que a solicitação de documento tiver sido respondida, NÃO faça outra pergunta. Responda exatamente começando por TRIAGEM_CONCLUIDA: e depois gere um resumo clínico objetivo com: Queixa principal; Tempo/evolução; Intensidade/febre; Sintomas associados; Alergias; Comorbidades; Medicações em uso; Sinais de alarme; Solicitação/observações.
Nunca use o prefixo TRIAGEM_CONCLUIDA: antes de ter feito pelo menos uma pergunta clínica adicional e antes de o paciente responder sobre atestado/receita/declaração/outro documento.`;

type Tela = 'home' | 'perfil' | 'nova-consulta' | 'documentos' | 'historico-chat';
type AtendimentoPara = 'mim' | 'outra-pessoa';
type EtapaConsulta = 'dados' | 'pagamento' | 'triagem' | 'fila';

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
  return `***.${n.slice(3, 6)}.${n.slice(6, 9)}-**`;
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
  const [historicoSelecionado, setHistoricoSelecionado] = useState<AtendimentoHistorico | null>(null);
  const [historicoOrigem, setHistoricoOrigem] = useState<'home' | 'documentos'>('home');
  const [mostrarHistoricoCompleto, setMostrarHistoricoCompleto] = useState(false);

  useEffect(() => {
    restaurarSessao();
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
    try {
      const [me, agenda, history, docs] = await Promise.all([
        carregarPaciente(),
        carregarAgendamentos(),
        carregarHistoricoPaciente().catch(() => ({ ok: true, atendimentos: [] })),
        carregarDocumentosPaciente().catch(() => ({ ok: true, documentos: [] })),
      ]);
      setPaciente(me.paciente);
      setAgendamentos(agenda.agendamentos || []);
      setHistorico(history.atendimentos || []);
      setDocumentos(docs.documentos || []);
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
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#16c783" />
      </SafeAreaView>
    );
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
    return <NovaConsulta paciente={paciente} onVoltar={() => setTela('home')} />;
  }

  if (tela === 'documentos') {
    return <DocumentosPaciente documentos={documentos} onVoltar={() => setTela('home')} onAbrirConsulta={(id) => {
      const item = historico.find((h) => h.id === id) || null;
      if (item) { setHistoricoOrigem('documentos'); setHistoricoSelecionado(item); setTela('historico-chat'); }
    }} />;
  }

  if (tela === 'historico-chat' && historicoSelecionado) {
    return (
      <ChatPaciente
        atendimentoId={historicoSelecionado.id}
        medicoNome={historicoSelecionado.medico_nome || historicoSelecionado.profissional_nome}
        somenteLeitura
        onVoltar={() => { setTela(historicoOrigem === 'documentos' ? 'documentos' : 'home'); setHistoricoSelecionado(null); }}
      />
    );
  }

  return (
    <PacienteHome
      paciente={paciente}
      agendamentos={agendamentos}
      historico={historico}
      documentos={documentos}
      loading={homeLoading}
      mostrarTudo={mostrarHistoricoCompleto}
      onMostrarTudo={() => setMostrarHistoricoCompleto((valor) => !valor)}
      onAtualizar={carregarHome}
      onPerfil={() => setTela('perfil')}
      onNovaConsulta={() => setTela('nova-consulta')}
      onDocumentos={() => setTela('documentos')}
      onAbrirAtendimento={(item) => { setHistoricoOrigem('home'); setHistoricoSelecionado(item); setTela('historico-chat'); }}
    />
  );
}

function PacienteHome({ paciente, agendamentos, historico, documentos, loading, mostrarTudo, onMostrarTudo, onAtualizar, onPerfil, onNovaConsulta, onDocumentos, onAbrirAtendimento }: {
  paciente: Paciente;
  agendamentos: Agendamento[];
  historico: AtendimentoHistorico[];
  documentos: DocumentoPaciente[];
  loading: boolean;
  mostrarTudo: boolean;
  onMostrarTudo: () => void;
  onAtualizar: () => void;
  onPerfil: () => void;
  onNovaConsulta: () => void;
  onDocumentos: () => void;
  onAbrirAtendimento: (item: AtendimentoHistorico) => void;
}) {
  const primeiroNome = paciente.nome?.split(' ')[0] || 'Paciente';
  const ultimo = historico[0];
  const itensHistorico = mostrarTudo ? historico : historico.slice(0, 4);
  const proximos = useMemo(
    () => agendamentos.filter((item) => new Date(item.horario_agendado).getTime() >= Date.now()).slice(0, 2),
    [agendamentos],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.home} showsVerticalScrollIndicator={false}>
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

        <View style={styles.heroCard}>
          <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.heroEyebrow}>MÉDICO ONLINE</Text></View>
          <Text style={styles.heroTitle}>Atendimento por chat, sem precisar sair de casa.</Text>
          <Text style={styles.heroText}>Você paga, faz uma triagem rápida e entra na fila. O atendimento acontecerá pelo próprio app.</Text>
          <Pressable onPress={onNovaConsulta} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Consultar agora</Text></Pressable>
        </View>

        <View style={styles.quickGrid}>
          <QuickCard title="Renovar receita" subtitle="Fluxo já disponível" onPress={() => abrirLink(URL_RENOVACAO)} featured />
          <QuickCard title="Especialistas" subtitle="Escolha o profissional" onPress={() => abrirLink(URL_ESPECIALISTAS)} />
        </View>

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

        <SectionHeader title="Meus atendimentos" action={historico.length > 4 ? (mostrarTudo ? 'Ver menos' : 'Ver todos') : undefined} onAction={onMostrarTudo} />
        {loading && historico.length === 0 ? (
          <ActivityIndicator color="#16c783" style={{ marginVertical: 24 }} />
        ) : itensHistorico.length ? (
          itensHistorico.map((item) => (
            <Pressable key={String(item.id)} onPress={() => onAbrirAtendimento(item)} style={styles.historyCard}>
              <View style={styles.historyLine}><View style={styles.timelineDot} /><View style={styles.historyBody}>
                <Text style={styles.historyTitle}>{item.medico_nome || 'Atendimento médico'}</Text>
                <Text style={styles.historyMeta}>{formatarData(item.criado_em)} · {item.tipo || 'chat'}</Text>
                <Text style={styles.historyText}>{resumirTexto(item.triagem, 105)}</Text>
                <Text style={styles.historyOpen}>Abrir conversa ›</Text>
              </View></View>
            </Pressable>
          ))
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
          <View style={{ flex: 1 }}><Text style={styles.docsTitle}>Meus documentos</Text><Text style={styles.docsText}>{documentos.length ? `${documentos.length} documento${documentos.length === 1 ? '' : 's'} disponível${documentos.length === 1 ? '' : 'is'}` : 'Receitas, atestados e pedidos ficarão reunidos aqui.'}</Text></View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable onPress={onAtualizar} style={styles.refreshButton}><Text style={styles.refreshText}>Atualizar dados</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function DocumentosPaciente({ documentos, onVoltar, onAbrirConsulta }: {
  documentos: DocumentoPaciente[];
  onVoltar: () => void;
  onAbrirConsulta: (atendimentoId: number) => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageWrap}>
        <PageHeader title="Meus documentos" onVoltar={onVoltar} />
        <Text style={styles.pageLead}>Documentos recebidos nas suas consultas ficam disponíveis aqui e também dentro da conversa original.</Text>
        {documentos.length ? documentos.map((doc) => (
          <View key={String(doc.id)} style={styles.documentItem}>
            <Pressable onPress={() => abrirLink(doc.arquivo_url)} style={styles.documentMain}>
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
    </SafeAreaView>
  );
}

function Perfil({ paciente, onVoltar, onSair }: { paciente: Paciente; onVoltar: () => void; onSair: () => void }) {
  const primeiroNome = paciente.nome?.split(' ')[0] || 'Paciente';
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageWrap}>
        <PageHeader title="Meu perfil" onVoltar={onVoltar} />
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

        <View style={styles.profileNotice}>
          <Text style={styles.profileNoticeTitle}>Privacidade</Text>
          <Text style={styles.profileNoticeText}>Seus dados clínicos e documentos são vinculados ao paciente, não ao titular do cartão usado no pagamento.</Text>
        </View>

        <Pressable onPress={onSair} style={styles.logoutButton}><Text style={styles.logoutButtonText}>Sair da conta</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function NovaConsulta({ paciente, onVoltar }: { paciente: Paciente; onVoltar: () => void }) {
  const [para, setPara] = useState<AtendimentoPara>('mim');
  const [etapaConsulta, setEtapaConsulta] = useState<EtapaConsulta>('dados');
  const [nomeOutro, setNomeOutro] = useState('');
  const [cpfOutro, setCpfOutro] = useState('');
  const [nascimentoOutro, setNascimentoOutro] = useState('');
  const [queixa, setQueixa] = useState('');
  const [triageMessages, setTriageMessages] = useState<TriageMessage[]>([]);
  const [perguntaAtual, setPerguntaAtual] = useState('');
  const [respostaTriagem, setRespostaTriagem] = useState('');
  const [triagemResumo, setTriagemResumo] = useState('');
  const [triagemLoading, setTriagemLoading] = useState(false);
  const [iniciandoBeta, setIniciandoBeta] = useState(false);
  const [atendimentoPagoId, setAtendimentoPagoId] = useState<number | null>(null);

  const pacienteNomeSelecionado = para === 'outra-pessoa' ? nomeOutro.trim() : paciente.nome;
  const pacienteCpfSelecionado = para === 'outra-pessoa' ? digits(cpfOutro) : digits(paciente.cpf);
  const pacienteNascimentoSelecionado = para === 'outra-pessoa' ? nascimentoOutro.trim() : undefined;
  const telefoneContato = digits(paciente.tel);

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
    } else if (digits(paciente.cpf).length !== 11) {
      Alert.alert('CPF não encontrado', 'Seu cadastro precisa ter um CPF válido antes de iniciar a consulta.');
      return false;
    }
    if (queixa.trim().length < 5) {
      Alert.alert('Conte um pouco mais', 'Descreva brevemente o que está acontecendo.');
      return false;
    }
    return true;
  }

  async function irParaPagamento() {
    if (!validarDados() || iniciandoBeta) return;

    const beta = digits(paciente.tel).slice(-11) === BETA_TEST_PHONE;
    if (!beta) {
      setEtapaConsulta('pagamento');
      return;
    }

    setIniciandoBeta(true);
    try {
      const data = await iniciarAtendimentoBeta({
        nome: pacienteNomeSelecionado,
        cpf: pacienteCpfSelecionado,
        email: paciente.email || undefined,
        dataNascimento: pacienteNascimentoSelecionado,
        atendimentoParaTerceiro: para === 'outra-pessoa',
      });
      if (!data.ok || !data.beta || !data.atendimentoId) {
        throw new Error('Não foi possível iniciar o atendimento beta.');
      }
      await iniciarTriagemAposPagamento(data.atendimentoId);
    } catch (error) {
      Alert.alert(
        'Não foi possível iniciar a consulta',
        error instanceof Error ? error.message : 'Tente novamente em instantes.',
      );
    } finally {
      setIniciandoBeta(false);
    }
  }

  async function iniciarTriagemAposPagamento(atendimentoId: number) {
    setAtendimentoPagoId(atendimentoId);
    const history: TriageMessage[] = [
      { role: 'user', content: `Queixa inicial informada pelo paciente: ${queixa.trim()}` },
    ];
    setTriagemLoading(true);
    setEtapaConsulta('triagem');
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
      setEtapaConsulta('fila');
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
    if (etapaConsulta === 'dados') return onVoltar();
    if (etapaConsulta === 'pagamento') return setEtapaConsulta('dados');
    if (etapaConsulta === 'fila') return onVoltar();
    if (etapaConsulta === 'triagem') {
      Alert.alert('Pagamento já confirmado', 'Conclua a triagem para seguir ao atendimento.');
    }
  }

  if (etapaConsulta === 'pagamento') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.pageWrap} keyboardShouldPersistTaps="handled">
          <PageHeader title="Pagamento" onVoltar={voltarEtapa} />
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
      </SafeAreaView>
    );
  }

  if (etapaConsulta === 'triagem') {
    const respostasPaciente = triageMessages.filter((m) => m.role === 'user').slice(1);
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.pageWrapFlex}>
            <PageHeader title="Triagem" onVoltar={voltarEtapa} />
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
                multiline
                editable={!triagemLoading && !!perguntaAtual}
                maxLength={700}
              />
              <Pressable onPress={enviarRespostaTriagem} disabled={triagemLoading || !respostaTriagem.trim()} style={[styles.sendButton, (triagemLoading || !respostaTriagem.trim()) && styles.sendButtonDisabled]}>
                {triagemLoading ? <ActivityIndicator color="#07100f" /> : <Text style={styles.sendButtonText}>↑</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (etapaConsulta === 'fila') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.pageWrap}>
          <PageHeader title="Atendimento" onVoltar={onVoltar} />
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageWrap} keyboardShouldPersistTaps="handled">
        <PageHeader title="Nova consulta" onVoltar={voltarEtapa} />
        <Text style={styles.pageLead}>Vamos começar identificando quem será atendido.</Text>

        <View style={styles.choiceRow}>
          <ChoiceCard active={para === 'mim'} title="Para mim" subtitle={paciente.nome?.split(' ')[0] || 'Paciente'} onPress={() => setPara('mim')} />
          <ChoiceCard active={para === 'outra-pessoa'} title="Outra pessoa" subtitle="Filho, familiar etc." onPress={() => setPara('outra-pessoa')} />
        </View>

        {para === 'mim' ? (
          <View style={styles.identityCard}>
            <Text style={styles.identityKicker}>PACIENTE</Text>
            <Text style={styles.identityName}>{paciente.nome}</Text>
            <Text style={styles.identityMeta}>{mascararCpf(paciente.cpf)} · {mascararTelefone(paciente.tel)}</Text>
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.inputLabelDark}>Nome completo do paciente</Text>
            <TextInput value={nomeOutro} onChangeText={setNomeOutro} placeholder="Nome e sobrenome" placeholderTextColor="#66736e" style={styles.darkInput} autoCapitalize="words" />
            <Text style={styles.inputLabelDark}>CPF</Text>
            <TextInput value={cpfOutro} onChangeText={(v) => setCpfOutro(formatarCpf(v))} placeholder="000.000.000-00" placeholderTextColor="#66736e" style={styles.darkInput} keyboardType="number-pad" maxLength={14} />
            <Text style={styles.inputLabelDark}>Data de nascimento</Text>
            <TextInput value={nascimentoOutro} onChangeText={setNascimentoOutro} placeholder="DD/MM/AAAA" placeholderTextColor="#66736e" style={styles.darkInput} keyboardType="numbers-and-punctuation" maxLength={10} />
          </View>
        )}

        <Text style={styles.formSectionTitle}>O que está acontecendo?</Text>
        <TextInput
          value={queixa}
          onChangeText={setQueixa}
          placeholder="Ex.: dor de garganta, febre desde ontem, dor abdominal..."
          placeholderTextColor="#66736e"
          style={[styles.darkInput, styles.textArea]}
          multiline
          textAlignVertical="top"
          maxLength={1200}
        />
        <Text style={styles.counter}>{queixa.length}/1200</Text>

        <View style={styles.flowPreview}>
          <Text style={styles.flowPreviewTitle}>Como vai funcionar</Text>
          <FlowRow number="1" title="Pagamento" text="Finalize por PIX ou cartão." />
          <FlowRow number="2" title="Triagem rápida" text="Perguntas objetivas depois da confirmação do pagamento." />
          <FlowRow number="3" title="Chat com o médico" text="Atendimento por mensagem pelo próprio app." last />
        </View>

        <PrimaryButton label="Continuar para pagamento" loading={iniciandoBeta} onPress={irParaPagamento} />
      </ScrollView>
    </SafeAreaView>
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

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

function Badge({ text }: { text: string }) {
  return <View style={styles.badge}><Text style={styles.badgeText}>{text}</Text></View>;
}

function PrimaryButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} disabled={loading} style={[styles.primaryButton, loading && styles.buttonLoading]}>{loading ? <ActivityIndicator color="#07100f" /> : <Text style={styles.primaryButtonText}>{label}</Text>}</Pressable>;
}

function QuickCard({ title, subtitle, onPress, featured }: { title: string; subtitle: string; onPress: () => void; featured?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.quickCard, featured && styles.quickCardFeatured]}><Text style={[styles.quickTitle, featured && styles.quickTitleFeatured]}>{title}</Text><Text style={styles.quickSubtitle}>{subtitle}</Text><Text style={styles.quickArrow}>→</Text></Pressable>;
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action ? <Pressable onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}</View>;
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: themeColor('#f6f8f7', '#07100f') },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#f6f8f7', '#07100f') },
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
  buttonLoading: { opacity: .75 },
  primaryButtonText: { color: '#07100f', fontSize: 16, fontWeight: '800' },
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
  greeting: { color: themeColor('#14201d', '#fff'), fontSize: 30, fontWeight: '800', marginTop: 3, letterSpacing: -.6 },
  homeSubtitle: { color: themeColor('#66736e', '#8a97a6'), fontSize: 14, marginTop: 4 },
  avatarButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: themeColor('#eef7f1', '#10201d'), borderWidth: 1, borderColor: themeColor('#c6ddd2', '#275044'), alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 17, fontWeight: '800' },
  heroCard: { backgroundColor: themeColor('#eef7f1', '#10201d'), borderWidth: 1, borderColor: themeColor('#cbe2d7', '#21483c'), borderRadius: 24, padding: 22, marginBottom: 14 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#78f25f' },
  heroEyebrow: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
  heroTitle: { color: themeColor('#14201d', '#fff'), fontSize: 25, fontWeight: '800', lineHeight: 31, marginTop: 10, letterSpacing: -.35 },
  heroText: { color: themeColor('#5f6c67', '#a9b5b0'), lineHeight: 21, marginTop: 9, marginBottom: 14 },
  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  quickCard: { flex: 1, minHeight: 116, borderRadius: 18, backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'), padding: 15 },
  quickCardFeatured: { borderColor: '#346342', backgroundColor: '#101d14' },
  quickTitle: { color: themeColor('#14201d', '#fff'), fontSize: 15, fontWeight: '800' },
  quickTitleFeatured: { color: '#dfff9e' },
  quickSubtitle: { color: themeColor('#66736e', '#84908c'), fontSize: 12, lineHeight: 17, marginTop: 5 },
  quickArrow: { color: '#16c783', fontSize: 20, marginTop: 'auto' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 12 },
  sectionTitle: { color: themeColor('#14201d', '#fff'), fontSize: 19, fontWeight: '800' },
  sectionAction: { color: '#16c783', fontSize: 13, fontWeight: '700' },
  lastCard: { backgroundColor: '#f7fbf8', borderRadius: 20, padding: 18, marginBottom: 27 },
  lastTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  datePill: { backgroundColor: '#e5f7eb', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  datePillText: { color: '#18724f', fontSize: 11, fontWeight: '800' },
  statusText: { color: themeColor('#66736e', '#75827e'), fontSize: 11, fontWeight: '700' },
  lastDoctor: { color: '#14201d', fontSize: 17, fontWeight: '800', marginTop: 14 },
  lastSummary: { color: '#596763', lineHeight: 20, marginTop: 6 },
  historyCard: { marginBottom: 9 },
  historyLine: { flexDirection: 'row', backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'), borderRadius: 17, padding: 15 },
  timelineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#16c783', marginTop: 5, marginRight: 12 },
  historyBody: { flex: 1 },
  historyTitle: { color: themeColor('#14201d', '#fff'), fontWeight: '800', fontSize: 15 },
  historyMeta: { color: '#769087', fontSize: 12, marginTop: 4 },
  historyText: { color: themeColor('#596763', '#9ba9a4'), fontSize: 13, lineHeight: 19, marginTop: 8 },
  emptyCard: { borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'), backgroundColor: themeColor('#ffffff', '#0b1715'), borderRadius: 16, padding: 18, marginBottom: 24 },
  emptyTitle: { color: themeColor('#14201d', '#fff'), fontWeight: '700' },
  emptyText: { color: themeColor('#66736e', '#8a97a6'), marginTop: 5, lineHeight: 19 },
  appointmentCard: { borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'), backgroundColor: themeColor('#ffffff', '#0b1715'), borderRadius: 16, padding: 17, marginBottom: 10 },
  appointmentName: { color: themeColor('#14201d', '#fff'), fontWeight: '700', fontSize: 16 },
  appointmentMeta: { color: themeColor('#5f6c67', '#a9b5b0'), marginTop: 5 },
  docsCard: { flexDirection: 'row', gap: 13, alignItems: 'center', backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'), borderRadius: 18, padding: 16, marginTop: 25 },
  docsIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: themeColor('#e7f7ee', '#123027'), alignItems: 'center', justifyContent: 'center' },
  docsIconText: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 25, fontWeight: '400', marginTop: -2 },
  docsGlyph: { width: 18, height: 22, borderWidth: 1.7, borderColor: themeColor('#0b8f61', '#78f25f'), borderRadius: 3, paddingTop: 8, paddingHorizontal: 3 },
  docsGlyphFold: { position: 'absolute', right: -1.7, top: -1.7, width: 7, height: 7, borderLeftWidth: 1.7, borderBottomWidth: 1.7, borderColor: themeColor('#0b8f61', '#78f25f'), backgroundColor: themeColor('#e7f7ee', '#123027'), borderBottomLeftRadius: 2 },
  docsGlyphLine: { height: 1.5, borderRadius: 1, backgroundColor: themeColor('#0b8f61', '#78f25f'), marginBottom: 3 },
  docsGlyphLineShort: { width: '65%' },
  docsTitle: { color: themeColor('#14201d', '#fff'), fontSize: 15, fontWeight: '800' },
  openHistoryHint: { marginTop: 12, color: '#68c99a', fontSize: 12, fontWeight: '700' },
  historyOpen: { marginTop: 7, color: '#67bd94', fontSize: 11, fontWeight: '700' },
  documentItem: { backgroundColor: themeColor('#ffffff', '#0d1916'), borderWidth: 1, borderColor: themeColor('#dfe7e2', '#1b2b26'), borderRadius: 18, marginBottom: 12, overflow: 'hidden' },
  documentMain: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  documentPdf: { width: 44, height: 50, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#eef4f1', '#14231f'), borderWidth: 1, borderColor: '#28463b' },
  documentPdfText: { color: '#91b4a6', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  documentInfo: { flex: 1, minWidth: 0 },
  documentName: { color: themeColor('#14201d', '#eef5f1'), fontSize: 14, lineHeight: 19, fontWeight: '800' },
  documentMeta: { color: themeColor('#66736e', '#76867f'), fontSize: 11, marginTop: 4 },
  documentConsultButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: themeColor('#e0e8e4', '#192823') },
  documentConsultText: { color: '#69c99a', fontSize: 12, fontWeight: '800' },
  docsText: { color: themeColor('#66736e', '#84908c'), fontSize: 12, lineHeight: 17, marginTop: 3 },
  chevron: { color: '#66736e', fontSize: 27 },
  refreshButton: { alignItems: 'center', marginTop: 22, paddingVertical: 12 },
  refreshText: { color: themeColor('#66736e', '#71807b'), fontWeight: '700', fontSize: 13 },

  pageWrap: { padding: 20, paddingBottom: 50 },
  pageWrapFlex: { flex: 1, padding: 20, paddingBottom: 14 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'), alignItems: 'center', justifyContent: 'center' },
  backText: { color: themeColor('#14201d', '#fff'), fontSize: 30, lineHeight: 32, marginTop: -3 },
  pageTitle: { color: themeColor('#14201d', '#fff'), fontSize: 20, fontWeight: '800' },
  pageLead: { color: themeColor('#5f6c67', '#a9b5b0'), lineHeight: 21, marginTop: -7, marginBottom: 18 },
  profileHero: { alignItems: 'center', marginBottom: 22 },
  profileAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: themeColor('#eef7f1', '#10201d'), borderWidth: 1, borderColor: themeColor('#c6ddd2', '#275044'), alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 27, fontWeight: '800' },
  profileName: { color: themeColor('#14201d', '#fff'), fontSize: 22, fontWeight: '800', marginTop: 13, textAlign: 'center' },
  profileHint: { color: themeColor('#66736e', '#8a97a6'), fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5, maxWidth: 290 },
  profileCard: { backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'), borderRadius: 18, paddingHorizontal: 17 },
  infoRow: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: themeColor('#dce6e1', '#1d342f') },
  infoLabel: { color: themeColor('#66736e', '#71807b'), fontSize: 11, fontWeight: '800', letterSpacing: .6, textTransform: 'uppercase' },
  infoValue: { color: themeColor('#14201d', '#fff'), fontSize: 15, fontWeight: '700', marginTop: 5 },
  profileNotice: { backgroundColor: themeColor('#eef7f1', '#10201d'), borderRadius: 16, padding: 16, marginTop: 14 },
  profileNoticeTitle: { color: themeColor('#0b8f61', '#78f25f'), fontWeight: '800', fontSize: 13 },
  profileNoticeText: { color: themeColor('#5f6c67', '#a9b5b0'), lineHeight: 19, fontSize: 12.5, marginTop: 6 },
  logoutButton: { borderWidth: 1, borderColor: '#603438', backgroundColor: '#1a1112', borderRadius: 15, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  logoutButtonText: { color: '#ff9ca5', fontSize: 14, fontWeight: '800' },

  choiceRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  choiceCard: { flex: 1, minHeight: 120, borderRadius: 18, backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'), padding: 15 },
  choiceCardActive: { borderColor: '#16c783', backgroundColor: themeColor('#eef7f1', '#0f211c') },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#50605a', alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  radioActive: { borderColor: '#16c783' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16c783' },
  choiceTitle: { color: themeColor('#14201d', '#fff'), fontSize: 15, fontWeight: '800' },
  choiceSubtitle: { color: themeColor('#66736e', '#84908c'), fontSize: 12, lineHeight: 17, marginTop: 5 },
  identityCard: { backgroundColor: '#f7fbf8', borderRadius: 18, padding: 17, marginBottom: 22 },
  identityKicker: { color: '#18724f', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  identityName: { color: '#14201d', fontSize: 18, fontWeight: '800', marginTop: 8 },
  identityMeta: { color: '#66736e', fontSize: 12.5, marginTop: 4 },
  formCard: { backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'), borderRadius: 18, padding: 16, marginBottom: 22 },
  inputLabelDark: { color: '#d6dfdb', fontSize: 12.5, fontWeight: '700', marginBottom: 7 },
  darkInput: { backgroundColor: themeColor('#ffffff', '#101d1a'), borderWidth: 1, borderColor: themeColor('#d8e3dd', '#223a34'), borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 13, color: themeColor('#14201d', '#fff'), fontSize: 15 },
  formSectionTitle: { color: themeColor('#14201d', '#fff'), fontSize: 18, fontWeight: '800', marginBottom: 10 },
  textArea: { minHeight: 128, paddingTop: 14 },
  counter: { color: '#64736e', fontSize: 11, textAlign: 'right', marginTop: -7, marginBottom: 20 },
  flowPreview: { backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'), borderRadius: 18, padding: 16, marginBottom: 17 },
  flowPreviewTitle: { color: themeColor('#14201d', '#fff'), fontSize: 15, fontWeight: '800', marginBottom: 5 },
  flowRow: { flexDirection: 'row', gap: 12, borderBottomWidth: 1, borderBottomColor: themeColor('#dce6e1', '#1d342f'), paddingVertical: 13 },
  flowNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: themeColor('#e7f7ee', '#123027'), alignItems: 'center', justifyContent: 'center' },
  flowNumberText: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 12, fontWeight: '900' },
  flowTitle: { color: themeColor('#14201d', '#fff'), fontSize: 13.5, fontWeight: '800' },
  flowText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 12, lineHeight: 17, marginTop: 3 },

  paidBadge: { alignSelf: 'flex-start', backgroundColor: themeColor('#e7f7ee', '#123027'), borderWidth: 1, borderColor: themeColor('#b9d9ca', '#285746'), borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginTop: -8, marginBottom: 12 },
  paidBadgeText: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 9.5, fontWeight: '900', letterSpacing: .7 },
  triageProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  triageProgressText: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 10.5, fontWeight: '900', letterSpacing: .8 },
  triageChat: { flex: 1, marginTop: 2 },
  triageChatContent: { paddingBottom: 18, gap: 11 },
  patientBubble: { alignSelf: 'stretch', backgroundColor: themeColor('#eef7f1', '#10201d'), borderWidth: 1, borderColor: themeColor('#cbe2d7', '#21483c'), borderRadius: 17, padding: 15 },
  patientBubbleLabel: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 9.5, fontWeight: '900', letterSpacing: .8, marginBottom: 6 },
  patientBubbleText: { color: themeColor('#26332f', '#dce6e2'), lineHeight: 20, fontSize: 14 },
  aiBubble: { alignSelf: 'flex-start', maxWidth: '88%', backgroundColor: '#f7fbf8', borderRadius: 17, borderBottomLeftRadius: 5, padding: 14 },
  aiBubbleLabel: { color: '#18724f', fontSize: 9.5, fontWeight: '900', letterSpacing: .8, marginBottom: 5 },
  aiBubbleText: { color: '#26332f', lineHeight: 20, fontSize: 14 },
  userBubble: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: '#16c783', borderRadius: 17, borderBottomRightRadius: 5, paddingHorizontal: 14, paddingVertical: 11 },
  userBubbleText: { color: '#07100f', lineHeight: 19, fontSize: 14, fontWeight: '600' },
  triageComposer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, borderTopWidth: 1, borderTopColor: themeColor('#dce6e1', '#1d342f'), paddingTop: 12 },
  triageInput: { flex: 1, minHeight: 50, maxHeight: 105, backgroundColor: themeColor('#ffffff', '#101d1a'), borderWidth: 1, borderColor: themeColor('#d8e3dd', '#223a34'), borderRadius: 15, paddingHorizontal: 14, paddingVertical: 13, color: themeColor('#14201d', '#fff'), fontSize: 15 },
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