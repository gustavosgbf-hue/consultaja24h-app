import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LegacyApp from '../App';
import {
  carregarAtendimentoEmAndamento,
  type AtendimentoEmAndamento,
} from './api/client';
import AtendimentoAtual from './components/AtendimentoAtual';
import AtendimentoEmAndamentoCard from './components/AtendimentoEmAndamentoCard';

export default function AppRoot() {
  const [checking, setChecking] = useState(true);
  const [atendimento, setAtendimento] = useState<AtendimentoEmAndamento | null>(null);
  const [modoAtendimento, setModoAtendimento] = useState(false);
  const [mostrarInicio, setMostrarInicio] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function recuperar() {
      try {
        const data = await carregarAtendimentoEmAndamento();
        if (!ativo) return;
        if (data.atendimento) setAtendimento(data.atendimento);
      } catch {
        // Sem sessão, sessão expirada ou sem atendimento: o fluxo normal cuida disso.
      } finally {
        if (ativo) setChecking(false);
      }
    }

    recuperar();
    return () => {
      ativo = false;
    };
  }, []);

  if (checking) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#16c783" />
      </SafeAreaView>
    );
  }

  if (modoAtendimento && atendimento) {
    return (
      <AtendimentoAtual
        atendimentoInicial={atendimento}
        onVoltar={() => setModoAtendimento(false)}
        onAtualizado={(atual) => {
          setAtendimento(atual);
          if (!atual) setModoAtendimento(false);
        }}
      />
    );
  }

  if (atendimento && !mostrarInicio) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.wrap}>
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>ConsultaJá24h</Text>
            <Text style={styles.subtitle}>Você tem um atendimento em andamento.</Text>
          </View>

          <AtendimentoEmAndamentoCard
            atendimento={atendimento}
            onContinuar={() => setModoAtendimento(true)}
          />

          <Pressable onPress={() => setMostrarInicio(true)} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Ir para o início</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return <LegacyApp />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#07100f' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07100f' },
  wrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  brandBlock: { marginBottom: 22 },
  brand: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  subtitle: { color: '#8a97a6', fontSize: 14, marginTop: 6 },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#8fa098', fontSize: 13, fontWeight: '700' },
});
