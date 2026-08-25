import fs from 'node:fs';

const path = 'App.tsx';
let s = fs.readFileSync(path, 'utf8');

function once(a,b,label){
  if(!s.includes(a)) throw new Error('Anchor not found: '+label);
  s=s.replace(a,b);
}

// Imports for layout motion, safe backward swipe and in-app web flows.
once(
  "  KeyboardAvoidingView,\n  Linking,\n  Platform,\n  Pressable,",
  "  KeyboardAvoidingView,\n  LayoutAnimation,\n  Linking,\n  PanResponder,\n  Platform,\n  Pressable,",
  'react native imports'
);
once(
  "import DocumentViewer from './src/components/DocumentViewer';",
  "import DocumentViewer from './src/components/DocumentViewer';\nimport { WebView } from 'react-native-webview';",
  'webview import'
);

// Internal app routes.
once(
  "type Tela = 'home' | 'perfil' | 'nova-consulta' | 'documentos' | 'historico-chat';",
  "type Tela = 'home' | 'perfil' | 'nova-consulta' | 'documentos' | 'historico-chat' | 'servicos' | 'web';",
  'Tela type'
);
once(
  "  const [mostrarHistoricoCompleto, setMostrarHistoricoCompleto] = useState(false);",
  "  const [mostrarHistoricoCompleto, setMostrarHistoricoCompleto] = useState(false);\n  const [webPage, setWebPage] = useState<{ title: string; url: string } | null>(null);",
  'web page state'
);

// Internal screens before history chat.
once(
  "  if (tela === 'historico-chat' && historicoSelecionado) {",
  `  if (tela === 'servicos') {\n    return <ServicosSaude onVoltar={() => setTela('home')} onAbrir={(title, url) => { setWebPage({ title, url }); setTela('web'); }} />;\n  }\n\n  if (tela === 'web' && webPage) {\n    return <InternalWebScreen title={webPage.title} url={webPage.url} onVoltar={() => { setWebPage(null); setTela(webPage.title === 'Renovar receita' ? 'home' : 'servicos'); }} />;\n  }\n\n  if (tela === 'historico-chat' && historicoSelecionado) {`,
  'internal service routes'
);

// Home props for internal cards.
once(
  "      onDocumentos={() => setTela('documentos')}\n      onAbrirAtendimento=",
  "      onDocumentos={() => setTela('documentos')}\n      onRenovacao={() => { setWebPage({ title: 'Renovar receita', url: URL_RENOVACAO }); setTela('web'); }}\n      onEspecialistas={() => setTela('servicos')}\n      onAbrirAtendimento=",
  'home service callbacks'
);
once(
  "function PacienteHome({ paciente, agendamentos, historico, documentos, loading, mostrarTudo, onMostrarTudo, onAtualizar, onPerfil, onNovaConsulta, onDocumentos, onAbrirAtendimento }: {",
  "function PacienteHome({ paciente, agendamentos, historico, documentos, loading, mostrarTudo, onMostrarTudo, onAtualizar, onPerfil, onNovaConsulta, onDocumentos, onRenovacao, onEspecialistas, onAbrirAtendimento }: {",
  'home function args'
);
once(
  "  onDocumentos: () => void;\n  onAbrirAtendimento: (item: AtendimentoHistorico) => void;",
  "  onDocumentos: () => void;\n  onRenovacao: () => void;\n  onEspecialistas: () => void;\n  onAbrirAtendimento: (item: AtendimentoHistorico) => void;",
  'home prop types'
);
once(
  `        <View style={styles.quickGrid}>\n          <QuickCard title="Renovar receita" subtitle="Fluxo já disponível" onPress={() => abrirLink(URL_RENOVACAO)} featured />\n          <QuickCard title="Especialistas" subtitle="Escolha o profissional" onPress={() => abrirLink(URL_ESPECIALISTAS)} />\n        </View>`,
  `        <View style={styles.quickGrid}>\n          <QuickCard title="Renovar receita" subtitle="Solicite pelo app" onPress={onRenovacao} featured />\n          <QuickCard title="Especialistas" subtitle="Escolha o profissional" onPress={onEspecialistas} />\n        </View>`,
  'internal quick cards'
);

// Remove arrows from quick cards.
once(
  `function QuickCard({ title, subtitle, onPress, featured }: { title: string; subtitle: string; onPress: () => void; featured?: boolean }) {\n  return <Pressable onPress={onPress} style={[styles.quickCard, featured && styles.quickCardFeatured]}><Text style={[styles.quickTitle, featured && styles.quickTitleFeatured]}>{title}</Text><Text style={styles.quickSubtitle}>{subtitle}</Text><Text style={styles.quickArrow}>→</Text></Pressable>;\n}`,
  `function QuickCard({ title, subtitle, onPress, featured }: { title: string; subtitle: string; onPress: () => void; featured?: boolean }) {\n  return <Pressable onPress={onPress} style={({ pressed }) => [styles.quickCard, featured && styles.quickCardFeatured, pressed && styles.quickCardPressed]}><Text style={[styles.quickTitle, featured && styles.quickTitleFeatured]}>{title}</Text><Text style={styles.quickSubtitle}>{subtitle}</Text></Pressable>;\n}`,
  'quick card arrows'
);

