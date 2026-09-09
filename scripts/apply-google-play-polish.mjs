import fs from 'node:fs';

const appPath = 'App.tsx';
const rootPath = 'src/AppRoot.tsx';
const chatPath = 'src/components/ChatPaciente.tsx';
const viewerPath = 'src/components/DocumentViewer.tsx';
const themePath = 'src/components/ThemeToggle.tsx';

let app = fs.readFileSync(appPath, 'utf8');
let root = fs.readFileSync(rootPath, 'utf8');
let chat = fs.readFileSync(chatPath, 'utf8');
let viewer = fs.readFileSync(viewerPath, 'utf8');
let theme = fs.readFileSync(themePath, 'utf8');

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`${label} target not found`);
  return source.replace(from, to);
}

// Android back: preserve expected in-app navigation instead of exiting from nested screens.
app = replaceOnce(
  app,
  `  ActivityIndicator,\n  Alert,`,
  `  ActivityIndicator,\n  Alert,\n  BackHandler,`,
  'App BackHandler import',
);

const appBackEffect = `\n  useEffect(() => {\n    if (Platform.OS !== 'android') return;\n    const sub = BackHandler.addEventListener('hardwareBackPress', () => {\n      if (tela !== 'home') {\n        setWebPage(null);\n        setRenovacaoSelecionada(null);\n        setHistoricoSelecionado(null);\n        setTela('home');\n        return true;\n      }\n      if (!paciente && etapa !== 'telefone') {\n        setEtapa('telefone');\n        setCodigo('');\n        setChallengeId('');\n        return true;\n      }\n      return false;\n    });\n    return () => sub.remove();\n  }, [etapa, paciente, tela]);\n`;

const appEffectAnchor = `  useEffect(() => {\n    restaurarSessao();\n  }, []);\n`;
if (!app.includes(appBackEffect.trim())) {
  app = replaceOnce(app, appEffectAnchor, appEffectAnchor + appBackEffect, 'App Android back effect');
}

root = replaceOnce(
  root,
  `  ActivityIndicator,\n  Animated,\n  AppState,`,
  `  ActivityIndicator,\n  Animated,\n  AppState,\n  BackHandler,`,
  'AppRoot BackHandler import',
);

const rootBackEffect = `\n  useEffect(() => {\n    if (Platform.OS !== 'android') return;\n    const sub = BackHandler.addEventListener('hardwareBackPress', () => {\n      if (modoAtendimento) {\n        if (atendimento?.etapa === 'chat') chatFechadoManualRef.current = true;\n        setModoAtendimento(false);\n        setMostrarInicio(true);\n        return true;\n      }\n      if (atendimento && !mostrarInicio && !betaEmTriagem) {\n        setMostrarInicio(true);\n        return true;\n      }\n      return false;\n    });\n    return () => sub.remove();\n  }, [atendimento, betaEmTriagem, modoAtendimento, mostrarInicio]);\n`;

const rootAnchor = `  const betaEmTriagem = atendimento?.etapa === 'triagem' && atendimento.pagamento_metodo === 'beta_test';\n`;
if (!root.includes(rootBackEffect.trim())) {
  root = replaceOnce(root, rootAnchor, rootAnchor + rootBackEffect, 'AppRoot Android back effect');
}

// Camera copy: do not tell Android users to open iPhone settings.
chat = replaceOnce(
  chat,
  `      Alert.alert('Câmera bloqueada', 'Autorize o acesso à câmera nos Ajustes do iPhone para tirar fotos pelo atendimento.');`,
  `      Alert.alert('Câmera bloqueada', Platform.OS === 'ios' ? 'Autorize o acesso à câmera nos Ajustes do iPhone para tirar fotos pelo atendimento.' : 'Autorize o acesso à câmera nas configurações do Android para tirar fotos pelo atendimento.');`,
  'camera permission copy',
);

// Android WebView does not render PDFs reliably. Open the PDF URL with the system viewer/browser instead.
viewer = replaceOnce(
  viewer,
  `        ) : url ? (\n          <WebView\n            source={{ uri: url }}\n            style={styles.webview}\n            startInLoadingState\n            renderLoading={() => <View style={styles.loading}><ActivityIndicator color=\"#16c783\" /></View>}\n          />\n        ) : null}`,
  `        ) : url ? (\n          Platform.OS === 'android' ? (\n            <View style={styles.androidPdfWrap}>\n              <Text style={styles.androidPdfTitle}>Documento pronto para abrir</Text>\n              <Text style={styles.androidPdfText}>No Android, o PDF será aberto no visualizador seguro do aparelho.</Text>\n              <Pressable onPress={openExternal} style={styles.androidPdfButton} accessibilityRole=\"button\" accessibilityLabel=\"Abrir PDF\">\n                <Text style={styles.androidPdfButtonText}>Abrir PDF</Text>\n              </Pressable>\n            </View>\n          ) : (\n            <WebView\n              source={{ uri: url }}\n              style={styles.webview}\n              startInLoadingState\n              renderLoading={() => <View style={styles.loading}><ActivityIndicator color=\"#16c783\" /></View>}\n            />\n          )\n        ) : null}`,
  'DocumentViewer Android PDF fallback',
);

