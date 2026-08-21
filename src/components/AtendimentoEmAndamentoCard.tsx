import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AtendimentoEmAndamento } from '../api/client';

type Props = {
  atendimento: AtendimentoEmAndamento;
  onContinuar: () => void;
};

function rotuloEtapa(etapa: AtendimentoEmAndamento['etapa']) {
  if (etapa === 'pagamento') return 'Pagamento pendente';
  if (etapa === 'triagem') return 'Triagem em andamento';
  if (etapa === 'chat') return 'Médico conectado';
  return 'Aguardando médico';
}

function textoEtapa(atendimento: AtendimentoEmAndamento) {
  if (atendimento.etapa === 'pagamento') return 'Continue de onde parou para concluir o pagamento.';
  if (atendimento.etapa === 'triagem') return 'Seu pagamento já foi confirmado. Falta concluir a triagem rápida.';
  if (atendimento.etapa === 'chat') return atendimento.medico_nome
    ? `${atendimento.medico_nome} já assumiu seu atendimento.`
    : 'Seu atendimento já está com um médico.';
  return 'Sua triagem foi concluída e você já está na fila médica.';
}

export default function AtendimentoEmAndamentoCard({ atendimento, onContinuar }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.live}><View style={styles.dot} /><Text style={styles.eyebrow}>ATENDIMENTO EM ANDAMENTO</Text></View>
        <Text style={styles.id}>#{atendimento.id}</Text>
      </View>
      <Text style={styles.title}>{rotuloEtapa(atendimento.etapa)}</Text>
      <Text style={styles.text}>{textoEtapa(atendimento)}</Text>
      {atendimento.nome ? <Text style={styles.patient}>Paciente: {atendimento.nome}</Text> : null}
      <Pressable onPress={onContinuar} style={styles.button}>
        <Text style={styles.buttonText}>{atendimento.etapa === 'chat' ? 'Abrir conversa' : 'Continuar atendimento'}</Text>
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 18, borderRadius: 20, padding: 18, backgroundColor: '#0e1d19', borderWidth: 1, borderColor: '#1d382f' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16c783' },
  eyebrow: { color: '#7fb49f', fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  id: { color: '#5f716a', fontSize: 11, fontWeight: '600' },
  title: { color: '#f0f6f3', fontSize: 19, fontWeight: '750' },
  text: { color: '#9aaba4', fontSize: 13, lineHeight: 19, marginTop: 6 },
  patient: { color: '#71837b', fontSize: 11, marginTop: 10 },
  button: { height: 48, marginTop: 16, borderRadius: 14, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#16c783' },
  buttonText: { color: '#07100f', fontSize: 14, fontWeight: '800' },
  arrow: { color: '#07100f', fontSize: 25, lineHeight: 26, marginTop: -2 },
});
