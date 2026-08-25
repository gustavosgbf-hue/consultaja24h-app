import fs from 'node:fs';

const path = 'App.tsx';
let s = fs.readFileSync(path, 'utf8');

function replaceOnce(oldText, newText, label) {
  if (!s.includes(oldText)) throw new Error(`Anchor not found: ${label}`);
  s = s.replace(oldText, newText);
}

// Pull-to-refresh on Home.
replaceOnce(
  "  Pressable,\n  SafeAreaView,\n  ScrollView,",
  "  Pressable,\n  RefreshControl,\n  SafeAreaView,\n  ScrollView,",
  'RefreshControl import',
);

// Reusable iOS-like page motion for secondary screens.
const motionAnchor = `async function abrirLink(url: string) {\n  try {\n    await Linking.openURL(url);\n  } catch {\n    Alert.alert('Não foi possível abrir', 'Tente novamente em instantes.');\n  }\n}\n`;
const motionHelper = `${motionAnchor}\nfunction usePageSlide(onClose: () => void) {\n  const x = useRef(new Animated.Value(28)).current;\n  const opacity = useRef(new Animated.Value(0)).current;\n\n  useEffect(() => {\n    Animated.parallel([\n      Animated.timing(x, { toValue: 0, duration: 230, useNativeDriver: true }),\n      Animated.timing(opacity, { toValue: 1, duration: 190, useNativeDriver: true }),\n    ]).start();\n  }, [opacity, x]);\n\n  function close() {\n    Animated.parallel([\n      Animated.timing(x, { toValue: 34, duration: 170, useNativeDriver: true }),\n      Animated.timing(opacity, { toValue: 0, duration: 145, useNativeDriver: true }),\n    ]).start(({ finished }) => {\n      if (finished) onClose();\n    });\n  }\n\n  return {\n    style: { flex: 1, opacity, transform: [{ translateX: x }] },\n    close,\n  };\n}\n`;
replaceOnce(motionAnchor, motionHelper, 'page motion helper');

// Active manual attendances must open as live chat, not forced historical read-only mode.
replaceOnce(
  "        somenteLeitura\n",
  "        somenteLeitura={String(historicoSelecionado.status || '').trim().toLowerCase() !== 'assumido'}\n",
  'manual active attendance read-only bug',
);

// Home: pull-to-refresh and tactile CTA.
replaceOnce(
  "      <ScrollView contentContainerStyle={styles.home} showsVerticalScrollIndicator={false}>",
  "      <ScrollView\n        contentContainerStyle={styles.home}\n        showsVerticalScrollIndicator={false}\n        refreshControl={<RefreshControl refreshing={loading} onRefresh={onAtualizar} tintColor=\"#16c783\" colors={[\"#16c783\"]} />}\n      >",
  'home refresh control',
);
replaceOnce(
  '<Pressable onPress={onNovaConsulta} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Consultar agora</Text></Pressable>',
  '<Pressable onPress={onNovaConsulta} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}><Text style={styles.primaryButtonText}>Consultar agora</Text></Pressable>',
  'home consultation CTA pressed state',
);

