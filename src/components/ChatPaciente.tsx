import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  DynamicColorIOS,
  Linking,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { WebView } from 'react-native-webview';
import {
  carregarChatPacienteV2,
  enviarAnexoChatPacienteV2,
  enviarMensagemChatPacienteV2,
  type MensagemChatV2,
  type UploadChatPaciente,
} from '../api/chatV2';
import ThemeToggle from './ThemeToggle';
import { carregarAvaliacaoAtendimento, salvarAvaliacaoAtendimento } from '../api/avaliacao';

function themeColor(light: string, dark: string) {
  return Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : dark;
}

type Props = {
  atendimentoId: number;
  medicoNome?: string | null;
  onVoltar: () => void;
  somenteLeitura?: boolean;
  avaliavel?: boolean;
};

type SwipeProps = {
  mensagem: MensagemChatV2;
  somenteLeitura: boolean;
  onReply: (mensagem: MensagemChatV2) => void;
  children: React.ReactNode;
};

type ViewerState = {
  url: string;
  name: string;
  type: 'pdf' | 'imagem';
} | null;

const MAX_FILE_SIZE = 15 * 1024 * 1024;

function ClipIcon({ color = '#9aaba4' }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M8.5 12.7 14.9 6.3a3.1 3.1 0 0 1 4.4 4.4l-8.2 8.2a5 5 0 0 1-7.1-7.1l8-8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CameraIcon({ color = '#9aaba4' }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M8.2 6.5 9.6 4.5h4.8l1.4 2h2.7a2 2 0 0 1 2 2v8.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h2.7Z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
      <Circle cx="12" cy="12.8" r="3.2" stroke={color} strokeWidth="1.7" />
    </Svg>
  );
}

