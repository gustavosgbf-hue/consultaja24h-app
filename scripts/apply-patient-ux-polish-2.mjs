import fs from 'node:fs';

function patch(path, transform) {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`${path}: nenhuma alteracao aplicada`);
  fs.writeFileSync(path, after);
  console.log(`patched ${path}`);
}

function replaceOne(s, from, to, label) {
  if (!s.includes(from)) throw new Error(`Trecho nao encontrado: ${label}`);
  return s.replace(from, to);
}

patch('App.tsx', (input) => {
  let s = input;

  s = replaceOne(
    s,
    "{documentos.length ? `${documentos.length} documento${documentos.length === 1 ? '' : 's'} disponível${documentos.length === 1 ? '' : 'is'}` : 'Receitas, atestados e pedidos ficarão reunidos aqui.'}",
    "{documentos.length ? (documentos.length === 1 ? '1 documento disponível' : `${documentos.length} documentos disponíveis`) : 'Receitas, atestados e pedidos ficarão reunidos aqui.'}",
    'plural documentos',
  );

  s = s.replaceAll("themeColor('#eef3f0', '#07100f')", "themeColor('#e8efeb', '#07100f')");

  const styles = [
    ["heroCard: { backgroundColor: themeColor('#e7efe9', '#10201d')", "heroCard: { backgroundColor: themeColor('#dfe9e3', '#10201d')"],
    ["quickCard: { flex: 1, minHeight: 116, borderRadius: 18, backgroundColor: themeColor('#f7faf8', '#0c1816')", "quickCard: { flex: 1, minHeight: 116, borderRadius: 18, backgroundColor: themeColor('#f0f5f2', '#0c1816')"],
    ["lastCard: { backgroundColor: themeColor('#f5f8f6', '#0d1916')", "lastCard: { backgroundColor: themeColor('#edf3ef', '#0d1916')"],
    ["historyLine: { flexDirection: 'row', backgroundColor: themeColor('#f8faf9', '#0c1816')", "historyLine: { flexDirection: 'row', backgroundColor: themeColor('#eef4f0', '#0c1816')"],
    ["docsCard: { flexDirection: 'row', gap: 13, alignItems: 'center', backgroundColor: themeColor('#f4f8f5', '#0d1916')", "docsCard: { flexDirection: 'row', gap: 13, alignItems: 'center', backgroundColor: themeColor('#eaf1ed', '#0d1916')"],
    ["documentItem: { backgroundColor: themeColor('#f7faf8', '#0d1916')", "documentItem: { backgroundColor: themeColor('#eef4f0', '#0d1916')"],
  ];
  for (const [from, to] of styles) {
    if (!s.includes(from)) throw new Error(`Estilo nao encontrado: ${from.slice(0, 45)}`);
    s = s.replace(from, to);
  }

  const weights = [
    ["greeting: { color: themeColor('#14201d', '#fff'), fontSize: 30, fontWeight: '800'", "greeting: { color: themeColor('#14201d', '#fff'), fontSize: 30, fontWeight: '700'"],
    ["heroTitle: { color: themeColor('#14201d', '#fff'), fontSize: 25, fontWeight: '800'", "heroTitle: { color: themeColor('#14201d', '#fff'), fontSize: 25, fontWeight: '700'"],
    ["quickTitle: { color: themeColor('#14201d', '#fff'), fontSize: 15, fontWeight: '800'", "quickTitle: { color: themeColor('#14201d', '#fff'), fontSize: 15, fontWeight: '700'"],
    ["sectionTitle: { color: themeColor('#14201d', '#fff'), fontSize: 19, fontWeight: '800'", "sectionTitle: { color: themeColor('#14201d', '#fff'), fontSize: 19, fontWeight: '700'"],
    ["lastDoctor: { color: themeColor('#14201d', '#eef5f1'), fontSize: 17, fontWeight: '800'", "lastDoctor: { color: themeColor('#14201d', '#eef5f1'), fontSize: 17, fontWeight: '700'"],
    ["historyTitle: { color: themeColor('#14201d', '#fff'), fontWeight: '800'", "historyTitle: { color: themeColor('#14201d', '#fff'), fontWeight: '700'"],
    ["docsTitle: { color: themeColor('#14201d', '#fff'), fontSize: 15, fontWeight: '800'", "docsTitle: { color: themeColor('#14201d', '#fff'), fontSize: 15, fontWeight: '700'"],
    ["documentName: { color: themeColor('#14201d', '#eef5f1'), fontSize: 14, lineHeight: 19, fontWeight: '800'", "documentName: { color: themeColor('#14201d', '#eef5f1'), fontSize: 14, lineHeight: 19, fontWeight: '700'"],
  ];
  for (const [from, to] of weights) if (s.includes(from)) s = s.replace(from, to);

  return s;
});