// My attendances becomes a local horizontal carousel; remove redundant "chat" label.
const historyOld = `        {loading && historico.length === 0 ? (\n          <HomeHistorySkeleton />\n        ) : itensHistorico.length ? (\n          itensHistorico.map((item) => (\n            <Pressable key={String(item.id)} onPress={() => onAbrirAtendimento(item)} style={styles.historyCard}>\n              <View style={styles.historyLine}><View style={styles.timelineDot} /><View style={styles.historyBody}>\n                <Text style={styles.historyTitle}>{item.medico_nome || 'Atendimento médico'}</Text>\n                <Text style={styles.historyMeta}>{formatarData(item.criado_em)} · {item.tipo || 'chat'}</Text>\n                <Text style={styles.historyText}>{resumirTexto(item.triagem, 105)}</Text>\n                <Text style={styles.historyOpen}>Abrir conversa ›</Text>\n              </View></View>\n            </Pressable>\n          ))\n        ) : (`;
const historyNew = `        {loading && historico.length === 0 ? (\n          <HomeHistorySkeleton />\n        ) : itensHistorico.length ? (\n          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.historyCarousel} snapToInterval={286} decelerationRate=\"fast\">\n            {itensHistorico.map((item) => (\n              <Pressable key={String(item.id)} onPress={() => onAbrirAtendimento(item)} style={[styles.historyCard, styles.historyCardHorizontal]}>\n                <View style={styles.historyLine}><View style={styles.timelineDot} /><View style={styles.historyBody}>\n                  <Text style={styles.historyTitle}>{item.medico_nome || 'Atendimento médico'}</Text>\n                  <Text style={styles.historyMeta}>{formatarData(item.criado_em)}</Text>\n                  <Text style={styles.historyText}>{resumirTexto(item.triagem, 105)}</Text>\n                  <Text style={styles.historyOpen}>Abrir conversa ›</Text>\n                </View></View>\n              </Pressable>\n            ))}\n          </ScrollView>\n        ) : (`;
replaceOnce(historyOld, historyNew, 'history horizontal carousel');

// Remove bottom manual refresh button.
replaceOnce(
  "\n        <Pressable onPress={onAtualizar} style={styles.refreshButton}><Text style={styles.refreshText}>Atualizar dados</Text></Pressable>",
  '',
  'remove refresh button',
);

// Documents page gets native-feeling enter/back motion.
replaceOnce(
  `function DocumentosPaciente({ documentos, onVoltar, onAbrirConsulta }: {\n  documentos: DocumentoPaciente[];\n  onVoltar: () => void;\n  onAbrirConsulta: (atendimentoId: number) => void;\n}) {\n  const [docAberto, setDocAberto] = useState<DocumentoPaciente | null>(null);\n\n  return (\n    <SafeAreaView style={styles.safe}>`,
  `function DocumentosPaciente({ documentos, onVoltar, onAbrirConsulta }: {\n  documentos: DocumentoPaciente[];\n  onVoltar: () => void;\n  onAbrirConsulta: (atendimentoId: number) => void;\n}) {\n  const [docAberto, setDocAberto] = useState<DocumentoPaciente | null>(null);\n  const motion = usePageSlide(onVoltar);\n\n  return (\n    <Animated.View style={motion.style}>\n    <SafeAreaView style={styles.safe}>`,
  'documents motion open',
);
replaceOnce('<PageHeader title="Meus documentos" onVoltar={onVoltar} />', '<PageHeader title="Meus documentos" onVoltar={motion.close} />', 'documents animated back');
replaceOnce(
  `      />\n    </SafeAreaView>\n  );\n}\n\nfunction Perfil`,
  `      />\n    </SafeAreaView>\n    </Animated.View>\n  );\n}\n\nfunction Perfil`,
  'documents motion close',
);

// Profile enter/back motion.
replaceOnce(
  `function Perfil({ paciente, onVoltar, onSair }: { paciente: Paciente; onVoltar: () => void; onSair: () => void }) {\n  const primeiroNome = paciente.nome?.split(' ')[0] || 'Paciente';\n  return (\n    <SafeAreaView style={styles.safe}>`,
  `function Perfil({ paciente, onVoltar, onSair }: { paciente: Paciente; onVoltar: () => void; onSair: () => void }) {\n  const primeiroNome = paciente.nome?.split(' ')[0] || 'Paciente';\n  const motion = usePageSlide(onVoltar);\n  return (\n    <Animated.View style={motion.style}>\n    <SafeAreaView style={styles.safe}>`,
  'profile motion open',
);
replaceOnce('<PageHeader title="Meu perfil" onVoltar={onVoltar} />', '<PageHeader title="Meu perfil" onVoltar={motion.close} />', 'profile animated back');
replaceOnce(
  `        <Pressable onPress={onSair} style={styles.logoutButton}><Text style={styles.logoutButtonText}>Sair da conta</Text></Pressable>\n      </ScrollView>\n    </SafeAreaView>\n  );\n}\n\nfunction NovaConsulta`,
  `        <Pressable onPress={onSair} style={styles.logoutButton}><Text style={styles.logoutButtonText}>Sair da conta</Text></Pressable>\n      </ScrollView>\n    </SafeAreaView>\n    </Animated.View>\n  );\n}\n\nfunction NovaConsulta`,
  'profile motion close',
);

