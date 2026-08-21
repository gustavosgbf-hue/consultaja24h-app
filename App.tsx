import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  carregarAgendamentos,
  carregarPaciente,
  solicitarOtpPaciente,
  verificarOtpPaciente,
} from './src/api/client';
import {
  clearSessionToken,
  getSessionToken,
  saveSessionToken,
} from './src/auth/session';
import type { Agendamento, Paciente } from './src/types';

function formatarTelefone(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function formatarCpf(valor: string) {
  const n = valor.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
  if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState<'telefone' | 'dados' | 'codigo'>('telefone');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [codigo, setCodigo] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [emailMascarado, setEmailMascarado] = useState('');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);

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
    const [me, agenda] = await Promise.all([carregarPaciente(), carregarAgendamentos()]);
    setPaciente(me.paciente);
    setAgendamentos(agenda.agendamentos || []);
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
      Alert.alert(
        'Não foi possível continuar',
        error instanceof Error ? error.message : 'Tente novamente em instantes.',
      );
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
      Alert.alert(
        'Não foi possível vincular o cadastro',
        error instanceof Error ? error.message : 'Confira seus dados e tente novamente.',
      );
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
      const agenda = await carregarAgendamentos();
      setAgendamentos(agenda.agendamentos || []);
    } catch (error) {
      Alert.alert(
        'Não foi possível entrar',
        error instanceof Error ? error.message : 'Confira o código e tente novamente.',
      );
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
        <KeyboardAvoidingView
          style={styles.loginWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>ConsultaJá24h</Text>
            <Text style={styles.subtitle}>Sua saúde, no seu tempo.</Text>
          </View>

          {etapa === 'telefone' && (
            <>
              <View style={styles.card}>
                <Badge text="ACESSO DO PACIENTE" />
                <Text style={styles.cardTitle}>Entre com seu celular</Text>
                <Text style={styles.cardSubtitle}>
                  Use o número informado nas suas consultas. Se já houver um cadastro vinculado, enviaremos o código para o e-mail cadastrado.
                </Text>
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
                <Text style={styles.privacyText}>
                  Seu celular é usado para localizar o cadastro do paciente. Dados do pagador não são usados como identidade clínica.
                </Text>
              </View>
              <Text style={styles.helperText}>Primeiro acesso ao app? Confirmaremos seus dados antes de vincular seu histórico.</Text>
            </>
          )}

          {etapa === 'dados' && (
            <View style={styles.card}>
              <Badge text="PRIMEIRO ACESSO" />
              <Text style={styles.cardTitle}>Confirme seus dados</Text>
              <Text style={styles.cardSubtitle}>
                Para vincular este celular com segurança, informe seu CPF e um e-mail para receber o código de acesso.
              </Text>
              <Text style={styles.inputLabel}>CPF do paciente</Text>
              <TextInput
                value={cpf}
                onChangeText={(valor) => setCpf(formatarCpf(valor))}
                placeholder="000.000.000-00"
                placeholderTextColor="#94a09c"
                keyboardType="number-pad"
                style={styles.input}
                maxLength={14}
              />
              <Text style={styles.inputLabel}>E-mail do paciente</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="voce@email.com"
                placeholderTextColor="#94a09c"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                style={styles.input}
              />
              <PrimaryButton label="Enviar código" loading={loading} onPress={enviarDadosPrimeiroAcesso} />
              <Pressable onPress={voltarTelefone} style={styles.singleSecondary}>
                <Text style={styles.secondaryActionText}>Alterar número</Text>
              </Pressable>
            </View>
          )}

          {etapa === 'codigo' && (
            <View style={styles.card}>
              <Badge text="VERIFICAÇÃO" />
              <Text style={styles.cardTitle}>Digite o código</Text>
              <Text style={styles.cardSubtitle}>Enviamos um código de 6 dígitos para {emailMascarado}.</Text>
              <Text style={styles.inputLabel}>Código de acesso</Text>
              <TextInput
                value={codigo}
                onChangeText={(valor) => setCodigo(valor.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor="#aeb8b4"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                style={[styles.input, styles.codeInput]}
                maxLength={6}
              />
              <PrimaryButton label="Entrar" loading={loading} onPress={confirmarCodigo} />
              <View style={styles.secondaryActions}>
                <Pressable onPress={reenviarCodigo} disabled={loading}>
                  <Text style={styles.secondaryActionText}>Reenviar código</Text>
                </Pressable>
                <View style={styles.actionDivider} />
                <Pressable onPress={voltarTelefone}>
                  <Text style={styles.secondaryActionText}>Alterar número</Text>
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const primeiroNome = paciente.nome?.split(' ')[0] || 'Olá';

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        contentContainerStyle={styles.home}
        data={agendamentos}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            <View style={styles.topbar}>
              <View>
                <Text style={styles.kicker}>CONSULTAJÁ24H</Text>
                <Text style={styles.greeting}>Olá, {primeiroNome}</Text>
              </View>
              <Pressable onPress={sair}><Text style={styles.logout}>Sair</Text></Pressable>
            </View>
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>ATENDIMENTO IMEDIATO</Text>
              <Text style={styles.heroTitle}>Precisa falar com um médico agora?</Text>
              <Text style={styles.heroText}>Em breve, você poderá iniciar uma nova consulta diretamente por aqui.</Text>
              <Pressable disabled style={[styles.primaryButton, styles.disabledButton]}>
                <Text style={styles.primaryButtonText}>Consultar agora</Text>
              </Pressable>
            </View>
            <Text style={styles.sectionTitle}>Meus atendimentos</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhum atendimento agendado</Text>
            <Text style={styles.emptyText}>Seus próximos atendimentos aparecerão aqui.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.appointmentCard}>
            <Text style={styles.appointmentName}>{item.profissional_nome || item.psicologo_nome || 'Profissional'}</Text>
            <Text style={styles.appointmentMeta}>{new Date(item.horario_agendado).toLocaleString('pt-BR')}</Text>
            <Text style={styles.appointmentStatus}>{item.pagamento_status || item.status || 'agendado'}</Text>
          </View>
        )}
      />
    </SafeAreaView>
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
  disabledButton: { opacity: 0.55, marginTop: 18 },
  home: { padding: 20, paddingBottom: 50 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  kicker: { color: '#16c783', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  greeting: { color: '#ffffff', fontSize: 28, fontWeight: '700', marginTop: 3 },
  logout: { color: '#8a97a6', fontWeight: '600' },
  heroCard: { backgroundColor: '#10201d', borderWidth: 1, borderColor: '#1d342f', borderRadius: 22, padding: 22, marginBottom: 28 },
  heroEyebrow: { color: '#78f25f', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  heroTitle: { color: '#ffffff', fontSize: 25, fontWeight: '700', lineHeight: 31, marginTop: 9 },
  heroText: { color: '#a9b5b0', lineHeight: 21, marginTop: 9 },
  sectionTitle: { color: '#ffffff', fontSize: 19, fontWeight: '700', marginBottom: 12 },
  emptyCard: { borderWidth: 1, borderColor: '#1d342f', backgroundColor: '#0b1715', borderRadius: 16, padding: 18 },
  emptyTitle: { color: '#ffffff', fontWeight: '700' },
  emptyText: { color: '#8a97a6', marginTop: 4 },
  appointmentCard: { borderWidth: 1, borderColor: '#1d342f', backgroundColor: '#0b1715', borderRadius: 16, padding: 17, marginBottom: 10 },
  appointmentName: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  appointmentMeta: { color: '#a9b5b0', marginTop: 5 },
  appointmentStatus: { color: '#16c783', marginTop: 7, fontWeight: '700', textTransform: 'capitalize' },
});
