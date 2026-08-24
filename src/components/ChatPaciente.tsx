import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Linking,
  PanResponder,
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
  carregarChatPacienteV2,
  enviarMensagemChatPacienteV2,
  type MensagemChatV2,
} from '../api/chatV2';

type Props = {
  atendimentoId: number;
  medicoNome?: string | null;
  onVoltar: () => void;
  somenteLeitura?: boolean;
};

type SwipeProps = {
  mensagem: MensagemChatV2;
  somenteLeitura: boolean;
  onReply: (mensagem: MensagemChatV2) => void;
  children: React.ReactNode;
};

function SwipeMessage({ mensagem, somenteLeitura, onReply, children }: SwipeProps) {
  const x = useRef(new Animated.Value(0)).current;
  const responder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        !somenteLeitura && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_event, gesture) => {
        const deslocamento = Math.max(0, Math.min(72, gesture.dx));
        x.setValue(deslocamento);
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dx >= 52) onReply(mensagem);
        Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    }),
    [mensagem, onReply, somenteLeitura, x],
  );

  return (
    <View style={styles.swipeWrap}>
      {!somenteLeitura ? (
        <View style={styles.replyHint} pointerEvents="none">
          <Text style={styles.replyHintIcon}>↩</Text>
        </View>
      ) : null}
      <Animated.View style={{ transform: [{ translateX: x }] }} {...responder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

function resumoMensagem(mensagem?: MensagemChatV2 | null) {
  if (!mensagem) return '';
  if (mensagem.texto?.trim()) return mensagem.texto.trim().replace(/\s+/g, ' ').slice(0, 105);
  if (mensagem.arquivo_nome) return mensagem.arquivo_nome;
  return mensagem.arquivo_tipo === 'audio' ? 'Mensagem de áudio' : 'Documento';
}

export default function ChatPaciente({ atendimentoId, medicoNome, onVoltar, somenteLeitura = false }: Props) {
  const [mensagens, setMensagens] = useState<MensagemChatV2[]>([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [respondendo, setRespondendo] = useState<MensagemChatV2 | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    let ativo = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function carregar(silencioso = false) {
      try {
        const data = await carregarChatPacienteV2(atendimentoId);
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
    if (!somenteLeitura) timer = setInterval(() => carregar(true), 2500);
    return () => {
      ativo = false;
      if (timer) clearInterval(timer);
    };
  }, [atendimentoId, somenteLeitura]);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [mensagens.length]);

  const mensagensPorId = useMemo(() => {
    const mapa = new Map<number, MensagemChatV2>();
    mensagens.forEach((m) => mapa.set(m.id, m));
    return mapa;
  }, [mensagens]);

  function selecionarResposta(mensagem: MensagemChatV2) {
    if (somenteLeitura) return;
    setRespondendo(mensagem);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function enviar() {
    const limpo = texto.trim();
    if (!limpo || enviando) return;
    const respostaAtual = respondendo;
    setEnviando(true);
    setTexto('');
    setRespondendo(null);
    try {
      const data = await enviarMensagemChatPacienteV2(atendimentoId, limpo, respostaAtual?.id || null);
      if (data.mensagem) {
        setMensagens((atuais) => atuais.some((m) => m.id === data.mensagem.id) ? atuais : [...atuais, data.mensagem]);
      }
      setErro('');
    } catch (error) {
      setTexto(limpo);
      setRespondendo(respostaAtual);
      setErro(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  }

  async function abrirArquivo(url?: string | null) {
    const seguro = String(url || '').trim();
    if (!/^https:\/\//i.test(seguro)) {
      setErro('Este arquivo não possui um link válido.');
      return;
    }
    try {
      await Linking.openURL(seguro);
      setErro('');
    } catch {
      setErro('Não foi possível abrir o arquivo.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={onVoltar} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.statusRow}><View style={styles.dot} /><Text style={styles.status}>{somenteLeitura ? 'HISTÓRICO DA CONSULTA' : 'ATENDIMENTO EM ANDAMENTO'}</Text></View>
            <Text style={styles.doctor} numberOfLines={1} ellipsizeMode="tail">{medicoNome || 'Médico da ConsultaJá24h'}</Text>
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
              <Text style={styles.noticeText}>{somenteLeitura ? 'Esta conversa foi encerrada e permanece disponível para consulta e acesso aos documentos.' : 'Você está falando diretamente com o profissional responsável pelo seu atendimento.'}</Text>
            </View>
            {mensagens.length === 0 ? (
              <View style={styles.empty}><Text style={styles.emptyTitle}>Conversa iniciada</Text><Text style={styles.emptyText}>Envie uma mensagem quando quiser complementar alguma informação.</Text></View>
            ) : mensagens.map((m) => {
              const respondida = m.reply_to_id ? mensagensPorId.get(m.reply_to_id) : null;
              return (
                <SwipeMessage key={String(m.id)} mensagem={m} somenteLeitura={somenteLeitura} onReply={selecionarResposta}>
                  <View style={[styles.messageRow, m.autor === 'paciente' ? styles.mineRow : styles.theirRow]}>
                    <View style={[styles.bubble, m.autor === 'paciente' ? styles.mineBubble : styles.theirBubble]}>
                      {respondida ? (
                        <Pressable onPress={() => selecionarResposta(respondida)} disabled={somenteLeitura} style={styles.quotedMessage}>
                          <Text style={styles.quotedAuthor}>{respondida.autor === 'paciente' ? 'Você' : (medicoNome || 'Médico')}</Text>
                          <Text style={styles.quotedText} numberOfLines={2}>{resumoMensagem(respondida)}</Text>
                        </Pressable>
                      ) : null}
                      {m.arquivo_url ? (
                        <Pressable onPress={() => abrirArquivo(m.arquivo_url)} style={styles.fileCard}>
                          <View style={styles.fileIcon}><Text style={styles.fileIconText}>{m.arquivo_tipo === 'audio' ? 'ÁUDIO' : 'PDF'}</Text></View>
                          <View style={styles.fileMeta}>
                            <Text style={styles.fileName} numberOfLines={2}>{m.arquivo_nome || 'Documento.pdf'}</Text>
                            <Text style={styles.fileType}>{m.arquivo_tipo === 'audio' ? 'Mensagem de áudio' : m.arquivo_tipo === 'pdf' ? 'Documento PDF' : 'Arquivo'}</Text>
                          </View>
                          <Text style={styles.fileArrow}>›</Text>
                        </Pressable>
                      ) : null}
                      {m.texto ? <Text style={[styles.messageText, m.autor === 'paciente' && styles.mineText]}>{m.texto}</Text> : null}
                      <View style={styles.metaRow}>
                        <Text style={[styles.time, m.autor === 'paciente' && styles.mineTime]}>
                          {new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {m.autor === 'paciente' ? (
                          <Text style={[styles.delivery, m.lido_medico_em && styles.deliveryRead]}>
                            {m.lido_medico_em ? 'Visualizado' : 'Enviado'}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </SwipeMessage>
              );
            })}
            {erro ? <Text style={styles.error}>{erro}</Text> : null}
          </ScrollView>
        )}

        {!somenteLeitura ? (
          <View style={styles.composerArea}>
            {respondendo ? (
              <View style={styles.replyComposer}>
                <View style={styles.replyComposerBody}>
                  <Text style={styles.replyComposerLabel}>Respondendo a {respondendo.autor === 'paciente' ? 'você' : (medicoNome || 'médico')}</Text>
                  <Text style={styles.replyComposerText} numberOfLines={1}>{resumoMensagem(respondendo)}</Text>
                </View>
                <Pressable onPress={() => setRespondendo(null)} style={styles.replyClose} accessibilityLabel="Cancelar resposta">
                  <Text style={styles.replyCloseText}>×</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.composer}>
              <TextInput
                ref={inputRef}
                value={texto}
                onChangeText={setTexto}
                placeholder="Escreva uma mensagem..."
                placeholderTextColor="#6f7d78"
                style={styles.input}
                multiline
                maxLength={3000}
                editable={!enviando}
                returnKeyType="send"
                submitBehavior="submit"
                onSubmitEditing={enviar}
              />
              <Pressable onPress={enviar} disabled={!texto.trim() || enviando} style={[styles.send, (!texto.trim() || enviando) && styles.sendDisabled]}>
                {enviando ? <ActivityIndicator color="#07100f" size="small" /> : <Text style={styles.sendText}>↑</Text>}
              </Pressable>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#07100f' },
  screen: { flex: 1, backgroundColor: '#07100f' },
  header: { minHeight: 88, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#16221f', flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d1916' },
  backText: { color: '#eef5f1', fontSize: 34, lineHeight: 36, marginTop: -3 },
  headerCenter: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16c783' },
  status: { flexShrink: 1, fontSize: 9, fontWeight: '800', letterSpacing: 1.1, color: '#79a493' },
  doctor: { marginTop: 4, maxWidth: '100%', color: '#f2f7f4', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  id: { marginTop: 2, color: '#6e7e78', fontSize: 11 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 22 },
  notice: { alignSelf: 'center', maxWidth: 310, backgroundColor: '#0d1916', borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 18 },
  noticeText: { textAlign: 'center', color: '#899892', fontSize: 11, lineHeight: 16 },
  empty: { marginTop: 42, alignItems: 'center', paddingHorizontal: 28 },
  emptyTitle: { color: '#dbe6e1', fontSize: 16, fontWeight: '700' },
  emptyText: { color: '#75837e', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  swipeWrap: { position: 'relative' },
  replyHint: { position: 'absolute', left: 8, top: '50%', marginTop: -17, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10231d' },
  replyHintIcon: { color: '#72a892', fontSize: 17, fontWeight: '800' },
  messageRow: { width: '100%', marginVertical: 5 },
  mineRow: { alignItems: 'flex-end' },
  theirRow: { alignItems: 'flex-start' },
  bubble: { maxWidth: '84%', borderRadius: 18, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 7 },
  mineBubble: { backgroundColor: '#123d31', borderWidth: 1, borderColor: '#1b5645', borderBottomRightRadius: 6 },
  theirBubble: { backgroundColor: '#10201c', borderWidth: 1, borderColor: '#1b302a', borderBottomLeftRadius: 6 },
  quotedMessage: { borderLeftWidth: 3, borderLeftColor: '#57947c', backgroundColor: '#0c1916', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, marginBottom: 7, minWidth: 150 },
  quotedAuthor: { color: '#76ad97', fontSize: 10, fontWeight: '800', marginBottom: 2 },
  quotedText: { color: '#9eafa8', fontSize: 11, lineHeight: 15 },
  messageText: { color: '#e7efeb', fontSize: 15, lineHeight: 21 },
  mineText: { color: '#edf7f3' },
  fileCard: { minWidth: 210, maxWidth: 285, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  fileIcon: { width: 38, height: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#182b26', borderWidth: 1, borderColor: '#29453c' },
  fileIconText: { color: '#94b5a8', fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  fileMeta: { flex: 1, minWidth: 0 },
  fileName: { color: '#e1ebe7', fontSize: 13, lineHeight: 17, fontWeight: '700' },
  fileType: { marginTop: 2, color: '#71857d', fontSize: 10 },
  fileArrow: { color: '#8ba097', fontSize: 28, lineHeight: 30, marginLeft: 2 },
  metaRow: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  time: { color: '#66766f', fontSize: 9 },
  mineTime: { color: '#87a99c' },
  delivery: { color: '#7f9c90', fontSize: 9, fontWeight: '600' },
  deliveryRead: { color: '#9bd7bf' },
  error: { color: '#d89090', fontSize: 11, textAlign: 'center', marginTop: 12 },
  composerArea: { borderTopWidth: 1, borderTopColor: '#16221f', backgroundColor: '#091310' },
  replyComposer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 8, paddingLeft: 10, paddingRight: 4, paddingVertical: 7, backgroundColor: '#0f1d19', borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#57947c' },
  replyComposerBody: { flex: 1, minWidth: 0 },
  replyComposerLabel: { color: '#7eb39d', fontSize: 10, fontWeight: '800' },
  replyComposerText: { color: '#94a49e', fontSize: 11, marginTop: 2 },
  replyClose: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  replyCloseText: { color: '#82918b', fontSize: 25, lineHeight: 27 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: 12, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 8 : 10 },
  input: { flex: 1, maxHeight: 120, minHeight: 48, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 18, backgroundColor: '#101d1a', color: '#f1f6f3', fontSize: 15 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16c783' },
  sendDisabled: { opacity: 0.35 },
  sendText: { color: '#07100f', fontSize: 24, fontWeight: '800', marginTop: -2 },
});
