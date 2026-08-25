import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  DynamicColorIOS,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function themeColor(light: string, dark: string) {
  return Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : dark;
}
import LegacyApp from '../App';
import {
  carregarAtendimentoEmAndamento,
  type AtendimentoEmAndamento,
} from './api/client';
import AtendimentoAtual from './components/AtendimentoAtual';
import AtendimentoEmAndamentoCard from './components/AtendimentoEmAndamentoCard';
import { observarToquesEmPush, registrarPushDoPaciente } from './notifications/push';
import { emitPushNavigation } from './navigation/pushNavigation';

function AtendimentoAtualAnimado({ atendimento, onVoltar, onAtualizado }: {
  atendimento: AtendimentoEmAndamento;
  onVoltar: () => void;
  onAtualizado: (atual: AtendimentoEmAndamento | null) => void;
}) {
  const x = useRef(new Animated.Value(28)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(x, { toValue: 0, duration: 230, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 190, useNativeDriver: true }),
    ]).start();
  }, [opacity, x]);

  function fechar() {
    Animated.parallel([
      Animated.timing(x, { toValue: 34, duration: 170, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 145, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onVoltar();
    });
  }

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ translateX: x }] }}>
      <AtendimentoAtual atendimentoInicial={atendimento} onVoltar={fechar} onAtualizado={onAtualizado} />
    </Animated.View>
  );
}

