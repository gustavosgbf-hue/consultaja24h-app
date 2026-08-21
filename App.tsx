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
import { carregarAgendamentos, carregarPaciente } from './src/api/client';
import { clearSessionToken, getSessionToken } from './src/auth/session';
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

export default function App() {
  const [booting, setBooting] = useState(true);
  const [telefone, setTelefone] = useState('');
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

  function continuarComTelefone() {
    const numeros = telefone.replace(/\D/g, '');
    if (numeros.length < 10) {
      Alert.alert('Confira o celular', 'Digite um número de celular válido com DDD.');
      return;
    }

    Alert.alert(
      'Próxima etapa',
      'Agora vamos conectar este número ao cadastro existente e enviar o código de acesso.',
    );
  }

  async function sair() {
    await clearSessionToken();
    setPaciente(null);
    setAgendamentos([]);
    setTelefone('');
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

          <View style={styles.card}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ACESSO DO PACIENTE</Text>
            </View>

            <Text style={styles.cardTitle}>Entre com seu celular</Text>
            <Text style={styles.cardSubtitle}>
              Use o número informado nas suas consultas. Vamos reconhecer seu cadastro sem você precisar preencher tudo novamente.
            </Text>

            <Text style={styles.inputLabel}>Número de celular</Text>
            <TextInput
              value={telefone}
              onChangeText={(valor) => setTelefone(formatarTelefone(valor))}
              placeholder="(98) 99999-9999"
              placeholderTextColor="#94a09c"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              style={styles.input}
              maxLength={15}
            />

            <Pressable onPress={continuarComTelefone} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Continuar</Text>
            </Pressable>

            <Text style={styles.privacyText}>
              Ao continuar, você confirma que este número pertence a você ou está autorizado a utilizá-lo para acessar seus atendimentos.
            </Text>
          </View>

          <Text style={styles.helperText}>
            Primeiro acesso? Se o número ainda não estiver vinculado, completaremos seus dados na próxima etapa.
          </Text>
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
              <Pressable onPress={sair}>
                <Text style={styles.logout}>Sair</Text>
              </Pressable>
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
            <Text style={styles.appointmentName}>
              {item.profissional_nome || item.psicologo_nome || 'Profissional'}
            </Text>
            <Text style={styles.appointmentMeta}>
              {new Date(item.horario_agendado).toLocaleString('pt-BR')}
            </Text>
            <Text style={styles.appointmentStatus}>
              {item.pagamento_status || item.status || 'agendado'}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#07100f' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07100f',
  },
  loginWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 22 },
  brandBlock: { marginBottom: 28 },
  brand: { color: '#ffffff', fontSize: 34, fontWeight: '700', letterSpacing: -1.2 },
  subtitle: { color: '#8a97a6', marginTop: 6, fontSize: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 22 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eafaf3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
  },
  badgeText: { color: '#0b8f61', fontSize: 10, fontWeight: '800', letterSpacing: 0.9 },
  cardTitle: { color: '#14201d', fontWeight: '800', fontSize: 25, letterSpacing: -0.5 },
  cardSubtitle: { color: '#66736e', marginTop: 7, marginBottom: 20, lineHeight: 21 },
  inputLabel: { color: '#25322e', fontSize: 13, fontWeight: '700', marginBottom: 7 },
  input: {
    backgroundColor: '#f7fbf8',
    borderWidth: 1,
    borderColor: '#dfe9e3',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 15,
    marginBottom: 12,
    color: '#14201d',
    fontSize: 17,
  },
  primaryButton: {
    minHeight: 52,
    backgroundColor: '#16c783',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#07100f', fontSize: 16, fontWeight: '800' },
  privacyText: { color: '#84908c', fontSize: 11.5, lineHeight: 17, marginTop: 14 },
  helperText: {
    color: '#8a97a6',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 16,
  },
  disabledButton: { opacity: 0.55, marginTop: 18 },
  home: { padding: 20, paddingBottom: 50 },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  kicker: { color: '#16c783', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  greeting: { color: '#ffffff', fontSize: 28, fontWeight: '700', marginTop: 3 },
  logout: { color: '#8a97a6', fontWeight: '600' },
  heroCard: {
    backgroundColor: '#10201d',
    borderWidth: 1,
    borderColor: '#1d342f',
    borderRadius: 22,
    padding: 22,
    marginBottom: 28,
  },
  heroEyebrow: { color: '#78f25f', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  heroTitle: { color: '#ffffff', fontSize: 25, fontWeight: '700', lineHeight: 31, marginTop: 9 },
  heroText: { color: '#a9b5b0', lineHeight: 21, marginTop: 9 },
  sectionTitle: { color: '#ffffff', fontSize: 19, fontWeight: '700', marginBottom: 12 },
  emptyCard: {
    borderWidth: 1,
    borderColor: '#1d342f',
    backgroundColor: '#0b1715',
    borderRadius: 16,
    padding: 18,
  },
  emptyTitle: { color: '#ffffff', fontWeight: '700' },
  emptyText: { color: '#8a97a6', marginTop: 4 },
  appointmentCard: {
    borderWidth: 1,
    borderColor: '#1d342f',
    backgroundColor: '#0b1715',
    borderRadius: 16,
    padding: 17,
    marginBottom: 10,
  },
  appointmentName: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  appointmentMeta: { color: '#a9b5b0', marginTop: 5 },
  appointmentStatus: {
    color: '#16c783',
    marginTop: 7,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