// Consultation flow: outer page motion + horizontal stage animation.
replaceOnce(
  "  const [atendimentoPagoId, setAtendimentoPagoId] = useState<number | null>(null);",
  `  const [atendimentoPagoId, setAtendimentoPagoId] = useState<number | null>(null);\n  const motion = usePageSlide(onVoltar);\n  const stageX = useRef(new Animated.Value(0)).current;\n  const stageOpacity = useRef(new Animated.Value(1)).current;\n\n  function mudarEtapa(next: EtapaConsulta, direction: 1 | -1 = 1) {\n    Animated.parallel([\n      Animated.timing(stageX, { toValue: direction === 1 ? -28 : 28, duration: 150, useNativeDriver: true }),\n      Animated.timing(stageOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),\n    ]).start(({ finished }) => {\n      if (!finished) return;\n      setEtapaConsulta(next);\n      stageX.setValue(direction === 1 ? 28 : -28);\n      requestAnimationFrame(() => {\n        Animated.parallel([\n          Animated.timing(stageX, { toValue: 0, duration: 220, useNativeDriver: true }),\n          Animated.timing(stageOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),\n        ]).start();\n      });\n    });\n  }\n\n  const stageStyle = { opacity: stageOpacity, transform: [{ translateX: stageX }] };`,
  'consultation stage animation',
);
replaceOnce("      setEtapaConsulta('pagamento');", "      mudarEtapa('pagamento', 1);", 'advance to payment');
replaceOnce("    setEtapaConsulta('triagem');", "    mudarEtapa('triagem', 1);", 'advance to triage');
replaceOnce("      setEtapaConsulta('fila');", "      mudarEtapa('fila', 1);", 'advance to queue');
replaceOnce(
  `  function voltarEtapa() {\n    if (etapaConsulta === 'dados') return onVoltar();\n    if (etapaConsulta === 'pagamento') return setEtapaConsulta('dados');\n    if (etapaConsulta === 'fila') return onVoltar();`,
  `  function voltarEtapa() {\n    if (etapaConsulta === 'dados') return motion.close();\n    if (etapaConsulta === 'pagamento') return mudarEtapa('dados', -1);\n    if (etapaConsulta === 'fila') return motion.close();`,
  'animated consultation back',
);

// Add progress dots and animation shell to each consultation stage.
replaceOnce(
  `<SafeAreaView style={styles.safe}>\n        <ScrollView contentContainerStyle={styles.pageWrap} keyboardShouldPersistTaps=\"handled\">\n          <PageHeader title=\"Pagamento\" onVoltar={voltarEtapa} />`,
  `<Animated.View style={motion.style}>\n      <SafeAreaView style={styles.safe}>\n        <Animated.View style={[{ flex: 1 }, stageStyle]}>\n        <ScrollView contentContainerStyle={styles.pageWrap} keyboardShouldPersistTaps=\"handled\">\n          <PageHeader title=\"Pagamento\" onVoltar={voltarEtapa} />\n          <ConsultaProgress current=\"pagamento\" />`,
  'payment animated shell',
);
replaceOnce(
  `        </ScrollView>\n      </SafeAreaView>\n    );\n  }\n\n  if (etapaConsulta === 'triagem')`,
  `        </ScrollView>\n        </Animated.View>\n      </SafeAreaView>\n      </Animated.View>\n    );\n  }\n\n  if (etapaConsulta === 'triagem')`,
  'payment animated shell close',
);

