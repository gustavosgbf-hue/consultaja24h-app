import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  carregarAgendamentos,
  carregarHistoricoPaciente,
  carregarPaciente,
  solicitarOtpPaciente,
  verificarOtpPaciente,
} from './src/api/client';
import {
  clearSessionToken,
  getSessionToken,
  saveSessionToken,
} from './src/auth/session';
import type { Agendamento, AtendimentoHistorico, Paciente } from './src/types';

const URL_CONSULTA = 'https://consultaja24h.com.br/consulta/';
const URL_RENOVACAO = 'https://consultaja24h.com.br/renovacao-de-receita';
const URL_ESPECIALISTAS = 'https://consultaja24h.com.br/especialistas';

function formatarTelefone(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function formatarCpf(valor: string) {
  const n = valor.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
  if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
}

function formatarData(data?: string | null) {
  if (!data) return '';
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
}

function resumirTexto(texto?: string | null, limite = 120) {
  const limpo = String(texto || '').replace(/\s+/g, ' ').trim();
  if (!limpo) return 'Registro clínico disponível neste atendimento.';
  return limpo.length > limite ? `${limpo.slice(0, limite).trim()}…` : limpo;
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
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [codigo, setCodigo] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [emailMascarado, setEmailMascarado] = useState('');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [historico, setHistorico] = useState<AtendimentoHistorico[]>([]);
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
      const [me, agenda, history] = await Promise.all([
        carregarPaciente(),
        carregarAgendamentos(),
        carregarHistoricoPaciente().catch(() => ({ ok: true, atendimentos: [] })),
      ]);
      setPaciente(me.paciente);
      setAgendamentos(agenda.agendamentos || []);
      setHistorico(history.atendimentos || []);
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
    const numeros = telefone.replace(/\D/g, '');
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
    const numeros = telefone.replace(/\D/g, '');
    const cpfNumeros = cpf.replace(/\D/g, '');
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
    const numeros = codigo.replace(/\D/g, '');
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
        telefone.replace(/\D/g, ''),
        email.trim() || undefined,
        cpf.replace(/\D/g, '') || undefined,
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
                  <TextInput
                    value={telefone}
                    onChangeText={(valor) => setTelefone(formatarTelefone(valor))}
                    placeholder="(98) 99999-9999"
                    placeholderTextColor="#94a09c"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    style={[styles.input, styles.phoneInput]}
                    maxLength={15}
                  />
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
              <TextInput value={codigo} onChangeText={(valor) => setCodigo(valor.replace(/\D/g, '').slice(0, 6))} placeholder="000000" placeholderTextColor="#aeb8b4" keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" style={[styles.input, styles.codeInput]} maxLength={6} />
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

  return (
    <PacienteHome
      paciente={paciente}
      agendamentos={agendamentos}
      historico={historico}
      loading={homeLoading}
      mostrarTudo={mostrarHistoricoCompleto}
      onMostrarTudo={() => setMostrarHistoricoCompleto((valor) => !valor)}
      onAtualizar={carregarHome}
      onSair={sair}
    />
  );
}

function PacienteHome({
  paciente,
  agendamentos,
  historico,
  loading,
  mostrarTudo,
  onMostrarTudo,
  onAtualizar,
  onSair,
}: {
  paciente: Paciente;
  agendamentos: Agendamento[];
  historico: AtendimentoHistorico[];
  loading: boolean;
  mostrarTudo: boolean;
  onMostrarTudo: () => void;
  onAtualizar: () => void;
  onSair: () => void;
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
          <Pressable onPress={onSair} style={styles.avatarButton} accessibilityLabel="Sair da conta">
            <Text style={styles.avatarText}>{primeiroNome.slice(0, 1).toUpperCase()}</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.heroEyebrow}>ATENDIMENTO MÉDICO</Text></View>
          <Text style={styles.heroTitle}>Fale com um médico online</Text>
          <Text style={styles.heroText}>Inicie seu atendimento pela ConsultaJá24h e continue com seus dados já vinculados.</Text>
          <Pressable style={styles.heroButton} onPress={() => abrirLink(URL_CONSULTA)}>
            <Text style={styles.heroButtonText}>Consultar agora</Text><Text style={styles.heroArrow}>→</Text>
          </Pressable>
        </View>

        <View style={styles.quickGrid}>
          <QuickAction label="Renovar receita" detail="Solicitar avaliação" symbol="Rx" onPress={() => abrirLink(URL_RENOVACAO)} featured />
          <QuickAction label="Especialistas" detail="Escolher profissional" symbol="+" onPress={() => abrirLink(URL_ESPECIALISTAS)} />
        </View>

        {ultimo && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Último atendimento</Text>
              {loading && <ActivityIndicator size="small" color="#16c783" />}
            </View>
            <View style={styles.lastVisitCard}>
              <View style={styles.lastVisitTop}>
                <View style={styles.visitIcon}><Text style={styles.visitIconText}>+</Text></View>
                <View style={styles.lastVisitHeading}>
                  <Text style={styles.lastVisitDate}>{formatarData(ultimo.data_atendimento)}</Text>
                  <Text style={styles.lastVisitDoctor}>{ultimo.profissional_nome}</Text>
                </View>
                <View style={styles.statusPill}><Text style={styles.statusPillText}>Registrado</Text></View>
              </View>
              <Text style={styles.lastVisitSummary}>{resumirTexto(ultimo.resumo, 150)}</Text>
            </View>
          </>
        )}

        {proximos.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Próximos atendimentos</Text>
            {proximos.map((item) => (
              <View key={`agenda-${item.id}`} style={styles.appointmentCard}>
                <Text style={styles.appointmentName}>{item.profissional_nome || item.psicologo_nome || 'Profissional'}</Text>
                <Text style={styles.appointmentMeta}>{new Date(item.horario_agendado).toLocaleString('pt-BR')}</Text>
                <Text style={styles.appointmentStatus}>{item.pagamento_status || item.status || 'agendado'}</Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meu histórico</Text>
          <Pressable onPress={onAtualizar} disabled={loading}><Text style={styles.refreshText}>{loading ? 'Atualizando…' : 'Atualizar'}</Text></Pressable>
        </View>

        {historico.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Seu histórico aparecerá aqui</Text>
            <Text style={styles.emptyText}>Os atendimentos vinculados ao seu celular e CPF serão organizados nesta área.</Text>
          </View>
        ) : (
          <>
            {itensHistorico.map((item, index) => (
              <View key={`hist-${item.id}-${index}`} style={styles.historyCard}>
                <View style={styles.historyLine} />
                <View style={styles.historyContent}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyDate}>{formatarData(item.data_atendimento)}</Text>
                    <Text style={styles.historyType}>{String(item.tipo || 'consulta').replace(/_/g, ' ')}</Text>
                  </View>
                  <Text style={styles.historyDoctor}>{item.profissional_nome}</Text>
                  <Text style={styles.historySummary}>{resumirTexto(item.resumo)}</Text>
                </View>
              </View>
            ))}
            {historico.length > 4 && (
              <Pressable style={styles.showMoreButton} onPress={onMostrarTudo}>
                <Text style={styles.showMoreText}>{mostrarTudo ? 'Mostrar menos' : `Ver todos os ${historico.length} atendimentos`}</Text>
              </Pressable>
            )}
          </>
        )}

        <Pressable style={styles.documentsCard} onPress={() => Alert.alert('Meus documentos', 'Receitas, atestados e outros documentos vinculados aos atendimentos serão reunidos aqui na próxima etapa do app.')}>
          <View>
            <Text style={styles.documentsTitle}>Meus documentos</Text>
            <Text style={styles.documentsText}>Receitas, atestados e arquivos clínicos</Text>
          </View>
          <Text style={styles.documentsArrow}>›</Text>
        </Pressable>

        <Text style={styles.footerText}>ConsultaJá24h · Seus dados clínicos permanecem vinculados à sua identidade de paciente.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ label, detail, symbol, onPress, featured = false }: { label: string; detail: string; symbol: string; onPress: () => void; featured?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.quickCard, featured && styles.quickCardFeatured]}>
      <View style={[styles.quickSymbol, featured && styles.quickSymbolFeatured]}><Text style={[styles.quickSymbolText, featured && styles.quickSymbolTextFeatured]}>{symbol}</Text></View>
      <Text style={styles.quickLabel}>{label}</Text>
      <Text style={styles.quickDetail}>{detail}</Text>
    </Pressable>
  );
}

