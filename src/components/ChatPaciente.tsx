import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  carregarChatPaciente,
  enviarMensagemChatPaciente,
  type MensagemChat,
} from '../api/client';

type Props = {
  atendimentoId: number;
  medicoNome?: string | null;
  onVoltar: () => void;
};

export default function ChatPaciente({ atendimentoId, medicoNome, onVoltar }: Props) {
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    let ativo = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function carregar(silencioso = false) {
      try {
        const data = await carregarChatPaciente(atendimentoId);
        if (!ativo) return;
        setMensagens(data.mensagens || []);
        setErro('');
      } catch (error) {
        if (!ativo) return;
        if (!silencioso) setErro(error instanceof Error ? error.message : 'Não foi possível carregar a conversa.');
      } finally {
        if (ativo && !silencioso) setLoading(false);
      }
    }

    carregar();
    timer = setInterval(() => carregar(true), 3000);
    return () => {
      ativo = false;
      if (timer) clearInterval(timer);
    };
  }, [atendimentoId]);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [mensagens.length]);

  async function enviar() {
    const limpo = texto.trim();
    if (!limpo || enviando) return;
    setEnviando(true);
    setTexto('');
    try {
      const data = await enviarMensagemChatPaciente(atendimentoId, limpo);
      if (data.mensagem) {
        setMensagens((atuais) => atuais.some((m) => m.id === data.mensagem.id) ? atuais : [...atuais, data.mensagem]);
      }
    } catch (error) {
      setTexto(limpo);
      setErro(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={onVoltar} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.statusRow}><View style={styles.dot} /><Text style={styles.status}>ATENDIMENTO EM ANDAMENTO</Text></View>
          <Text style={styles.doctor}>{medicoNome || 'Médico da ConsultaJá24h'}</Text>
          <Text style={styles.id}>Atendimento #{atendimentoId}</Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#16c783" /></View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.notice}>
            <Text style={styles.noticeText}>Você está falando diretamente com o profissional responsável pelo seu atendimento.</Text>
          </View>
          {mensagens.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyTitle}>Conversa iniciada</Text><Text style={styles.emptyText}>Envie uma mensagem quando quiser complementar alguma informação.</Text></View>
          ) : mensagens.map((m) => (
            <View key={String(m.id)} style={[styles.messageRow, m.autor === 'paciente' ? styles.mineRow : styles.theirRow]}>
              <View style={[styles.bubble, m.autor === 'paciente' ? styles.mineBubble : styles.theirBubble]}>
                {m.arquivo_url ? <Text style={styles.fileText}>{m.arquivo_nome || 'Arquivo enviado'}</Text> : null}
                {m.texto ? <Text style={[styles.messageText, m.autor === 'paciente' && styles.mineText]}>{m.texto}</Text> : null}
                <Text style={[styles.time, m.autor === 'paciente' && styles.mineTime]}>
                  {new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}
          {erro ? <Text style={styles.error}>{erro}</Text> : null}
        </ScrollView>
      )}

      <View style={styles.composer}>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Escreva uma mensagem..."
          placeholderTextColor="#6f7d78"
          style={styles.input}
          multiline
          maxLength={3000}
          editable={!enviando}
        />
        <Pressable onPress={enviar} disabled={!texto.trim() || enviando} style={[styles.send, (!texto.trim() || enviando) && styles.sendDisabled]}>
          {enviando ? <ActivityIndicator color="#07100f" size="small" /> : <Text style={styles.sendText}>↑</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07100f' },
  header: { minHeight: 88, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#16221f', flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d1916' },
  backText: { color: '#eef5f1', fontSize: 34, lineHeight: 36, marginTop: -3 },
  headerCenter: { flex: 1, alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16c783' },
  status: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, color: '#79a493' },
  doctor: { marginTop: 4, color: '#f2f7f4', fontSize: 16, fontWeight: '700' },
  id: { marginTop: 2, color: '#6e7e78', fontSize: 11 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 22 },
  notice: { alignSelf: 'center', maxWidth: 310, backgroundColor: '#0d1916', borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 18 },
  noticeText: { textAlign: 'center', color: '#899892', fontSize: 11, lineHeight: 16 },
  empty: { marginTop: 42, alignItems: 'center', paddingHorizontal: 28 },
  emptyTitle: { color: '#dbe6e1', fontSize: 16, fontWeight: '700' },
  emptyText: { color: '#75837e', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  messageRow: { width: '100%', marginVertical: 5 },
  mineRow: { alignItems: 'flex-end' },
  theirRow: { alignItems: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7 },
  mineBubble: { backgroundColor: '#16c783', borderBottomRightRadius: 6 },
  theirBubble: { backgroundColor: '#10201c', borderWidth: 1, borderColor: '#1b302a', borderBottomLeftRadius: 6 },
  messageText: { color: '#e7efeb', fontSize: 15, lineHeight: 21 },
  mineText: { color: '#07100f' },
  fileText: { color: '#b7c7c0', fontSize: 12, marginBottom: 6, fontWeight: '600' },
  time: { alignSelf: 'flex-end', color: '#66766f', fontSize: 9, marginTop: 5 },
  mineTime: { color: '#0d5940' },
  error: { color: '#d89090', fontSize: 11, textAlign: 'center', marginTop: 12 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: 12, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 12 : 10, borderTopWidth: 1, borderTopColor: '#16221f', backgroundColor: '#091310' },
  input: { flex: 1, maxHeight: 120, minHeight: 48, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 18, backgroundColor: '#101d1a', color: '#f1f6f3', fontSize: 15 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16c783' },
  sendDisabled: { opacity: 0.35 },
  sendText: { color: '#07100f', fontSize: 24, fontWeight: '800', marginTop: -2 },
});
