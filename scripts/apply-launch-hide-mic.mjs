import fs from 'node:fs';

const path = 'src/components/ChatPaciente.tsx';
let s = fs.readFileSync(path, 'utf8');

function exact(from, to, label) {
  if (!s.includes(from)) throw new Error(`Trecho nao encontrado: ${label}`);
  s = s.replace(from, to);
}

exact(
`import {\n  AudioModule,\n  getRecordingPermissionsAsync,\n  requestRecordingPermissionsAsync,\n  RecordingPresets,\n  setAudioModeAsync,\n  useAudioPlayer,\n  useAudioPlayerStatus,\n  useAudioRecorder,\n  useAudioRecorderState,\n} from 'expo-audio';`,
`import {\n  useAudioPlayer,\n  useAudioPlayerStatus,\n} from 'expo-audio';`,
'audio imports',
);

exact(
`  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);\n  const recorderState = useAudioRecorderState(recorder, 250);\n`,
'',
'recorder hooks',
);

const start = s.indexOf('  async function iniciarAudio() {');
const end = s.indexOf('  function abrirArquivo(', start);
if (start === -1 || end === -1) throw new Error('Funcoes de gravacao nao encontradas');
s = s.slice(0, start) + s.slice(end);

exact(
`            {recorderState.isRecording ? (\n              <View style={styles.recordingBar}>\n                <Pressable onPress={() => finalizarAudio(false)} style={styles.recordCancel} accessibilityLabel="Cancelar áudio"><CloseIcon color="#a9b5b0" /></Pressable>\n                <View style={styles.recordDot} />\n                <Text style={styles.recordingText}>Gravando {formatDuration(recorderState.durationMillis / 1000)}</Text>\n                <Pressable onPress={() => finalizarAudio(true)} style={styles.recordSend} accessibilityLabel="Enviar áudio"><SendIcon /></Pressable>\n              </View>\n            ) : (\n              <View style={styles.composer}>\n                <Pressable onPress={() => setMenuAnexo((v) => !v)} style={styles.iconButton} accessibilityLabel="Anexar"><ClipIcon /></Pressable>\n                <TextInput\n                  ref={inputRef}\n                  value={texto}\n                  onChangeText={setTexto}\n                  onFocus={() => setMenuAnexo(false)}\n                  placeholder="Escreva uma mensagem..."\n                  placeholderTextColor="#6f7d78"\n                  style={styles.input}\n                  multiline\n                  maxLength={3000}\n                  editable={!enviando}\n                  returnKeyType="send"\n                  submitBehavior="submit"\n                  onSubmitEditing={enviar}\n                />\n                {texto.trim() ? (\n                  <Pressable onPress={enviar} disabled={enviando} style={[styles.send, enviando && styles.sendDisabled]} accessibilityLabel="Enviar mensagem">{enviando ? <ActivityIndicator color="#07100f" size="small" /> : <SendIcon />}</Pressable>\n                ) : (\n                  <Pressable onPress={iniciarAudio} disabled={enviando} style={styles.iconButton} accessibilityLabel="Gravar áudio"><MicIcon /></Pressable>\n                )}\n              </View>\n            )}`,
`            <View style={styles.composer}>\n              <Pressable onPress={() => setMenuAnexo((v) => !v)} style={styles.iconButton} accessibilityLabel="Anexar"><ClipIcon /></Pressable>\n              <TextInput\n                ref={inputRef}\n                value={texto}\n                onChangeText={setTexto}\n                onFocus={() => setMenuAnexo(false)}\n                placeholder="Escreva uma mensagem..."\n                placeholderTextColor="#6f7d78"\n                style={styles.input}\n                multiline\n                maxLength={3000}\n                editable={!enviando}\n                returnKeyType="send"\n                submitBehavior="submit"\n                onSubmitEditing={enviar}\n              />\n              {texto.trim() ? (\n                <Pressable onPress={enviar} disabled={enviando} style={[styles.send, enviando && styles.sendDisabled]} accessibilityLabel="Enviar mensagem">{enviando ? <ActivityIndicator color="#07100f" size="small" /> : <SendIcon />}</Pressable>\n              ) : null}\n            </View>`,
'composer sem microfone',
);

s = s.replaceAll('menuAnexoRenderizado && !recorderState.isRecording', 'menuAnexoRenderizado');

fs.writeFileSync(path, s);
console.log('Launch-safe no-audio patch applied.');
