import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s);
function once(s, a, b, label) {
  if (!s.includes(a)) throw new Error(`Anchor not found: ${label}`);
  return s.replace(a, b);
}

function addDynamicTheme(s, importAnchor) {
  if (!s.includes('DynamicColorIOS,')) {
    s = once(s, importAnchor, importAnchor.replace('\n}', '\n  DynamicColorIOS,\n  Platform,\n}'), 'dynamic color imports');
  }
  if (!s.includes('function themeColor(light: string, dark: string)')) {
    const marker = "} from 'react-native';\n";
    s = once(
      s,
      marker,
      marker + "\nfunction themeColor(light: string, dark: string) {\n  return Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : dark;\n}\n",
      'theme helper',
    );
  }
  return s;
}

function recolor(s) {
  const pairs = [
    ["backgroundColor: '#07100f'", "backgroundColor: themeColor('#f6f8f7', '#07100f')"],
    ["backgroundColor: '#0b1715'", "backgroundColor: themeColor('#ffffff', '#0b1715')"],
    ["backgroundColor: '#0d1916'", "backgroundColor: themeColor('#ffffff', '#0d1916')"],
    ["backgroundColor: '#10201d'", "backgroundColor: themeColor('#eef7f1', '#10201d')"],
    ["backgroundColor: '#101d1a'", "backgroundColor: themeColor('#ffffff', '#101d1a')"],
    ["backgroundColor: '#0f211c'", "backgroundColor: themeColor('#eef7f1', '#0f211c')"],
    ["backgroundColor: '#123027'", "backgroundColor: themeColor('#e7f7ee', '#123027')"],
    ["backgroundColor: '#14231f'", "backgroundColor: themeColor('#eef4f1', '#14231f')"],
    ["backgroundColor: '#10201c'", "backgroundColor: themeColor('#ffffff', '#10201c')"],
    ["backgroundColor: '#123d31'", "backgroundColor: themeColor('#dff7eb', '#123d31')"],
    ["backgroundColor: '#0c1916'", "backgroundColor: themeColor('#f1f6f3', '#0c1916')"],
    ["backgroundColor: '#10231d'", "backgroundColor: themeColor('#e7f7ee', '#10231d')"],
    ["borderColor: '#1d342f'", "borderColor: themeColor('#dce6e1', '#1d342f')"],
    ["borderColor: '#21483c'", "borderColor: themeColor('#cbe2d7', '#21483c')"],
    ["borderColor: '#275044'", "borderColor: themeColor('#c6ddd2', '#275044')"],
    ["borderColor: '#1b2b26'", "borderColor: themeColor('#dfe7e2', '#1b2b26')"],
    ["borderColor: '#223a34'", "borderColor: themeColor('#d8e3dd', '#223a34')"],
    ["borderColor: '#285746'", "borderColor: themeColor('#b9d9ca', '#285746')"],
    ["borderColor: '#1b302a'", "borderColor: themeColor('#dce5e0', '#1b302a')"],
    ["borderColor: '#1b5645'", "borderColor: themeColor('#b7dfcb', '#1b5645')"],
    ["borderBottomColor: '#1d342f'", "borderBottomColor: themeColor('#dce6e1', '#1d342f')"],
    ["borderBottomColor: '#16221f'", "borderBottomColor: themeColor('#dce6e1', '#16221f')"],
    ["borderTopColor: '#1d342f'", "borderTopColor: themeColor('#dce6e1', '#1d342f')"],
    ["borderTopColor: '#192823'", "borderTopColor: themeColor('#e0e8e4', '#192823')"],
    ["color: '#fff'", "color: themeColor('#14201d', '#fff')"],
    ["color: '#eef5f1'", "color: themeColor('#14201d', '#eef5f1')"],
    ["color: '#edf5f1'", "color: themeColor('#14201d', '#edf5f1')"],
    ["color: '#f2f7f4'", "color: themeColor('#14201d', '#f2f7f4')"],
    ["color: '#dce6e2'", "color: themeColor('#26332f', '#dce6e2')"],
    ["color: '#dce8e3'", "color: themeColor('#26332f', '#dce8e3')"],
    ["color: '#dbe6e1'", "color: themeColor('#26332f', '#dbe6e1')"],
    ["color: '#a9b5b0'", "color: themeColor('#5f6c67', '#a9b5b0')"],
    ["color: '#8a97a6'", "color: themeColor('#66736e', '#8a97a6')"],
    ["color: '#84908c'", "color: themeColor('#66736e', '#84908c')"],
    ["color: '#9ba9a4'", "color: themeColor('#596763', '#9ba9a4')"],
    ["color: '#71807b'", "color: themeColor('#66736e', '#71807b')"],
    ["color: '#75827e'", "color: themeColor('#66736e', '#75827e')"],
    ["color: '#76867f'", "color: themeColor('#66736e', '#76867f')"],
    ["color: '#899892'", "color: themeColor('#66736e', '#899892')"],
    ["color: '#75837e'", "color: themeColor('#66736e', '#75837e')"],
    ["color: '#6e7e78'", "color: themeColor('#66736e', '#6e7e78')"],
    ["color: '#91a29b'", "color: themeColor('#66736e', '#91a29b')"],
    ["color: '#78f25f'", "color: themeColor('#0b8f61', '#78f25f')"],
    ["color: '#79a493'", "color: themeColor('#18724f', '#79a493')"],
  ];
  for (const [a, b] of pairs) s = s.split(a).join(b);
  return s;
}