function Badge({ text }: { text: string }) {
  return <View style={styles.badge}><Text style={styles.badgeText}>{text}</Text></View>;
}

function PrimaryButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={loading} style={[styles.primaryButton, loading && styles.buttonLoading]}>
      {loading ? <ActivityIndicator color="#07100f" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#07100f' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07100f' },
  loginWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 22 },
  brandBlock: { marginBottom: 22 },
  brand: { color: '#ffffff', fontSize: 34, fontWeight: '700', letterSpacing: -1.2 },
  subtitle: { color: '#8a97a6', marginTop: 6, fontSize: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 22 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#eafaf3', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 14 },
  badgeText: { color: '#0b8f61', fontSize: 10, fontWeight: '800', letterSpacing: 0.9 },
  cardTitle: { color: '#14201d', fontWeight: '800', fontSize: 25, letterSpacing: -0.5 },
  cardSubtitle: { color: '#66736e', marginTop: 7, marginBottom: 20, lineHeight: 21 },
  inputLabel: { color: '#25322e', fontSize: 13, fontWeight: '700', marginBottom: 7 },
  input: { backgroundColor: '#f7fbf8', borderWidth: 1, borderColor: '#dfe9e3', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 15, marginBottom: 12, color: '#14201d', fontSize: 17 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  countryBox: { minWidth: 58, height: 54, borderWidth: 1, borderColor: '#dfe9e3', borderRadius: 14, backgroundColor: '#eef7f1', alignItems: 'center', justifyContent: 'center' },
  countryText: { color: '#25322e', fontSize: 16, fontWeight: '700' },
  phoneInput: { flex: 1, height: 54 },
  codeInput: { textAlign: 'center', fontSize: 28, fontWeight: '800', letterSpacing: 10, paddingLeft: 24 },
  primaryButton: { minHeight: 52, backgroundColor: '#16c783', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonLoading: { opacity: 0.75 },
  primaryButtonText: { color: '#07100f', fontSize: 16, fontWeight: '800' },
  privacyText: { color: '#84908c', fontSize: 11.5, lineHeight: 17, marginTop: 14 },
  helperText: { color: '#8a97a6', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 16, paddingHorizontal: 16 },
  secondaryActions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  singleSecondary: { alignItems: 'center', marginTop: 18 },
  secondaryActionText: { color: '#0b8f61', fontSize: 13, fontWeight: '700' },
  actionDivider: { width: 1, height: 14, backgroundColor: '#dfe9e3', marginHorizontal: 13 },

  home: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 52 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  kicker: { color: '#16c783', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  greeting: { color: '#ffffff', fontSize: 30, fontWeight: '800', marginTop: 4, letterSpacing: -0.8 },
  homeSubtitle: { color: '#8a97a6', fontSize: 14, marginTop: 4 },
  avatarButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#10201d', borderWidth: 1, borderColor: '#1f3a33', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#78f25f', fontWeight: '800', fontSize: 16 },

  heroCard: { backgroundColor: '#0f231e', borderWidth: 1, borderColor: '#1f4037', borderRadius: 24, padding: 22, marginBottom: 14 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#78f25f' },
  heroEyebrow: { color: '#78f25f', fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { color: '#ffffff', fontSize: 27, fontWeight: '800', lineHeight: 32, marginTop: 11, letterSpacing: -0.6 },
  heroText: { color: '#a9b5b0', fontSize: 14, lineHeight: 21, marginTop: 8 },
  heroButton: { minHeight: 54, backgroundColor: '#16c783', borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 19 },
  heroButtonText: { color: '#07100f', fontSize: 16, fontWeight: '900' },
  heroArrow: { color: '#07100f', fontSize: 21, fontWeight: '700', marginLeft: 8, marginTop: -1 },

  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  quickCard: { flex: 1, minHeight: 126, backgroundColor: '#0b1715', borderWidth: 1, borderColor: '#1d342f', borderRadius: 19, padding: 15 },
  quickCardFeatured: { borderColor: '#31583d', backgroundColor: '#0d1c17' },
  quickSymbol: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#12231f', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  quickSymbolFeatured: { backgroundColor: '#19351f' },
  quickSymbolText: { color: '#a9b5b0', fontSize: 15, fontWeight: '800' },
  quickSymbolTextFeatured: { color: '#78f25f' },
  quickLabel: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  quickDetail: { color: '#7f8d88', fontSize: 11.5, lineHeight: 16, marginTop: 4 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, marginBottom: 12 },
  sectionTitle: { color: '#ffffff', fontSize: 19, fontWeight: '800', letterSpacing: -0.3, marginBottom: 12 },
  refreshText: { color: '#16c783', fontSize: 12, fontWeight: '700', marginBottom: 12 },

  lastVisitCard: { borderWidth: 1, borderColor: '#203a34', backgroundColor: '#0b1715', borderRadius: 20, padding: 17, marginBottom: 27 },
  lastVisitTop: { flexDirection: 'row', alignItems: 'center' },
  visitIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#102b22', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  visitIconText: { color: '#78f25f', fontSize: 22, fontWeight: '500', marginTop: -2 },
  lastVisitHeading: { flex: 1 },
  lastVisitDate: { color: '#8a97a6', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  lastVisitDoctor: { color: '#ffffff', fontSize: 15, fontWeight: '800', marginTop: 2 },
  statusPill: { backgroundColor: '#102b22', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusPillText: { color: '#69db9b', fontSize: 9.5, fontWeight: '800' },
  lastVisitSummary: { color: '#a9b5b0', fontSize: 13, lineHeight: 19, marginTop: 14 },

  emptyCard: { borderWidth: 1, borderColor: '#1d342f', backgroundColor: '#0b1715', borderRadius: 18, padding: 18, marginBottom: 20 },
  emptyTitle: { color: '#ffffff', fontWeight: '800' },
  emptyText: { color: '#8a97a6', marginTop: 5, lineHeight: 19, fontSize: 13 },
  appointmentCard: { borderWidth: 1, borderColor: '#1d342f', backgroundColor: '#0b1715', borderRadius: 16, padding: 17, marginBottom: 10 },
  appointmentName: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  appointmentMeta: { color: '#a9b5b0', marginTop: 5 },
  appointmentStatus: { color: '#16c783', marginTop: 7, fontWeight: '700', textTransform: 'capitalize' },

  historyCard: { flexDirection: 'row', borderWidth: 1, borderColor: '#1b312c', backgroundColor: '#091411', borderRadius: 17, overflow: 'hidden', marginBottom: 9 },
  historyLine: { width: 3, backgroundColor: '#16c783' },
  historyContent: { flex: 1, padding: 15 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyDate: { color: '#8a97a6', fontSize: 11, fontWeight: '700' },
  historyType: { color: '#67d99b', fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },
  historyDoctor: { color: '#ffffff', fontSize: 14.5, fontWeight: '800', marginTop: 6 },
  historySummary: { color: '#8f9d98', fontSize: 12.5, lineHeight: 18, marginTop: 6 },
  showMoreButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 4, marginBottom: 20 },
  showMoreText: { color: '#16c783', fontSize: 12.5, fontWeight: '800' },

  documentsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#1d342f', backgroundColor: '#0b1715', borderRadius: 18, padding: 17, marginTop: 12 },
  documentsTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  documentsText: { color: '#7f8d88', fontSize: 11.5, marginTop: 4 },
  documentsArrow: { color: '#16c783', fontSize: 28, fontWeight: '300' },
  footerText: { color: '#52605c', fontSize: 10.5, lineHeight: 16, textAlign: 'center', marginTop: 28, paddingHorizontal: 15 },
});