patch('src/AppRoot.tsx', (input) => {
  let s = input.replaceAll("themeColor('#eef3f0', '#07100f')", "themeColor('#e8efeb', '#07100f')");
  s = s.replace("backgroundColor: themeColor('#e6efe9', '#10201d')", "backgroundColor: themeColor('#dfe9e3', '#10201d')");
  return s;
});

patch('src/components/ChatPaciente.tsx', (input) => {
  let s = input;

  s = replaceOne(s, "  Alert,\n  DynamicColorIOS,", "  Alert,\n  DynamicColorIOS,\n  Linking,", 'Linking import');
  s = replaceOne(
    s,
    "  AudioModule,\n  RecordingPresets,",
    "  AudioModule,\n  getRecordingPermissionsAsync,\n  requestRecordingPermissionsAsync,\n  RecordingPresets,",
    'audio permission imports',
  );

  s = replaceOne(
    s,
`function DeliveryChecks({ read }: { read: boolean }) {\n  const color = read ? '#16c783' : themeColor('#708079', '#71857c');\n  return (\n    <Svg width={read ? 19 : 13} height={12} viewBox={read ? '0 0 20 12' : '0 0 13 12'} fill="none">\n      {read ? <Path d="M1.5 6.3 4.4 9.1 9.3 3.3M8.2 8.8l1.4 1.3 7-7.6" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /> : <Path d="M1.5 6.3 4.4 9.1 10.7 2.7" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />}\n    </Svg>\n  );\n}`,
`function DeliveryChecks({ read }: { read: boolean }) {\n  const color = read ? '#16c783' : themeColor('#708079', '#71857c');\n  return (\n    <Svg width={read ? 18 : 12} height={11} viewBox={read ? '0 0 18 11' : '0 0 12 11'} fill="none">\n      <Path d="M1 5.7 3.6 8.3 8.9 2.5" stroke={color} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />\n      {read ? <Path d="M6.2 5.7 8.8 8.3 14.1 2.5" stroke={color} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" /> : null}\n    </Svg>\n  );\n}`,
    'equal delivery checks',
  );

  s = replaceOne(
    s,
    "!somenteLeitura && gesture.dx > 5 && Math.abs(gesture.dx) > Math.abs(gesture.dy)",
    "!somenteLeitura && gesture.dx > 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 0.65",
    'swipe capture',
  );
  s = s.replace("Math.min(58, gesture.dx)", "Math.min(70, gesture.dx)");
  s = s.replace("if (gesture.dx >= 28) onReply(mensagem);", "if (gesture.dx >= 24) onReply(mensagem);");
  s = s.replace("inputRange: [0, 8, 28]", "inputRange: [0, 7, 24]");
  s = s.replace("inputRange: [0, 28]", "inputRange: [0, 24]");

  s = replaceOne(
    s,
    "  const [menuAnexo, setMenuAnexo] = useState(false);\n  const [viewer, setViewer] = useState<ViewerState>(null);",
    "  const [menuAnexo, setMenuAnexo] = useState(false);\n  const [menuAnexoRenderizado, setMenuAnexoRenderizado] = useState(false);\n  const [viewer, setViewer] = useState<ViewerState>(null);",
    'menu rendered state',
  );

  s = replaceOne(
    s,
`  useEffect(() => {\n    if (!menuAnexo) return;\n    attachmentAnim.setValue(0);\n    Animated.spring(attachmentAnim, {\n      toValue: 1,\n      damping: 19,\n      stiffness: 260,\n      mass: 0.72,\n      useNativeDriver: true,\n    }).start();\n  }, [attachmentAnim, menuAnexo]);`,
`  useEffect(() => {\n    if (menuAnexo) {\n      setMenuAnexoRenderizado(true);\n      attachmentAnim.stopAnimation();\n      Animated.spring(attachmentAnim, {\n        toValue: 1,\n        damping: 19,\n        stiffness: 260,\n        mass: 0.72,\n        useNativeDriver: true,\n      }).start();\n      return;\n    }\n    if (!menuAnexoRenderizado) return;\n    attachmentAnim.stopAnimation();\n    Animated.timing(attachmentAnim, {\n      toValue: 0,\n      duration: 145,\n      useNativeDriver: true,\n    }).start(({ finished }) => {\n      if (finished) setMenuAnexoRenderizado(false);\n    });\n  }, [attachmentAnim, menuAnexo, menuAnexoRenderizado]);`,
    'menu close animation',
  );

  s = replaceOne(
    s,
`      const permission = await AudioModule.requestRecordingPermissionsAsync();\n      if (!permission.granted) {`,
`      const currentPermission = await getRecordingPermissionsAsync();\n      const permission = currentPermission.granted ? currentPermission : await requestRecordingPermissionsAsync();\n      if (!permission.granted) {`,
    'audio permission flow',
  );

  s = s.replace("{menuAnexo && !recorderState.isRecording ? (", "{menuAnexoRenderizado && !recorderState.isRecording ? (");

  s = replaceOne(
    s,
`            <Text style={styles.viewerTitle} numberOfLines={1}>{viewer?.name || 'Documento'}</Text>\n            <View style={{ width: 42 }} />`,
`            <Text style={styles.viewerTitle} numberOfLines={1}>{viewer?.name || 'Documento'}</Text>\n            <Pressable\n              onPress={() => viewer?.url && Linking.openURL(viewer.url)}\n              style={styles.viewerExternal}\n              accessibilityLabel="Abrir documento no navegador"\n            >\n              <Text style={styles.viewerExternalText}>↗</Text>\n            </Pressable>`,
    'external viewer action',
  );

  s = s.replaceAll("themeColor('#eef3f0', '#07100f')", "themeColor('#e8efeb', '#07100f')");
  s = s.replace("bubble: { maxWidth: '86%', borderRadius: 18, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 7 }", "bubble: { maxWidth: '84%', borderRadius: 17, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6 }");
  s = s.replace("metaRow: { minWidth: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 5 }", "metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 4 }");
  s = s.replace("delivery: { minWidth: 19, alignItems: 'flex-end', justifyContent: 'center', marginLeft: 3 }", "delivery: { width: 18, alignItems: 'flex-end', justifyContent: 'center' }");
  s = s.replace("messageText: { color: themeColor('#26332f', '#dce6e2'), fontSize: 14.5, lineHeight: 20 }", "messageText: { color: themeColor('#26332f', '#dce6e2'), fontSize: 14.5, lineHeight: 19 }");
  s = s.replace("fileName: { color: themeColor('#14201d', '#eef5f1'), fontSize: 12.5, fontWeight: '800' }", "fileName: { color: themeColor('#14201d', '#eef5f1'), fontSize: 12.5, fontWeight: '700' }");
  s = s.replace("status: { flexShrink: 1, fontSize: 9, fontWeight: '800'", "status: { flexShrink: 1, fontSize: 9, fontWeight: '700'");
  s = s.replace("quotedAuthor: { color: themeColor('#18724f', '#76ad97'), fontSize: 10, fontWeight: '800'", "quotedAuthor: { color: themeColor('#18724f', '#76ad97'), fontSize: 10, fontWeight: '700'");
  s = s.replace("attachmentLabel: { color: themeColor('#52605b', '#a9b5b0'), fontSize: 10.5, fontWeight: '700' }", "attachmentLabel: { color: themeColor('#52605b', '#a9b5b0'), fontSize: 10.5, fontWeight: '600' }");

  s = replaceOne(
    s,
    "  viewerTitle: { flex: 1, marginHorizontal: 10, textAlign: 'center', color: themeColor('#14201d', '#eef5f1'), fontSize: 15, fontWeight: '800' },",
    "  viewerTitle: { flex: 1, marginHorizontal: 10, textAlign: 'center', color: themeColor('#14201d', '#eef5f1'), fontSize: 15, fontWeight: '700' },\n  viewerExternal: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dfe8e3', '#0d1916') },\n  viewerExternalText: { color: themeColor('#18724f', '#78f25f'), fontSize: 22, fontWeight: '500', marginTop: -2 },",
    'viewer external styles',
  );

  return s;
});

console.log('Patient UX polish 2 applied.');
