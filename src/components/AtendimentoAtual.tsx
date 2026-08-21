import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  carregarAtendimentoEmAndamento,
  consultarStatusAtendimento,
  type AtendimentoEmAndamento,
} from '../api/client';
import ChatPaciente from './ChatPaciente';

type Props = {
  atendimentoInicial: AtendimentoEmAndamento;
  onVoltar: () => void;
  onAtualizado?: (atendimento: AtendimentoEmAndamento | null) => void;
};

export default function AtendimentoAtual({ atendimentoInicial, onVoltar, onAtualizado }: Props) {
  const [atendimento, setAtendimento] = useState(atendimentoInicial);
  const [posicao, setPosicao] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ativo = true;
    let checando = false;

    async function verificar() {
      if (!ativo || checando) return;
      checando = true;
      try {
        const status = await consultarStatusAtendimento(atendimento.id);
        if (!ativo) return;
        const atual = status.atendimento;
        if (status.fila?.posicao) setPosicao(status.fila.posicao);
        if (atual?.status === 'assumido' || atual?.medico_id) {
          setAtendimento((prev) => ({
            ...prev,
            status: atual.status || prev.status,
            medico_id: atual.medico_id ?? prev.medico_id,
            medico_nome: atual.medico_nome ?? prev.medico_nome,
            etapa: 'chat',
          }));
          return;
        }
        const recuperado = await carregarAtendimentoEmAndamento();
        if (!ativo) return;
        if (recuperado.atendimento) {
          setAtendimento(recuperado.atendimento);
          onAtualizado?.(recuperado.atendimento);
        } else {
          onAtualizado?.(null);
        }
      } catch {
        // Polling best-effort: mantém a tela atual e tenta novamente.
      } finally {
        checando = false;
      }
    }

    verificar();
    const timer = setInterval(verificar, 3000);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [atendimento.id, onAtualizado]);

  if (atendimento.etapa === 'chat') {
    return <ChatPaciente atendimentoId={atendimento.id} medicoNome={atendimento.medico_nome} onVoltar={onVoltar} />;
  }

  async function atualizarAgora() {
    if (loading) return;
    setLoading(true);
    try {
      const data = await carregarAtendimentoEmAndamento();
      if (data.atendimento) {
        setAtendimento(data.atendimento);
        onAtualizado?.(data.atendimento);
      } else {
        onAtualizado?.(null);
        onVoltar();
      }
    } finally {
      setLoading(false);
    }
  }

  const aguardando = atendimento.etapa === 'fila';
  const titulo = aguardando ? 'Aguardando médico' : atendimento.etapa === 'triagem' ? 'Triagem em andamento' : 'Pagamento pendente';
  const texto = aguardando
    ? 'Seu atendimento já está na fila. Quando um médico assumir, esta tela abre a conversa automaticamente.'
    : atendimento.etapa === 'triagem'
      ? 'Seu pagamento foi confirmado. Conclua a triagem para entrar na fila médica.'
      : 'O pagamento ainda precisa ser concluído antes da triagem.';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.header}>
          <Pressable onPress={onVoltar} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>Atendimento</Text>
          <View style={{ width: 42 }} />
        </View>

        <View style={styles.hero}>
          <View style={styles.pulseWrap}><View style={styles.pulse} /></View>
          <Text style={styles.eyebrow}>ATENDIMENTO #{atendimento.id}</Text>
          <Text style={styles.title}>{titulo}</Text>
          <Text style={styles.text}>{texto}</Text>
          {aguardando && posicao ? <Text style={styles.position}>Você está na posição {posicao} da fila</Text> : null}
        </View>

        {aguardando ? (
          <View style={styles.infoCard}>
            <View style={styles.infoDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Pode deixar o app aberto ou voltar depois</Text>
              <Text style={styles.infoText}>O atendimento fica vinculado à sua conta. Ao retornar, você continua do mesmo ponto sem novo pagamento.</Text>
            </View>
          </View>
        ) : null}

        <Pressable onPress={atualizarAgora} disabled={loading} style={styles.refresh}>
          {loading ? <ActivityIndicator color="#16c783" /> : <Text style={styles.refreshText}>Atualizar atendimento</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#07100f' },
  wrap: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 34 },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d1916' },
  backText: { color: '#edf5f1', fontSize: 34, lineHeight: 36, marginTop: -3 },
  headerTitle: { color: '#eef5f1', fontSize: 16, fontWeight: '700' },
  hero: { marginTop: 38, alignItems: 'center', paddingHorizontal: 18 },
  pulseWrap: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0e241d' },
  pulse: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#16c783' },
  eyebrow: { marginTop: 22, color: '#76a895', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { marginTop: 8, color: '#f2f7f4', fontSize: 28, fontWeight: '800', textAlign: 'center' },
  text: { marginTop: 10, color: '#91a29b', fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 330 },
  position: { marginTop: 18, color: '#b9d1c8', fontSize: 13, fontWeight: '700' },
  infoCard: { marginTop: 38, flexDirection: 'row', gap: 12, borderRadius: 18, padding: 16, backgroundColor: '#0d1916', borderWidth: 1, borderColor: '#172a24' },
  infoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16c783', marginTop: 5 },
  infoTitle: { color: '#dce8e3', fontSize: 13, fontWeight: '700' },
  infoText: { marginTop: 5, color: '#74857e', fontSize: 12, lineHeight: 18 },
  refresh: { marginTop: 20, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  refreshText: { color: '#16c783', fontSize: 13, fontWeight: '700' },
});