replaceOnce(
  `<SafeAreaView style={styles.safe}>\n        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>\n          <View style={styles.pageWrapFlex}>\n            <PageHeader title=\"Triagem\" onVoltar={voltarEtapa} />`,
  `<Animated.View style={motion.style}>\n      <SafeAreaView style={styles.safe}>\n        <Animated.View style={[{ flex: 1 }, stageStyle]}>\n        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>\n          <View style={styles.pageWrapFlex}>\n            <PageHeader title=\"Triagem\" onVoltar={voltarEtapa} />\n            <ConsultaProgress current=\"triagem\" />`,
  'triage animated shell',
);
replaceOnce(
  `        </KeyboardAvoidingView>\n      </SafeAreaView>\n    );\n  }\n\n  if (etapaConsulta === 'fila')`,
  `        </KeyboardAvoidingView>\n        </Animated.View>\n      </SafeAreaView>\n      </Animated.View>\n    );\n  }\n\n  if (etapaConsulta === 'fila')`,
  'triage animated shell close',
);

replaceOnce(
  `<SafeAreaView style={styles.safe}>\n        <ScrollView contentContainerStyle={styles.pageWrap}>\n          <PageHeader title=\"Atendimento\" onVoltar={onVoltar} />`,
  `<Animated.View style={motion.style}>\n      <SafeAreaView style={styles.safe}>\n        <Animated.View style={[{ flex: 1 }, stageStyle]}>\n        <ScrollView contentContainerStyle={styles.pageWrap}>\n          <PageHeader title=\"Atendimento\" onVoltar={motion.close} />\n          <ConsultaProgress current=\"fila\" />`,
  'queue animated shell',
);
replaceOnce(
  `        </ScrollView>\n      </SafeAreaView>\n    );\n  }\n\n  return (\n    <SafeAreaView style={styles.safe}>`,
  `        </ScrollView>\n        </Animated.View>\n      </SafeAreaView>\n      </Animated.View>\n    );\n  }\n\n  return (\n    <Animated.View style={motion.style}>\n    <SafeAreaView style={styles.safe}>`,
  'queue close and data animated shell open',
);
replaceOnce(
  `<PageHeader title=\"Nova consulta\" onVoltar={voltarEtapa} />\n        <Text style={styles.pageLead}>`,
  `<PageHeader title=\"Nova consulta\" onVoltar={voltarEtapa} />\n        <ConsultaProgress current=\"dados\" />\n        <Animated.View style={stageStyle}>\n        <Text style={styles.pageLead}>`,
  'data progress',
);
replaceOnce(
  `        <PrimaryButton label=\"Continuar para pagamento\" loading={iniciandoBeta} onPress={irParaPagamento} />\n      </ScrollView>\n    </SafeAreaView>\n  );\n}\n\nfunction PageHeader`,
  `        <PrimaryButton label=\"Continuar para pagamento\" loading={iniciandoBeta} onPress={irParaPagamento} />\n        </Animated.View>\n      </ScrollView>\n    </SafeAreaView>\n    </Animated.View>\n  );\n}\n\nfunction ConsultaProgress({ current }: { current: EtapaConsulta }) {\n  const etapas: EtapaConsulta[] = ['dados', 'pagamento', 'triagem', 'fila'];\n  const atual = etapas.indexOf(current);\n  return (\n    <View style={styles.consultaProgress}>\n      {etapas.map((item, index) => (\n        <View key={item} style={[styles.consultaDot, index === atual && styles.consultaDotActive, index < atual && styles.consultaDotDone]} />\n      ))}\n    </View>\n  );\n}\n\nfunction PageHeader`,
  'data shell close and progress component',
);