// Realer carousel behavior: layout adaptation plus backward gesture on payment.
once(
  "      setEtapaConsulta(next);\n      stageX.setValue(direction === 1 ? 28 : -28);",
  "      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);\n      setEtapaConsulta(next);\n      stageX.setValue(direction === 1 ? 34 : -34);",
  'layout animation'
);
once(
  "  const stageStyle = { opacity: stageOpacity, transform: [{ translateX: stageX }] };",
  `  const stageStyle = { opacity: stageOpacity, transform: [{ translateX: stageX }] };\n  const stagePan = useMemo(() => PanResponder.create({\n    onMoveShouldSetPanResponder: (_, g) => etapaConsulta === 'pagamento' && g.dx > 24 && Math.abs(g.dx) > Math.abs(g.dy),\n    onPanResponderRelease: (_, g) => {\n      if (etapaConsulta === 'pagamento' && g.dx > 68) mudarEtapa('dados', -1);\n    },\n  }), [etapaConsulta]);`,
  'back swipe gesture'
);

// Attach gesture to payment shell only.
once(
  "        <Animated.View style={[{ flex: 1 }, stageStyle]}>\n        <ScrollView contentContainerStyle={styles.pageWrap} keyboardShouldPersistTaps=\"handled\">\n          <PageHeader title=\"Pagamento\"",
  "        <Animated.View style={[{ flex: 1 }, stageStyle]} {...stagePan.panHandlers}>\n        <ScrollView contentContainerStyle={styles.pageWrap} keyboardShouldPersistTaps=\"handled\">\n          <PageHeader title=\"Pagamento\"",
  'payment swipe handlers'
);

// Strong progress indicator with labels and step count.
const oldProgress = `function ConsultaProgress({ current }: { current: EtapaConsulta }) {\n  const etapas: EtapaConsulta[] = ['dados', 'pagamento', 'triagem', 'fila'];\n  const atual = etapas.indexOf(current);\n  return (\n    <View style={styles.consultaProgress}>\n      {etapas.map((item, index) => (\n        <View key={item} style={[styles.consultaDot, index === atual && styles.consultaDotActive, index < atual && styles.consultaDotDone]} />\n      ))}\n    </View>\n  );\n}`;
const newProgress = `function ConsultaProgress({ current }: { current: EtapaConsulta }) {\n  const etapas: { key: EtapaConsulta; label: string }[] = [\n    { key: 'dados', label: 'Queixa' },\n    { key: 'pagamento', label: 'Pagamento' },\n    { key: 'triagem', label: 'Triagem' },\n    { key: 'fila', label: 'Atendimento' },\n  ];\n  const atual = etapas.findIndex((item) => item.key === current);\n  return (\n    <View style={styles.consultaProgressWrap}>\n      <View style={styles.consultaProgressHead}>\n        <Text style={styles.consultaProgressLabel}>{etapas[atual]?.label}</Text>\n        <Text style={styles.consultaProgressCount}>{atual + 1} de {etapas.length}</Text>\n      </View>\n      <View style={styles.consultaProgress}>\n        {etapas.map((item, index) => (\n          <View key={item.key} style={[styles.consultaSegment, index <= atual && styles.consultaSegmentActive]} />\n        ))}\n      </View>\n      {current === 'pagamento' ? <Text style={styles.consultaSwipeHint}>Deslize para a direita para voltar</Text> : null}\n    </View>\n  );\n}`;
once(oldProgress,newProgress,'progress component');

