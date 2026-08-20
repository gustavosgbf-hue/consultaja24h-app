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
import { carregarAgendamentos, carregarPaciente, loginPaciente } from './src/api/client';
import { clearSessionToken, getSessionToken, saveSessionToken } from './src/auth/session';
import type { Agendamento, Paciente } from './src/types';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
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

  async function entrar() {
    if (!email.trim() || !senha) {
      Alert.alert('Preencha e-mail e senha');
      return;
    }
    setLoading(true);
    try {
      const data = await loginPaciente(email.trim(), senha);
      if (!data.ok || !data.token || !data.paciente) {
        throw new Error(data.error || 'Não foi possível entrar');
      }
      await saveSessionToken(data.token);
      setPaciente(data.paciente);
      const agenda = await carregarAgendamentos();
      setAgendamentos(agenda.agendamentos || []);
    } catch (error) {
      Alert.alert('Não foi possível entrar', error instanceof Error ? error.message : 'Tente novamente');
    } finally {
      setLoading(false);
    }
  }

  async function sair() {
    await clearSessionToken();
    setPaciente(null);
    setAgendamentos([]);
    setSenha('');
  }

  if (booting) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
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

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Entrar</Text>
            <Text style={styles.cardSubtitle}>Use a mesma conta da ConsultaJá24h.</Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={styles.input}
            />
            <TextInput
              value={senha}
              onChangeText={setSenha}
              placeholder="Senha"
              secureTextEntry
              autoComplete="current-password"
              style={styles.input}
            />

            <Pressable onPress={entrar} disabled={loading} style={styles.primaryButton}>
              {loading ? <ActivityIndicator /> : <Text style={styles.primaryButtonText}>Entrar</Text>}
            </Pressable>
          </View>
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
              <Text style={styles.heroText}>A consulta médica imediata entra na próxima etapa do app.</Text>
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
            <Text style={styles.appointmentMeta}>
              {new Date(item.horario_agendado).toLocaleString('pt-BR')}
            </Text>
            <Text style={styles.appointmentStatus}>{item.pagamento_status || item.status || 'agendado'}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#07100f' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07100f' },
  loginWrap: { flex: 1, justifyContent: 'center', padding: 22 },
  brandBlock: { marginBottom: 28 },
  brand: { color: '#ffffff', fontSize: 34, fontWeight: '700', letterSpacing: -1.2 },
  subtitle: { color: '#8a97a6', marginTop: 6, fontSize: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 22, padding: 22 },
  cardTitle: { color: '#14201d', fontWeight: '700', fontSize: 24 },
  cardSubtitle: { color: '#6b7280', marginTop: 5, marginBottom: 18 },
  input: { backgroundColor: '#f7fbf8', borderWidth: 1, borderColor: '#e6ece8', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 12, color: '#14201d' },
  primaryButton: { minHeight: 50, backgroundColor: '#16c783', borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryButtonText: { color: '#07100f', fontSize: 16, fontWeight: '800' },
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