function patchApp() {
  const p = 'App.tsx';
  let s = read(p);

  if (!s.includes('DynamicColorIOS,')) {
    s = once(s, '  ActivityIndicator,\n  Alert,', '  ActivityIndicator,\n  Alert,\n  DynamicColorIOS,', 'App DynamicColorIOS import');
  }
  if (!s.includes("  Platform,")) throw new Error('App Platform import missing');
  if (!s.includes('function themeColor(light: string, dark: string)')) {
    s = once(s, "} from 'react-native';\n", "} from 'react-native';\n\nfunction themeColor(light: string, dark: string) {\n  return Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : dark;\n}\n", 'App theme helper');
  }
  if (!s.includes("import ThemeToggle from './src/components/ThemeToggle';")) {
    s = once(s, "import ChatPaciente from './src/components/ChatPaciente';", "import ChatPaciente from './src/components/ChatPaciente';\nimport ThemeToggle from './src/components/ThemeToggle';", 'ThemeToggle import');
  }
  if (!s.includes("const [historicoOrigem, setHistoricoOrigem]")) {
    s = once(s,
      "  const [historicoSelecionado, setHistoricoSelecionado] = useState<AtendimentoHistorico | null>(null);",
      "  const [historicoSelecionado, setHistoricoSelecionado] = useState<AtendimentoHistorico | null>(null);\n  const [historicoOrigem, setHistoricoOrigem] = useState<'home' | 'documentos'>('home');",
      'history origin state');
  }
  s = s.replace("if (item) { setHistoricoSelecionado(item); setTela('historico-chat'); }", "if (item) { setHistoricoOrigem('documentos'); setHistoricoSelecionado(item); setTela('historico-chat'); }");
  s = s.replace("onVoltar={() => { setTela('home'); setHistoricoSelecionado(null); }}", "onVoltar={() => { setTela(historicoOrigem === 'documentos' ? 'documentos' : 'home'); setHistoricoSelecionado(null); }}");
  s = s.replace("onAbrirAtendimento={(item) => { setHistoricoSelecionado(item); setTela('historico-chat'); }}", "onAbrirAtendimento={(item) => { setHistoricoOrigem('home'); setHistoricoSelecionado(item); setTela('historico-chat'); }}");

  if (!s.includes('<ThemeToggle />')) {
    s = once(s,
      `          <Pressable onPress={onPerfil} style={styles.avatarButton} accessibilityLabel="Abrir perfil">\n            <Text style={styles.avatarText}>{primeiroNome.slice(0, 1).toUpperCase()}</Text>\n          </Pressable>`,
      `          <View style={styles.topActions}>\n            <ThemeToggle />\n            <Pressable onPress={onPerfil} style={styles.avatarButton} accessibilityLabel="Abrir perfil">\n              <Text style={styles.avatarText}>{primeiroNome.slice(0, 1).toUpperCase()}</Text>\n            </Pressable>\n          </View>`,
      'theme toggle topbar');
  }

  s = s.replace(`<View style={styles.docsIcon}><Text style={styles.docsIconText}>PDF</Text></View>`, `<View style={styles.docsIcon}>\n            <View style={styles.docsGlyph}>\n              <View style={styles.docsGlyphFold} />\n              <View style={styles.docsGlyphLine} />\n              <View style={[styles.docsGlyphLine, styles.docsGlyphLineShort]} />\n            </View>\n          </View>`);

  if (!s.includes('topActions:')) s = once(s, "  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },", "  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },\n  topActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },", 'topActions style');
  if (!s.includes('docsGlyph:')) s = once(s, "  docsIconText: { color: '#78f25f', fontSize: 25, fontWeight: '400', marginTop: -2 },", "  docsIconText: { color: '#78f25f', fontSize: 25, fontWeight: '400', marginTop: -2 },\n  docsGlyph: { width: 18, height: 22, borderWidth: 1.7, borderColor: themeColor('#0b8f61', '#78f25f'), borderRadius: 3, paddingTop: 8, paddingHorizontal: 3 },\n  docsGlyphFold: { position: 'absolute', right: -1.7, top: -1.7, width: 7, height: 7, borderLeftWidth: 1.7, borderBottomWidth: 1.7, borderColor: themeColor('#0b8f61', '#78f25f'), backgroundColor: themeColor('#e7f7ee', '#123027'), borderBottomLeftRadius: 2 },\n  docsGlyphLine: { height: 1.5, borderRadius: 1, backgroundColor: themeColor('#0b8f61', '#78f25f'), marginBottom: 3 },\n  docsGlyphLineShort: { width: '65%' },", 'document glyph styles');

  s = recolor(s);
  write(p, s);
}