// Add internal service hub and web screen before PageHeader.
once(
  "function PageHeader({ title, onVoltar }: { title: string; onVoltar: () => void }) {",
  `function ServicosSaude({ onVoltar, onAbrir }: { onVoltar: () => void; onAbrir: (title: string, url: string) => void }) {\n  const motion = usePageSlide(onVoltar);\n  const servicos = [\n    { title: 'Psiquiatria', text: 'Consulta médica especializada', url: 'https://consultaja24h.com.br/especialistas/psiquiatria' },\n    { title: 'Dermatologia', text: 'Avaliação dermatológica online', url: 'https://consultaja24h.com.br/especialistas/dermatologia' },\n    { title: 'Endocrinologia', text: 'Acompanhamento endocrinológico', url: 'https://consultaja24h.com.br/especialistas/endocrinologia' },\n    { title: 'Psicologia', text: 'Psicoterapia online com horário marcado', url: 'https://consultaja24h.com.br/psicologo-online' },\n  ];\n  return (\n    <Animated.View style={motion.style}>\n      <SafeAreaView style={styles.safe}>\n        <ScrollView contentContainerStyle={styles.pageWrap}>\n          <PageHeader title="Especialistas" onVoltar={motion.close} />\n          <Text style={styles.pageLead}>Escolha a área e veja profissionais, valores e horários disponíveis.</Text>\n          <View style={styles.serviceList}>\n            {servicos.map((item) => (\n              <Pressable key={item.title} onPress={() => onAbrir(item.title, item.url)} style={({ pressed }) => [styles.serviceCard, pressed && styles.quickCardPressed]}>\n                <View style={styles.serviceDot} />\n                <View style={{ flex: 1 }}>\n                  <Text style={styles.serviceTitle}>{item.title}</Text>\n                  <Text style={styles.serviceText}>{item.text}</Text>\n                </View>\n              </Pressable>\n            ))}\n          </View>\n        </ScrollView>\n      </SafeAreaView>\n    </Animated.View>\n  );\n}\n\nfunction InternalWebScreen({ title, url, onVoltar }: { title: string; url: string; onVoltar: () => void }) {\n  const motion = usePageSlide(onVoltar);\n  const webRef = useRef<WebView>(null);\n  const [canGoBack, setCanGoBack] = useState(false);\n  const [loadingWeb, setLoadingWeb] = useState(true);\n  function voltar() {\n    if (canGoBack) webRef.current?.goBack();\n    else motion.close();\n  }\n  return (\n    <Animated.View style={motion.style}>\n      <SafeAreaView style={styles.safe}>\n        <View style={styles.internalWebHeader}>\n          <Pressable onPress={voltar} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>\n          <Text style={styles.pageTitle} numberOfLines={1}>{title}</Text>\n          <View style={{ width: 42 }} />\n        </View>\n        <View style={styles.webWrap}>\n          {loadingWeb ? <View style={styles.webLoading}><ActivityIndicator color="#16c783" /><Text style={styles.webLoadingText}>Carregando...</Text></View> : null}\n          <WebView\n            ref={webRef}\n            source={{ uri: url }}\n            style={styles.webView}\n            startInLoadingState={false}\n            onLoadStart={() => setLoadingWeb(true)}\n            onLoadEnd={() => setLoadingWeb(false)}\n            onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}\n            setSupportMultipleWindows={false}\n            javaScriptEnabled\n            domStorageEnabled\n          />\n        </View>\n      </SafeAreaView>\n    </Animated.View>\n  );\n}\n\nfunction PageHeader({ title, onVoltar }: { title: string; onVoltar: () => void }) {`,
  'service screens'
);

// Styles. Replace old progress styles and add service styles.
once(
  "  quickArrow: { color: '#16c783', fontSize: 20, marginTop: 'auto' },",
  "  quickArrow: { color: '#16c783', fontSize: 20, marginTop: 'auto' },\n  quickCardPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },",
  'quick pressed style'
);
once(
  "  consultaProgress: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: -12, marginBottom: 20 },\n  consultaDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: themeColor('#bdcbc4', '#24332e') },\n  consultaDotDone: { backgroundColor: themeColor('#79b99c', '#356957') },\n  consultaDotActive: { width: 20, backgroundColor: '#16c783' },",
  "  consultaProgressWrap: { marginTop: -10, marginBottom: 20 },\n  consultaProgressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },\n  consultaProgressLabel: { color: themeColor('#34413d', '#dce7e2'), fontSize: 12, fontWeight: '800' },\n  consultaProgressCount: { color: themeColor('#71807a', '#75827e'), fontSize: 11, fontWeight: '700' },\n  consultaProgress: { flexDirection: 'row', alignItems: 'center', gap: 6 },\n  consultaSegment: { flex: 1, height: 4, borderRadius: 999, backgroundColor: themeColor('#cbd6d0', '#20302b') },\n  consultaSegmentActive: { backgroundColor: '#16c783' },\n  consultaSwipeHint: { color: themeColor('#71807a', '#75827e'), fontSize: 10.5, marginTop: 7, textAlign: 'right' },",
  'strong progress styles'
);
once(
  "  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },",
  "  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },\n  serviceList: { gap: 11 },\n  serviceCard: { minHeight: 82, borderRadius: 18, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: themeColor('#e9f0ec', '#0d1916') },\n  serviceDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16c783' },\n  serviceTitle: { color: themeColor('#14201d', '#fff'), fontSize: 17, fontWeight: '800' },\n  serviceText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 12.5, marginTop: 4 },\n  internalWebHeader: { height: 62, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },\n  webWrap: { flex: 1, overflow: 'hidden', backgroundColor: themeColor('#e8efeb', '#07100f') },\n  webView: { flex: 1, backgroundColor: 'transparent' },\n  webLoading: { position: 'absolute', zIndex: 5, left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: themeColor('#e8efeb', '#07100f') },\n  webLoadingText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 12 },",
  'service styles'
);

// Visible copy must not use em dash or en dash.
s = s.replace(/[–—]/g, ',');

fs.writeFileSync(path,s);
console.log('Services and real carousel patch applied.');
