import fs from 'node:fs';

const file = 'src/components/ChatPaciente.tsx';
let s = fs.readFileSync(file, 'utf8');

const oldSwipe = `function SwipeMessage({ mensagem, somenteLeitura, onReply, children }: SwipeProps) {
  const x = useRef(new Animated.Value(0)).current;
  const responder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        !somenteLeitura && gesture.dx > 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 0.65,
      onPanResponderMove: (_event, gesture) => {
        x.setValue(Math.max(0, Math.min(70, gesture.dx)));
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dx >= 24) onReply(mensagem);
        Animated.spring(x, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 240 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(x, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 240 }).start();
      },
    }),
    [mensagem, onReply, somenteLeitura, x],
  );`;

const newSwipe = `function SwipeMessage({ mensagem, somenteLeitura, onReply, children }: SwipeProps) {
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
  );`;

if (!s.includes(oldSwipe) && !s.includes('const maxSwipeX = useRef(0);')) {
  throw new Error('Swipe target not found');
}
if (s.includes(oldSwipe)) s = s.replace(oldSwipe, newSwipe);

const sendFnEnd = `  async function abrirCamera() {`;
const confirmFn = `  function confirmarEnvioArquivo(arquivo: UploadChatPaciente, tamanho?: number | null) {
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

  async function abrirCamera() {`;

if (!s.includes('function confirmarEnvioArquivo(')) {
  if (!s.includes(sendFnEnd)) throw new Error('Attachment confirmation insertion point not found');
  s = s.replace(sendFnEnd, confirmFn);
}

s = s.replace(
`    await enviarArquivo({
      uri: asset.uri,
      name: asset.fileName || \`Foto_\${Date.now()}.jpg\`,
      type: asset.mimeType || 'image/jpeg',
    }, asset.fileSize);`,
`    confirmarEnvioArquivo({
      uri: asset.uri,
      name: asset.fileName || \`Foto_\${Date.now()}.jpg\`,
      type: asset.mimeType || 'image/jpeg',
    }, asset.fileSize);`
);

s = s.replace(
`    await enviarArquivo({
      uri: asset.uri,
      name: asset.fileName || \`Imagem_\${Date.now()}.jpg\`,
      type: asset.mimeType || 'image/jpeg',
    }, asset.fileSize);`,
`    confirmarEnvioArquivo({
      uri: asset.uri,
      name: asset.fileName || \`Imagem_\${Date.now()}.jpg\`,
      type: asset.mimeType || 'image/jpeg',
    }, asset.fileSize);`
);

s = s.replace(
`    await enviarArquivo({
      uri: asset.uri,
      name: asset.name || \`Documento_\${Date.now()}\`,
      type: asset.mimeType || 'application/pdf',
    }, asset.size);`,
`    confirmarEnvioArquivo({
      uri: asset.uri,
      name: asset.name || \`Documento_\${Date.now()}\`,
      type: asset.mimeType || 'application/pdf',
    }, asset.size);`
);

fs.writeFileSync(file, s);
console.log('Attachment confirmation and robust reply swipe applied.');