viewer = replaceOnce(
  viewer,
  `  image: { width: '100%', height: '100%' },\n});`,
  `  image: { width: '100%', height: '100%' },\n  androidPdfWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },\n  androidPdfTitle: { color: themeColor('#14201d', '#eef5f1'), fontSize: 18, fontWeight: '800', textAlign: 'center' },\n  androidPdfText: { color: themeColor('#66736e', '#91a29b'), fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8, marginBottom: 18 },\n  androidPdfButton: { minHeight: 48, paddingHorizontal: 22, borderRadius: 14, backgroundColor: '#16c783', alignItems: 'center', justifyContent: 'center' },\n  androidPdfButtonText: { color: '#07100f', fontSize: 15, fontWeight: '800' },\n});`,
  'DocumentViewer Android PDF styles',
);

chat = replaceOnce(
  chat,
  `          ) : viewer?.url ? (\n            <WebView source={{ uri: viewer.url }} style={styles.webview} startInLoadingState renderLoading={() => <View style={styles.center}><ActivityIndicator color=\"#16c783\" /></View>} />\n          ) : null}`,
  `          ) : viewer?.url ? (\n            Platform.OS === 'android' ? (\n              <View style={styles.androidPdfWrap}>\n                <Text style={styles.androidPdfTitle}>Documento pronto para abrir</Text>\n                <Text style={styles.androidPdfText}>No Android, o PDF será aberto no visualizador do aparelho.</Text>\n                <Pressable onPress={() => Linking.openURL(viewer.url)} style={styles.androidPdfButton} accessibilityRole=\"button\" accessibilityLabel=\"Abrir PDF\">\n                  <Text style={styles.androidPdfButtonText}>Abrir PDF</Text>\n                </Pressable>\n              </View>\n            ) : (\n              <WebView source={{ uri: viewer.url }} style={styles.webview} startInLoadingState renderLoading={() => <View style={styles.center}><ActivityIndicator color=\"#16c783\" /></View>} />\n            )\n          ) : null}`,
  'Chat Android PDF fallback',
);

chat = replaceOnce(
  chat,
  `  viewerExternal: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dfe8e3', '#0d1916') },`,
  `  viewerExternal: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dfe8e3', '#0d1916') },\n  androidPdfWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },\n  androidPdfTitle: { color: themeColor('#14201d', '#eef5f1'), fontSize: 18, fontWeight: '800', textAlign: 'center' },\n  androidPdfText: { color: themeColor('#66736e', '#91a29b'), fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8, marginBottom: 18 },\n  androidPdfButton: { minHeight: 48, paddingHorizontal: 22, borderRadius: 14, backgroundColor: '#16c783', alignItems: 'center', justifyContent: 'center' },\n  androidPdfButtonText: { color: '#07100f', fontSize: 15, fontWeight: '800' },`,
  'Chat Android PDF styles',
);

// Until Android screens subscribe to Appearance changes, do not expose a toggle that only moves visually.
theme = replaceOnce(
  theme,
  `export default function ThemeToggle() {\n  const [scheme, setScheme] = useState<ColorSchemeName>('dark');`,
  `export default function ThemeToggle() {\n  const [scheme, setScheme] = useState<ColorSchemeName>('dark');`,
  'ThemeToggle anchor',
);

const themeReturnAnchor = `  const dark = scheme !== 'light';\n\n  async function toggle() {`;
const themeReturnReplacement = `  const dark = scheme !== 'light';\n\n  if (Platform.OS === 'android') return null;\n\n  async function toggle() {`;
if (!theme.includes(`if (Platform.OS === 'android') return null;`)) {
  theme = replaceOnce(theme, themeReturnAnchor, themeReturnReplacement, 'ThemeToggle Android guard');
}

fs.writeFileSync(appPath, app);
fs.writeFileSync(rootPath, root);
fs.writeFileSync(chatPath, chat);
fs.writeFileSync(viewerPath, viewer);
fs.writeFileSync(themePath, theme);

console.log('Google Play polish patch applied.');