export default function AppRoot() {
  const [checking, setChecking] = useState(true);
  const [atendimento, setAtendimento] = useState<AtendimentoEmAndamento | null>(null);
  const [modoAtendimento, setModoAtendimento] = useState(false);
  const [mostrarInicio, setMostrarInicio] = useState(false);
  const atendimentoIdRef = useRef<number | null>(null);
  const etapaRef = useRef<AtendimentoEmAndamento['etapa'] | null>(null);
  const chatFechadoManualRef = useRef(false);

  useEffect(() => {
    let ativo = true;
    let checando = false;

    async function recuperar() {
      if (!ativo || checando) return;
      checando = true;
      try {
        const data = await carregarAtendimentoEmAndamento();
        if (!ativo) return;
        const atual = data.atendimento || null;

        if (!atual) {
          atendimentoIdRef.current = null;
          etapaRef.current = null;
          chatFechadoManualRef.current = false;
          setAtendimento(null);
          return;
        }

        const atendimentoMudou = atendimentoIdRef.current !== atual.id;
        const entrouNoChat = etapaRef.current !== 'chat' && atual.etapa === 'chat';

        if (atendimentoMudou) {
          atendimentoIdRef.current = atual.id;
          chatFechadoManualRef.current = false;
        }

        etapaRef.current = atual.etapa;
        setAtendimento(atual);

        if (atual.etapa === 'chat' && (atendimentoMudou || entrouNoChat) && !chatFechadoManualRef.current) {
          setMostrarInicio(false);
          setModoAtendimento(true);
        }
      } catch {
        // Sem sessão, sessão expirada ou sem atendimento: o fluxo normal cuida disso.
      } finally {
        checando = false;
        if (ativo) setChecking(false);
      }
    }

    recuperar();
    const startup1 = setTimeout(recuperar, 500);
    const startup2 = setTimeout(recuperar, 1400);
    const timer = setInterval(recuperar, 3000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') recuperar();
    });
    return () => {
      ativo = false;
      clearTimeout(startup1);
      clearTimeout(startup2);
      clearInterval(timer);
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    async function registrar() {
      if (!ativo) return;
      await registrarPushDoPaciente();
    }

    registrar();
    const registerTimer = setInterval(registrar, 5000);

    const pararObservacao = observarToquesEmPush(async (data) => {
      const kind = String(data.kind || '');
      const atendimentoId = Number(data.atendimentoId || 0);
      if (!atendimentoId) return;

      if (kind === 'renovacao') {
        setModoAtendimento(false);
        setMostrarInicio(true);
        emitPushNavigation({
          kind: 'renovacao',
          atendimentoId,
          documentoUrl: typeof data.documentoUrl === 'string' ? data.documentoUrl : null,
        });
        return;
      }

      if (kind === 'chat') {
        try {
          const result = await carregarAtendimentoEmAndamento();
          const atual = result.atendimento || null;
          if (atual && Number(atual.id) === atendimentoId) {
            atendimentoIdRef.current = atual.id;
            etapaRef.current = atual.etapa;
            chatFechadoManualRef.current = false;
            setAtendimento(atual);
            setMostrarInicio(false);
            setModoAtendimento(true);
          }
        } catch {
          // O polling normal recupera a consulta se houver falha temporária.
        }
      }
    });

    return () => {
      ativo = false;
      clearInterval(registerTimer);
      pararObservacao();
    };
  }, []);

  const betaEmTriagem = atendimento?.etapa === 'triagem' && atendimento.pagamento_metodo === 'beta_test';

  if (checking) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#16c783" />
      </SafeAreaView>
    );
  }

  if (modoAtendimento && atendimento && !betaEmTriagem) {
    return (
      <AtendimentoAtualAnimado
        atendimento={atendimento}
        onVoltar={() => {
          if (atendimento.etapa === 'chat') chatFechadoManualRef.current = true;
          setModoAtendimento(false);
          setMostrarInicio(true);
        }}
        onAtualizado={(atual) => {
          setAtendimento(atual);
          if (!atual) {
            atendimentoIdRef.current = null;
            etapaRef.current = null;
            chatFechadoManualRef.current = false;
            setModoAtendimento(false);
            setMostrarInicio(true);
          }
        }}
      />
    );
  }

  if (atendimento && !mostrarInicio && !betaEmTriagem) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.wrap}>
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>ConsultaJá24h</Text>
            <Text style={styles.subtitle}>Você tem um atendimento em andamento.</Text>
          </View>

          <AtendimentoEmAndamentoCard
            atendimento={atendimento}
            onContinuar={() => {
              chatFechadoManualRef.current = false;
              setModoAtendimento(true);
            }}
          />

          <Pressable onPress={() => setMostrarInicio(true)} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Ir para o início</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.appWrap}>
      <LegacyApp />
      {atendimento && !betaEmTriagem ? (
        <Pressable
          onPress={() => {
            chatFechadoManualRef.current = false;
            setModoAtendimento(true);
          }}
          style={styles.resumeButton}
          accessibilityRole="button"
          accessibilityLabel="Voltar ao atendimento em andamento"
        >
          <View style={styles.resumeDot} />
          <View style={styles.resumeTextWrap}>
            <Text style={styles.resumeTitle}>
              {atendimento.etapa === 'chat' ? 'Médico conectado' : 'Atendimento em andamento'}
            </Text>
            <Text style={styles.resumeText}>
              {atendimento.etapa === 'chat' ? 'Toque para abrir a conversa' : 'Toque para continuar de onde parou'}
            </Text>
          </View>
          <Text style={styles.resumeArrow}>›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  appWrap: { flex: 1, backgroundColor: themeColor('#e8efeb', '#07100f') },
  safe: { flex: 1, backgroundColor: themeColor('#e8efeb', '#07100f') },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#e8efeb', '#07100f') },
  wrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  brandBlock: { marginBottom: 22 },
  brand: { color: themeColor('#14201d', '#fff'), fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  subtitle: { color: themeColor('#66736e', '#8a97a6'), fontSize: 14, marginTop: 6 },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#8fa098', fontSize: 13, fontWeight: '700' },
  resumeButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    minHeight: 64,
    borderRadius: 18,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColor('#dfe9e3', '#10201d'),
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  resumeDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#78f25f', marginRight: 11 },
  resumeTextWrap: { flex: 1 },
  resumeTitle: { color: themeColor('#14201d', '#fff'), fontSize: 14, fontWeight: '800' },
  resumeText: { color: themeColor('#66736e', '#91a29b'), fontSize: 11.5, marginTop: 3 },
  resumeArrow: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 28, lineHeight: 30, marginLeft: 8 },
});
