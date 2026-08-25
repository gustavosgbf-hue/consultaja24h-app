import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s);
function once(s, a, b, label) {
  if (!s.includes(a)) throw new Error(`Anchor not found: ${label}`);
  return s.replace(a, b);
}

function patchApp() {
  const p = 'App.tsx';
  let s = read(p);

  if (!s.includes("import ThemeToggle from './src/components/ThemeToggle';")) {
    s = once(s, "import ChatPaciente from './src/components/ChatPaciente';", "import ChatPaciente from './src/components/ChatPaciente';\nimport ThemeToggle from './src/components/ThemeToggle';", 'ThemeToggle import');
  }

  if (!s.includes("const [historicoOrigem, setHistoricoOrigem]")) {
    s = once(s,
      "  const [historicoSelecionado, setHistoricoSelecionado] = useState<AtendimentoHistorico | null>(null);",
      "  const [historicoSelecionado, setHistoricoSelecionado] = useState<AtendimentoHistorico | null>(null);\n  const [historicoOrigem, setHistoricoOrigem] = useState<'home' | 'documentos'>('home');",
      'history origin state');
  }

  s = s.replace(
    "if (item) { setHistoricoSelecionado(item); setTela('historico-chat'); }",
    "if (item) { setHistoricoOrigem('documentos'); setHistoricoSelecionado(item); setTela('historico-chat'); }"
  );
  s = s.replace(
    "onVoltar={() => { setTela('home'); setHistoricoSelecionado(null); }}",
    "onVoltar={() => { setTela(historicoOrigem === 'documentos' ? 'documentos' : 'home'); setHistoricoSelecionado(null); }}"
  );
  s = s.replace(
    "onAbrirAtendimento={(item) => { setHistoricoSelecionado(item); setTela('historico-chat'); }}",
    "onAbrirAtendimento={(item) => { setHistoricoOrigem('home'); setHistoricoSelecionado(item); setTela('historico-chat'); }}"
  );

  if (!s.includes('<ThemeToggle />')) {
    s = once(s,
      `          <Pressable onPress={onPerfil} style={styles.avatarButton} accessibilityLabel="Abrir perfil">\n            <Text style={styles.avatarText}>{primeiroNome.slice(0, 1).toUpperCase()}</Text>\n          </Pressable>`,
      `          <View style={styles.topActions}>\n            <ThemeToggle />\n            <Pressable onPress={onPerfil} style={styles.avatarButton} accessibilityLabel="Abrir perfil">\n              <Text style={styles.avatarText}>{primeiroNome.slice(0, 1).toUpperCase()}</Text>\n            </Pressable>\n          </View>`,
      'theme toggle topbar');
  }

  s = s.replace(
    `<View style={styles.docsIcon}><Text style={styles.docsIconText}>PDF</Text></View>`,
    `<View style={styles.docsIcon}>\n            <View style={styles.docsGlyph}>\n              <View style={styles.docsGlyphFold} />\n              <View style={styles.docsGlyphLine} />\n              <View style={[styles.docsGlyphLine, styles.docsGlyphLineShort]} />\n            </View>\n          </View>`
  );

  if (!s.includes('topActions:')) {
    s = once(s,
      "  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },",
      "  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },\n  topActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },",
      'topActions style');
  }

  if (!s.includes('docsGlyph:')) {
    s = once(s,
      "  docsIconText: { color: '#78f25f', fontSize: 25, fontWeight: '400', marginTop: -2 },",
      "  docsIconText: { color: '#78f25f', fontSize: 25, fontWeight: '400', marginTop: -2 },\n  docsGlyph: { width: 18, height: 22, borderWidth: 1.7, borderColor: '#78f25f', borderRadius: 3, paddingTop: 8, paddingHorizontal: 3 },\n  docsGlyphFold: { position: 'absolute', right: -1.7, top: -1.7, width: 7, height: 7, borderLeftWidth: 1.7, borderBottomWidth: 1.7, borderColor: '#78f25f', backgroundColor: '#123027', borderBottomLeftRadius: 2 },\n  docsGlyphLine: { height: 1.5, borderRadius: 1, backgroundColor: '#78f25f', marginBottom: 3 },\n  docsGlyphLineShort: { width: '65%' },",
      'document glyph styles');
  }

  write(p, s);
}

function patchChat() {
  const p = 'src/components/ChatPaciente.tsx';
  let s = read(p);

  if (!s.includes('const hintOpacity = x.interpolate')) {
    s = once(s,
      "  return (\n    <View style={styles.swipeWrap}>",
      "  const hintOpacity = x.interpolate({ inputRange: [0, 18, 52], outputRange: [0, 0.35, 1], extrapolate: 'clamp' });\n  const hintScale = x.interpolate({ inputRange: [0, 52], outputRange: [0.72, 1], extrapolate: 'clamp' });\n\n  return (\n    <View style={styles.swipeWrap}>",
      'reply hint animation vars');
    s = once(s,
      `<View style={styles.replyHint} pointerEvents="none">\n          <Text style={styles.replyHintIcon}>↩</Text>\n        </View>`,
      `<Animated.View style={[styles.replyHint, { opacity: hintOpacity, transform: [{ scale: hintScale }] }]} pointerEvents="none">\n          <Text style={styles.replyHintIcon}>↩</Text>\n        </Animated.View>`,
      'reply hint animation view');
  }

  s = s.replace(
    "{m.lido_medico_em ? 'Visualizado' : 'Enviado'}",
    "{m.lido_medico_em ? '✓✓ Visualizado' : '✓ Enviado'}"
  );

  write(p, s);
}

patchApp();
patchChat();
console.log('Final OTA polish applied.');