function PhotoIcon({ color = '#9aaba4' }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="4" width="17" height="16" rx="2.4" stroke={color} strokeWidth="1.7" />
      <Circle cx="9" cy="9" r="1.6" stroke={color} strokeWidth="1.5" />
      <Path d="m5.8 17 4.2-4.1 3.1 3 2.2-2.2 2.9 3.3" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function FileIcon({ color = '#9aaba4' }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3.8h7.2L18 8.6v11.6H6V3.8Z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
      <Path d="M13.2 3.8v4.8H18" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
      <Line x1="8.8" y1="13" x2="15.4" y2="13" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Line x1="8.8" y1="16" x2="13.2" y2="16" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

function MicIcon({ color = '#9aaba4' }: { color?: string }) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Rect x="8.5" y="3.5" width="7" height="11" rx="3.5" stroke={color} strokeWidth="1.8" />
      <Path d="M5.8 11.5a6.2 6.2 0 0 0 12.4 0M12 17.7v2.8M9.3 20.5h5.4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function SendIcon({ color = '#07100f' }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h13M13 7l5 5-5 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ReplyIcon({ color = '#7eb29e' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="m10 7-5 5 5 5M5 12h7.5c3.8 0 6.5 2 6.5 5.5" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DeliveryChecks({ read }: { read: boolean }) {
  const color = read ? '#16c783' : themeColor('#708079', '#71857c');
  return (
    <Svg width={read ? 18 : 12} height={11} viewBox={read ? '0 0 18 11' : '0 0 12 11'} fill="none">
      <Path d="M1 5.7 3.6 8.3 8.9 2.5" stroke={color} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
      {read ? <Path d="M6.2 5.7 8.8 8.3 14.1 2.5" stroke={color} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </Svg>
  );
}

function CloseIcon({ color = '#a9b5b0' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="m7 7 10 10M17 7 7 17" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      {playing ? (
        <>
          <Rect x="7" y="6" width="3.5" height="12" rx="1" fill="#78f25f" />
          <Rect x="13.5" y="6" width="3.5" height="12" rx="1" fill="#78f25f" />
        </>
      ) : (
        <Path d="m8 6 10 6-10 6V6Z" fill="#78f25f" />
      )}
    </Svg>
  );
}

function formatDuration(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function AudioMessage({ url }: { url: string }) {
  const player = useAudioPlayer(url, { updateInterval: 250, downloadFirst: true });
  const status = useAudioPlayerStatus(player);
  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;

  function toggle() {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish) player.seekTo(0);
    player.play();
  }

  return (
    <View style={styles.audioCard}>
      <Pressable onPress={toggle} style={styles.audioPlay} accessibilityLabel={status.playing ? 'Pausar áudio' : 'Reproduzir áudio'}>
        <PlayIcon playing={status.playing} />
      </Pressable>
      <View style={styles.audioBody}>
        <View style={styles.audioTrack}><View style={[styles.audioProgress, { width: `${progress * 100}%` }]} /></View>
        <Text style={styles.audioTime}>{formatDuration(status.currentTime)} · {formatDuration(status.duration)}</Text>
      </View>
    </View>
  );
}

function SwipeMessage({ mensagem, somenteLeitura, onReply, children }: SwipeProps) {
  const x = useRef(new Animated.Value(0)).current;
  const maxSwipeX = useRef(0);
  const responder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        !somenteLeitura && gesture.dx > 5 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 0.45,
      onPanResponderGrant: () => {
        maxSwipeX.current = 0;
      },
      onPanResponderMove: (_event, gesture) => {
        const dx = Math.max(0, gesture.dx);
        maxSwipeX.current = Math.max(maxSwipeX.current, dx);
        x.setValue(Math.min(78, dx));
      },
      onPanResponderRelease: (_event, gesture) => {
        const alcance = Math.max(maxSwipeX.current, Math.max(0, gesture.dx));
        if (alcance >= 24) onReply(mensagem);
        maxSwipeX.current = 0;
        Animated.spring(x, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 240 }).start();
      },
      onPanResponderTerminate: () => {
        maxSwipeX.current = 0;
        Animated.spring(x, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 240 }).start();
      },
    }),
    [mensagem, onReply, somenteLeitura, x],
  );

  const hintOpacity = x.interpolate({ inputRange: [0, 7, 24], outputRange: [0, 0.4, 1], extrapolate: 'clamp' });
  const hintScale = x.interpolate({ inputRange: [0, 24], outputRange: [0.86, 1], extrapolate: 'clamp' });

  return (
    <View style={styles.swipeWrap}>
      {!somenteLeitura ? (
        <Animated.View style={[styles.replyHint, { opacity: hintOpacity, transform: [{ scale: hintScale }] }]} pointerEvents="none">
          <ReplyIcon />
        </Animated.View>
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

function RatingStar({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.ratingStarButton} accessibilityRole="button" accessibilityLabel={active ? 'Estrela selecionada' : 'Selecionar estrela'}>
      <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
        <Path
          d="m12 3.2 2.55 5.18 5.72.83-4.14 4.03.98 5.69L12 16.24l-5.11 2.69.98-5.69-4.14-4.03 5.72-.83L12 3.2Z"
          fill={active ? '#78f25f' : 'transparent'}
          stroke={active ? '#78f25f' : themeColor('#8da098', '#5f716a')}
          strokeWidth="1.45"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

function AvaliacaoConsulta({ atendimentoId, medicoNome }: { atendimentoId: number; medicoNome?: string | null }) {
  const [carregando, setCarregando] = useState(true);
  const [permitida, setPermitida] = useState(false);
  const [estrelas, setEstrelas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [salva, setSalva] = useState(false);

  useEffect(() => {
    let ativo = true;
    carregarAvaliacaoAtendimento(atendimentoId)
      .then((data) => {
        if (!ativo) return;
        setPermitida(!!data.avaliavel);
        if (data.avaliacao) setSalva(true);
      })
      .catch(() => {})
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [atendimentoId]);

  async function salvar() {
    if (estrelas < 1 || salvando) return;
    setSalvando(true);
    try {
      await salvarAvaliacaoAtendimento(atendimentoId, estrelas, comentario);
      setSalva(true);
      setEstrelas(0);
      setComentario('');
    } catch (error) {
      Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente em instantes.');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando || !permitida) return null;

  if (salva) {
    return (
      <View style={styles.ratingThanks}>
        <Text style={styles.ratingThanksTitle}>Obrigado pelo seu feedback</Text>
        <Text style={styles.ratingThanksText}>Sua avaliação foi registrada de forma privada pela ConsultaJá24h.</Text>
      </View>
    );
  }

  return (
    <View style={styles.ratingCard}>
      <Text style={styles.ratingEyebrow}>AVALIAÇÃO DO ATENDIMENTO</Text>
      <Text style={styles.ratingTitle}>Como foi seu atendimento{medicoNome ? ' com ' + medicoNome : ''}?</Text>
      <Text style={styles.ratingText}>Sua avaliação é privada e ajuda a ConsultaJá24h a acompanhar a qualidade dos atendimentos.</Text>
      <View style={styles.ratingStars}>
        {[1, 2, 3, 4, 5].map((n) => <RatingStar key={n} active={n <= estrelas} onPress={() => setEstrelas(n)} />)}
      </View>
      {estrelas > 0 ? (
        <>
          <TextInput
            value={comentario}
            onChangeText={(value) => setComentario(value.slice(0, 600))}
            placeholder="Quer deixar um comentário? (opcional)"
            placeholderTextColor={themeColor('#84918c', '#697b74')}
            style={styles.ratingInput}
            multiline
            maxLength={600}
            textAlignVertical="top"
          />
          <Pressable onPress={salvar} disabled={salvando} style={[styles.ratingSave, salvando && { opacity: 0.6 }]}>
            {salvando ? <ActivityIndicator size="small" color="#07100f" /> : <Text style={styles.ratingSaveText}>Enviar avaliação</Text>}
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

export default function ChatPaciente({ atendimentoId, medicoNome, onVoltar, somenteLeitura = false, avaliavel = false }: Props) {
  const [mensagens, setMensagens] = useState<MensagemChatV2[]>([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [respondendo, setRespondendo] = useState<MensagemChatV2 | null>(null);
  const [menuAnexo, setMenuAnexo] = useState(false);
  const [menuAnexoRenderizado, setMenuAnexoRenderizado] = useState(false);
  const [viewer, setViewer] = useState<ViewerState>(null);
  const attachmentAnim = useRef(new Animated.Value(0)).current;
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

  useEffect(() => {
    if (menuAnexo) {
      setMenuAnexoRenderizado(true);
      attachmentAnim.stopAnimation();
      Animated.spring(attachmentAnim, {
        toValue: 1,
        damping: 19,
        stiffness: 260,
        mass: 0.72,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!menuAnexoRenderizado) return;
    attachmentAnim.stopAnimation();
    Animated.timing(attachmentAnim, {
      toValue: 0,
      duration: 145,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMenuAnexoRenderizado(false);
    });
  }, [attachmentAnim, menuAnexo, menuAnexoRenderizado]);

  const mensagensPorId = useMemo(() => {
    const mapa = new Map<number, MensagemChatV2>();
    mensagens.forEach((m) => mapa.set(m.id, m));
    return mapa;
  }, [mensagens]);

  function selecionarResposta(mensagem: MensagemChatV2) {
    if (somenteLeitura) return;
    setRespondendo(mensagem);
    setMenuAnexo(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function anexarMensagem(mensagem?: MensagemChatV2 | null) {
    if (!mensagem) return;
    setMensagens((atuais) => atuais.some((m) => m.id === mensagem.id) ? atuais : [...atuais, mensagem]);
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
      anexarMensagem(data.mensagem);
      setErro('');
    } catch (error) {
      setTexto(limpo);
      setRespondendo(respostaAtual);
      setErro(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  }

  async function enviarArquivo(arquivo: UploadChatPaciente, tamanho?: number | null) {
    if (tamanho && tamanho > MAX_FILE_SIZE) {
      Alert.alert('Arquivo muito grande', 'O limite por anexo é de 15 MB.');
      return;
    }
    const respostaAtual = respondendo;
    setEnviando(true);
    setMenuAnexo(false);
    try {
      const data = await enviarAnexoChatPacienteV2(atendimentoId, arquivo, respostaAtual?.id || null);
      anexarMensagem(data.mensagem);
      setRespondendo(null);
      setErro('');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível enviar o anexo.');
    } finally {
      setEnviando(false);
    }
  }

  function confirmarEnvioArquivo(arquivo: UploadChatPaciente, tamanho?: number | null) {
    if (tamanho && tamanho > MAX_FILE_SIZE) {
      Alert.alert('Arquivo muito grande', 'O limite por anexo é de 15 MB.');
      return;
    }
    Alert.alert(
      'Enviar arquivo?',
      arquivo.name || 'Arquivo selecionado',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Enviar', onPress: () => { void enviarArquivo(arquivo, tamanho); } },
      ],
    );
  }

  async function abrirCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Câmera bloqueada', 'Autorize o acesso à câmera nos Ajustes do iPhone para tirar fotos pelo atendimento.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    confirmarEnvioArquivo({
      uri: asset.uri,
      name: asset.fileName || `Foto_${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    }, asset.fileSize);
  }

  async function abrirFotos() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: false });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    confirmarEnvioArquivo({
      uri: asset.uri,
      name: asset.fileName || `Imagem_${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    }, asset.fileSize);
  }

  async function abrirDocumento() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    confirmarEnvioArquivo({
      uri: asset.uri,
      name: asset.name || `Documento_${Date.now()}`,
      type: asset.mimeType || 'application/pdf',
    }, asset.size);
  }

  function abrirArquivo(mensagem: MensagemChatV2) {
    const url = String(mensagem.arquivo_url || '').trim();
    if (!/^https:\/\//i.test(url)) {
      setErro('Este arquivo não possui um link válido.');
      return;
    }
    if (mensagem.arquivo_tipo === 'pdf') {
      setViewer({ url, name: mensagem.arquivo_nome || 'Documento.pdf', type: 'pdf' });
      return;
    }
    if (mensagem.arquivo_tipo === 'imagem') {
      setViewer({ url, name: mensagem.arquivo_nome || 'Imagem', type: 'imagem' });
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={onVoltar} style={styles.backButton} accessibilityLabel="Voltar"><Text style={styles.backText}>‹</Text></Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.statusRow}><View style={styles.dot} /><Text style={styles.status}>{somenteLeitura ? 'HISTÓRICO DA CONSULTA' : 'ATENDIMENTO EM ANDAMENTO'}</Text></View>
            <Text style={styles.doctor} numberOfLines={1} ellipsizeMode="tail">{medicoNome || 'Médico da ConsultaJá24h'}</Text>
            <Text style={styles.id}>Atendimento #{atendimentoId}</Text>
          </View>
          <View style={styles.headerToggle}><ThemeToggle /></View>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color="#16c783" /></View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => setMenuAnexo(false)}
          >
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{somenteLeitura ? 'Esta conversa foi encerrada e permanece disponível para consulta e acesso aos documentos.' : 'Você está falando diretamente com o profissional responsável pelo seu atendimento.'}</Text>
            </View>
            {avaliavel ? <AvaliacaoConsulta atendimentoId={atendimentoId} medicoNome={medicoNome} /> : null}
            {mensagens.length === 0 ? (
              <View style={styles.empty}><Text style={styles.emptyTitle}>Conversa iniciada</Text><Text style={styles.emptyText}>Envie uma mensagem quando quiser complementar alguma informação.</Text></View>
            ) : mensagens.map((m) => {
              const respondida = m.reply_to_id ? mensagensPorId.get(m.reply_to_id) : null;
              const isAudio = m.arquivo_tipo === 'audio' && !!m.arquivo_url;
              return (
                <SwipeMessage key={String(m.id)} mensagem={m} somenteLeitura={somenteLeitura} onReply={selecionarResposta}>
                  <View style={[styles.messageRow, m.autor === 'paciente' ? styles.mineRow : styles.theirRow]}>
                    <View style={[styles.bubble, m.autor === 'paciente' ? styles.mineBubble : styles.theirBubble]}>
                      {respondida ? (
                        <View style={styles.quotedMessage}>
                          <Text style={styles.quotedAuthor}>{respondida.autor === 'paciente' ? 'Você' : (medicoNome || 'Médico')}</Text>
                          <Text style={styles.quotedText} numberOfLines={2}>{resumoMensagem(respondida)}</Text>
                        </View>
                      ) : null}
                      {isAudio ? <AudioMessage url={String(m.arquivo_url)} /> : null}
                      {m.arquivo_url && !isAudio ? (
                        <Pressable onPress={() => abrirArquivo(m)} style={styles.fileCard}>
                          <View style={styles.fileIcon}>{m.arquivo_tipo === 'imagem' ? <PhotoIcon color="#78f25f" /> : <FileIcon color="#78f25f" />}</View>
                          <View style={styles.fileMeta}>
                            <Text style={styles.fileName} numberOfLines={2}>{m.arquivo_nome || 'Documento'}</Text>
                            <Text style={styles.fileType}>{m.arquivo_tipo === 'pdf' ? 'Documento PDF' : m.arquivo_tipo === 'imagem' ? 'Imagem' : 'Arquivo'}</Text>
                          </View>
                          <Text style={styles.fileArrow}>›</Text>
                        </Pressable>
                      ) : null}
                      {m.texto ? <Text style={[styles.messageText, m.autor === 'paciente' && styles.mineText]}>{m.texto}</Text> : null}
                      <View style={styles.metaRow}>
                        <Text style={[styles.time, m.autor === 'paciente' && styles.mineTime]}>{new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
                        {m.autor === 'paciente' ? <View style={styles.delivery}><DeliveryChecks read={!!m.lido_medico_em} /></View> : null}
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
                <Pressable onPress={() => setRespondendo(null)} style={styles.replyClose} accessibilityLabel="Cancelar resposta"><CloseIcon /></Pressable>
              </View>
            ) : null}

            <View style={styles.composer}>
              <Pressable onPress={() => setMenuAnexo((v) => !v)} style={styles.iconButton} accessibilityLabel="Anexar"><ClipIcon /></Pressable>
              <TextInput
                ref={inputRef}
                value={texto}
                onChangeText={setTexto}
                onFocus={() => setMenuAnexo(false)}
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
              {texto.trim() ? (
                <Pressable onPress={enviar} disabled={enviando} style={[styles.send, enviando && styles.sendDisabled]} accessibilityLabel="Enviar mensagem">{enviando ? <ActivityIndicator color="#07100f" size="small" /> : <SendIcon />}</Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {menuAnexoRenderizado ? (
        <View style={styles.attachmentOverlay}>
          <Pressable style={styles.attachmentBackdrop} onPress={() => setMenuAnexo(false)} accessibilityLabel="Fechar menu de anexos" />
          <Animated.View
            style={[
              styles.attachmentMenu,
              {
                opacity: attachmentAnim,
                transform: [
                  { translateY: attachmentAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                  { scale: attachmentAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                ],
              },
            ]}
          >
            <Pressable onPress={abrirCamera} style={styles.attachmentOption}><View style={styles.attachmentIcon}><CameraIcon /></View><Text style={styles.attachmentLabel}>Câmera</Text></Pressable>
            <Pressable onPress={abrirFotos} style={styles.attachmentOption}><View style={styles.attachmentIcon}><PhotoIcon /></View><Text style={styles.attachmentLabel}>Fotos</Text></Pressable>
            <Pressable onPress={abrirDocumento} style={styles.attachmentOption}><View style={styles.attachmentIcon}><FileIcon /></View><Text style={styles.attachmentLabel}>Documento</Text></Pressable>
          </Animated.View>
        </View>
      ) : null}

      <Modal visible={!!viewer} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setViewer(null)}>
        <SafeAreaView style={styles.viewerSafe}>
          <View style={styles.viewerHeader}>
            <Pressable onPress={() => setViewer(null)} style={styles.viewerBack} accessibilityLabel="Fechar documento"><Text style={styles.backText}>‹</Text></Pressable>
            <Text style={styles.viewerTitle} numberOfLines={1}>{viewer?.name || 'Documento'}</Text>
            <Pressable
              onPress={() => viewer?.url && Linking.openURL(viewer.url)}
              style={styles.viewerExternal}
              accessibilityLabel="Abrir documento no navegador"
            >
              <Text style={styles.viewerExternalText}>↗</Text>
            </Pressable>
          </View>
          {viewer?.type === 'imagem' ? (
            <View style={styles.imageViewer}><Image source={{ uri: viewer.url }} style={styles.viewerImage} resizeMode="contain" /></View>
          ) : viewer?.url ? (
            <WebView source={{ uri: viewer.url }} style={styles.webview} startInLoadingState renderLoading={() => <View style={styles.center}><ActivityIndicator color="#16c783" /></View>} />
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: themeColor('#e8efeb', '#07100f') },
  screen: { flex: 1, backgroundColor: themeColor('#e8efeb', '#07100f') },
  header: { minHeight: 86, paddingHorizontal: 14, paddingTop: 7, paddingBottom: 11, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#e4ece7', '#0d1916') },
  backText: { color: themeColor('#14201d', '#eef5f1'), fontSize: 34, lineHeight: 36, marginTop: -3 },
  headerCenter: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 6 },
  headerToggle: { width: 68, alignItems: 'flex-end' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16c783' },
  status: { flexShrink: 1, fontSize: 9, fontWeight: '700', letterSpacing: 1, color: themeColor('#18724f', '#79a493') },
  doctor: { marginTop: 4, maxWidth: '100%', color: themeColor('#14201d', '#f2f7f4'), fontSize: 15, fontWeight: '700', textAlign: 'center' },
  id: { marginTop: 2, color: themeColor('#66736e', '#6e7e78'), fontSize: 10.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messages: { flex: 1 },
  messagesContent: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 20 },
  notice: { alignSelf: 'center', maxWidth: 310, backgroundColor: themeColor('#e3ebe6', '#0d1916'), borderRadius: 13, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 16 },
  noticeText: { textAlign: 'center', color: themeColor('#66736e', '#899892'), fontSize: 11, lineHeight: 16 },
  ratingCard: { marginBottom: 16, borderRadius: 18, padding: 16, backgroundColor: themeColor('#f7fbf8', '#0d1916'), borderWidth: 1, borderColor: themeColor('#dce8e1', '#183029') },
  ratingEyebrow: { color: themeColor('#18724f', '#78f25f'), fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  ratingTitle: { marginTop: 7, color: themeColor('#14201d', '#f1f7f4'), fontSize: 15, fontWeight: '800', lineHeight: 20 },
  ratingText: { marginTop: 5, color: themeColor('#66736e', '#87968f'), fontSize: 11.5, lineHeight: 17 },
  ratingStars: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, marginBottom: 4 },
  ratingStarButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  ratingInput: { minHeight: 72, marginTop: 10, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, color: themeColor('#14201d', '#e9f1ed'), backgroundColor: themeColor('#edf4f0', '#09120f'), borderWidth: 1, borderColor: themeColor('#d5e2db', '#1b3029'), fontSize: 12.5, lineHeight: 18 },
  ratingSave: { marginTop: 10, minHeight: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#78f25f' },
  ratingSaveText: { color: '#07100f', fontSize: 12.5, fontWeight: '800' },
  ratingThanks: { marginBottom: 16, borderRadius: 16, padding: 14, backgroundColor: themeColor('#eef7f1', '#0d1916'), borderWidth: 1, borderColor: themeColor('#dce8e1', '#183029') },
  ratingThanksTitle: { color: themeColor('#14201d', '#f1f7f4'), fontSize: 13.5, fontWeight: '800' },
  ratingThanksText: { marginTop: 4, color: themeColor('#66736e', '#87968f'), fontSize: 11.5, lineHeight: 17 },
  empty: { marginTop: 42, alignItems: 'center', paddingHorizontal: 28 },
  emptyTitle: { color: themeColor('#26332f', '#dbe6e1'), fontSize: 16, fontWeight: '700' },
  emptyText: { color: themeColor('#66736e', '#75837e'), fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  swipeWrap: { position: 'relative' },
  replyHint: { position: 'absolute', left: 9, top: '50%', marginTop: -16, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#e7f4ed', '#10231d') },
  messageRow: { width: '100%', marginVertical: 4 },
  mineRow: { alignItems: 'flex-end' },
  theirRow: { alignItems: 'flex-start' },
  bubble: { maxWidth: '84%', borderRadius: 17, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6 },
  mineBubble: { backgroundColor: themeColor('#d8eee3', '#123d31'), borderBottomRightRadius: 6 },
  theirBubble: { backgroundColor: themeColor('#f7faf8', '#10201c'), borderBottomLeftRadius: 6 },
  quotedMessage: { backgroundColor: themeColor('#edf3f0', '#0c1916'), borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7, marginBottom: 7, minWidth: 150 },
  quotedAuthor: { color: themeColor('#18724f', '#76ad97'), fontSize: 10, fontWeight: '700', marginBottom: 2 },
  quotedText: { color: themeColor('#596763', '#9cad a6'.replace(' ','')), fontSize: 11, lineHeight: 15 },
  messageText: { color: themeColor('#26332f', '#dce6e2'), fontSize: 14.5, lineHeight: 19 },
  mineText: { color: themeColor('#193c31', '#edf8f3') },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 4 },
  time: { color: themeColor('#7a8782', '#71807b'), fontSize: 9.5 },
  mineTime: { color: themeColor('#567268', '#769087') },
  delivery: { width: 18, alignItems: 'flex-end', justifyContent: 'center' },
  fileCard: { minWidth: 230, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: themeColor('#f3f7f5', '#0c1916'), borderRadius: 13, padding: 10, marginBottom: 7 },
  fileIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#e4f4ec', '#123027') },
  fileMeta: { flex: 1, minWidth: 0 },
  fileName: { color: themeColor('#14201d', '#eef5f1'), fontSize: 12.5, fontWeight: '700' },
  fileType: { color: themeColor('#66736e', '#76867f'), fontSize: 10.5, marginTop: 2 },
  fileArrow: { color: themeColor('#66736e', '#71807b'), fontSize: 24 },
  audioCard: { minWidth: 230, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3, marginBottom: 4 },
  audioPlay: { width: 36, height: 36, borderRadius: 18, backgroundColor: themeColor('#e4f4ec', '#123027'), alignItems: 'center', justifyContent: 'center' },
  audioBody: { flex: 1 },
  audioTrack: { height: 3, borderRadius: 2, backgroundColor: themeColor('#cfded7', '#28473c'), overflow: 'hidden' },
  audioProgress: { height: 3, borderRadius: 2, backgroundColor: '#16c783' },
  audioTime: { marginTop: 5, color: themeColor('#66736e', '#7f9189'), fontSize: 9.5 },
  error: { color: '#f29aa1', textAlign: 'center', fontSize: 11.5, marginTop: 12 },
  composerArea: { paddingHorizontal: 10, paddingTop: 7, paddingBottom: Platform.OS === 'ios' ? 6 : 10, backgroundColor: themeColor('#e8efeb', '#07100f') },
  composer: { minHeight: 52, flexDirection: 'row', alignItems: 'flex-end', gap: 7, backgroundColor: themeColor('#f7faf8', '#0d1916'), borderRadius: 19, padding: 5 },
  iconButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 42, maxHeight: 110, paddingHorizontal: 4, paddingVertical: 10, color: themeColor('#14201d', '#eef5f1'), fontSize: 15 },
  send: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#16c783', alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.55 },
  attachmentOverlay: { ...StyleSheet.absoluteFill, zIndex: 50 },
  attachmentBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'transparent' },
  attachmentMenu: { position: 'absolute', left: 12, bottom: Platform.OS === 'ios' ? 82 : 72, flexDirection: 'row', gap: 7, backgroundColor: themeColor('#f7faf8', '#0d1916'), borderRadius: 18, padding: 8, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 9 },
  attachmentOption: { width: 76, minHeight: 67, borderRadius: 13, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: themeColor('#edf3ef', '#101d1a') },
  attachmentIcon: { height: 23, justifyContent: 'center' },
  attachmentLabel: { color: themeColor('#52605b', '#a9b5b0'), fontSize: 10.5, fontWeight: '600' },
  replyComposer: { flexDirection: 'row', alignItems: 'center', backgroundColor: themeColor('#eef3f0', '#0d1916'), borderRadius: 13, marginBottom: 6, paddingLeft: 12, minHeight: 48 },
  replyComposerBody: { flex: 1, minWidth: 0 },
  replyComposerLabel: { color: themeColor('#18724f', '#76ad97'), fontSize: 10.5, fontWeight: '800' },
  replyComposerText: { color: themeColor('#66736e', '#95a59f'), fontSize: 11.5, marginTop: 2 },
  replyClose: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  recordingBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: themeColor('#ffffff', '#0d1916'), borderRadius: 19, padding: 5 },
  recordCancel: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  recordDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#e15b64', marginLeft: 3, marginRight: 8 },
  recordingText: { flex: 1, color: themeColor('#52605b', '#dce6e2'), fontSize: 13.5, fontWeight: '700' },
  recordSend: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#16c783', alignItems: 'center', justifyContent: 'center' },
  viewerSafe: { flex: 1, backgroundColor: themeColor('#e8efeb', '#07100f') },
  viewerHeader: { minHeight: 64, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewerBack: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#ffffff', '#0d1916') },
  viewerTitle: { flex: 1, marginHorizontal: 10, textAlign: 'center', color: themeColor('#14201d', '#eef5f1'), fontSize: 15, fontWeight: '700' },
  viewerExternal: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dfe8e3', '#0d1916') },
  viewerExternalText: { color: themeColor('#18724f', '#78f25f'), fontSize: 22, fontWeight: '500', marginTop: -2 },
  webview: { flex: 1, backgroundColor: themeColor('#e8efeb', '#07100f') },
  imageViewer: { flex: 1, backgroundColor: themeColor('#eef2f0', '#040807'), alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
});