// Primary button press feedback everywhere.
replaceOnce(
  `function PrimaryButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {\n  return <Pressable onPress={onPress} disabled={loading} style={[styles.primaryButton, loading && styles.buttonLoading]}>`,
  `function PrimaryButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {\n  return <Pressable onPress={onPress} disabled={loading} style={({ pressed }) => [styles.primaryButton, loading && styles.buttonLoading, pressed && !loading && styles.primaryPressed]}>`,
  'primary pressed feedback',
);

// Remove harsh light outlines and add local carousel/progress styles.
const styleReplacements = [
  ["avatarButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: themeColor('#eef7f1', '#10201d'), borderWidth: 1, borderColor: themeColor('#c6ddd2', '#275044'),", "avatarButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: themeColor('#dce9e2', '#10201d'),"],
  ["backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'),", "backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: themeColor('#dce7e1', '#0b1715'),"],
  ["profileAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: themeColor('#eef7f1', '#10201d'), borderWidth: 1, borderColor: themeColor('#c6ddd2', '#275044'),", "profileAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: themeColor('#dce9e2', '#10201d'),"],
  ["profileCard: { backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'),", "profileCard: { backgroundColor: themeColor('#e9f0ec', '#0b1715'),"],
  ["choiceCard: { flex: 1, minHeight: 120, borderRadius: 18, backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'),", "choiceCard: { flex: 1, minHeight: 120, borderRadius: 18, backgroundColor: themeColor('#e9f0ec', '#0b1715'),"],
  ["choiceCardActive: { borderColor: '#16c783', backgroundColor: themeColor('#eef7f1', '#0f211c') },", "choiceCardActive: { backgroundColor: themeColor('#dcebe3', '#0f211c') },"],
  ["formCard: { backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'),", "formCard: { backgroundColor: themeColor('#e9f0ec', '#0b1715'),"],
  ["darkInput: { backgroundColor: themeColor('#ffffff', '#101d1a'), borderWidth: 1, borderColor: themeColor('#d8e3dd', '#223a34'),", "darkInput: { backgroundColor: themeColor('#dfe8e3', '#101d1a'),"],
  ["flowPreview: { backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'),", "flowPreview: { backgroundColor: themeColor('#e9f0ec', '#0b1715'),"],
  ["paidBadge: { alignSelf: 'flex-start', backgroundColor: themeColor('#e7f7ee', '#123027'), borderWidth: 1, borderColor: themeColor('#b9d9ca', '#285746'),", "paidBadge: { alignSelf: 'flex-start', backgroundColor: themeColor('#dcebe3', '#123027'),"],
];
for (const [oldText, newText] of styleReplacements) replaceOnce(oldText, newText, `style ${oldText.slice(0, 18)}`);

replaceOnce(
  "  historyCard: { marginBottom: 9 },",
  "  historyCard: { marginBottom: 9 },\n  historyCarousel: { gap: 10, paddingBottom: 9, paddingRight: 12 },\n  historyCardHorizontal: { width: 276, marginBottom: 0 },",
  'history carousel styles',
);
replaceOnce(
  "  primaryButton: { minHeight: 54, backgroundColor: '#16c783', borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 6 },",
  "  primaryButton: { minHeight: 54, backgroundColor: '#16c783', borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 6 },\n  primaryPressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },",
  'primary press style',
);
replaceOnce(
  "  pageWrapFlex: { flex: 1, padding: 20, paddingBottom: 14 },",
  "  pageWrapFlex: { flex: 1, padding: 20, paddingBottom: 14 },\n  consultaProgress: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: -12, marginBottom: 20 },\n  consultaDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: themeColor('#bdcbc4', '#24332e') },\n  consultaDotDone: { backgroundColor: themeColor('#79b99c', '#356957') },\n  consultaDotActive: { width: 20, backgroundColor: '#16c783' },",
  'consultation progress styles',
);

fs.writeFileSync(path, s);
console.log('Navigation carousel UX patch applied.');