function patchChat() {
  const p = 'src/components/ChatPaciente.tsx';
  let s = read(p);
  if (!s.includes('DynamicColorIOS,')) s = once(s, '  Animated,\n  KeyboardAvoidingView,', '  Animated,\n  DynamicColorIOS,\n  KeyboardAvoidingView,', 'Chat DynamicColorIOS import');
  if (!s.includes('function themeColor(light: string, dark: string)')) s = once(s, "} from 'react-native';\n", "} from 'react-native';\n\nfunction themeColor(light: string, dark: string) {\n  return Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : dark;\n}\n", 'Chat theme helper');
  if (!s.includes('const hintOpacity = x.interpolate')) {
    s = once(s, "  return (\n    <View style={styles.swipeWrap}>", "  const hintOpacity = x.interpolate({ inputRange: [0, 18, 52], outputRange: [0, 0.35, 1], extrapolate: 'clamp' });\n  const hintScale = x.interpolate({ inputRange: [0, 52], outputRange: [0.72, 1], extrapolate: 'clamp' });\n\n  return (\n    <View style={styles.swipeWrap}>", 'reply hint animation vars');
    s = once(s, `<View style={styles.replyHint} pointerEvents="none">\n          <Text style={styles.replyHintIcon}>↩</Text>\n        </View>`, `<Animated.View style={[styles.replyHint, { opacity: hintOpacity, transform: [{ scale: hintScale }] }]} pointerEvents="none">\n          <Text style={styles.replyHintIcon}>↩</Text>\n        </Animated.View>`, 'reply hint animation view');
  }
  s = s.replace("{m.lido_medico_em ? 'Visualizado' : 'Enviado'}", "{m.lido_medico_em ? '✓✓ Visualizado' : '✓ Enviado'}");
  s = recolor(s);
  write(p, s);
}

function patchSimpleScreen(path) {
  let s = read(path);
  if (!s.includes('DynamicColorIOS,')) s = once(s, '  ActivityIndicator,', '  ActivityIndicator,\n  DynamicColorIOS,\n  Platform,', `${path} theme imports`);
  if (!s.includes('function themeColor(light: string, dark: string)')) s = once(s, "} from 'react-native';\n", "} from 'react-native';\n\nfunction themeColor(light: string, dark: string) {\n  return Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : dark;\n}\n", `${path} theme helper`);
  s = recolor(s);
  write(path, s);
}

patchApp();
patchChat();
patchSimpleScreen('src/components/AtendimentoAtual.tsx');
patchSimpleScreen('src/AppRoot.tsx');
console.log('Final OTA polish applied.');
