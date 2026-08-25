import fs from 'node:fs';

function patchFile(path, transform) {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`${path}: nenhum ajuste aplicado`);
  fs.writeFileSync(path, after);
  console.log(`patched ${path}`);
}

function exact(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Trecho nao encontrado: ${label}`);
  return source.replace(from, to);
}

patchFile('App.tsx', (input) => {
  let s = input;
  s = exact(s,
    "import { useEffect, useMemo, useState } from 'react';",
    "import { useEffect, useMemo, useRef, useState } from 'react';",
    'react hooks');
  s = exact(s,
    "  ActivityIndicator,\n  Alert,",
    "  ActivityIndicator,\n  Alert,\n  Animated,",
    'Animated import');

  s = exact(s,
`  if (booting) {\n    return (\n      <SafeAreaView style={styles.centered}>\n        <ActivityIndicator size=\"large\" color=\"#16c783\" />\n      </SafeAreaView>\n    );\n  }`,
`  if (booting) {\n    return <AppSkeleton />;\n  }`,
    'boot skeleton');

  s = exact(s,
`        {loading && historico.length === 0 ? (\n          <ActivityIndicator color=\"#16c783\" style={{ marginVertical: 24 }} />\n        ) : itensHistorico.length ? (`,
`        {loading && historico.length === 0 ? (\n          <HomeHistorySkeleton />\n        ) : itensHistorico.length ? (`,
    'history skeleton');

  s = exact(s,
`function EmptyCard({ title, text }: { title: string; text: string }) {\n  return <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text></View>;\n}\n\nconst styles = StyleSheet.create({`,
`function EmptyCard({ title, text }: { title: string; text: string }) {\n  return <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text></View>;\n}\n\nfunction SkeletonPulse({ children }: { children: React.ReactNode }) {\n  const opacity = useRef(new Animated.Value(0.42)).current;\n  useEffect(() => {\n    const loop = Animated.loop(Animated.sequence([\n      Animated.timing(opacity, { toValue: 0.82, duration: 720, useNativeDriver: true }),\n      Animated.timing(opacity, { toValue: 0.42, duration: 720, useNativeDriver: true }),\n    ]));\n    loop.start();\n    return () => loop.stop();\n  }, [opacity]);\n  return <Animated.View style={{ opacity }}>{children}</Animated.View>;\n}\n\nfunction HomeHistorySkeleton() {\n  return (\n    <SkeletonPulse>\n      <View style={styles.skeletonHistoryCard}>\n        <View style={styles.skeletonDot} />\n        <View style={{ flex: 1 }}>\n          <View style={[styles.skeletonLine, { width: '48%', height: 13 }]} />\n          <View style={[styles.skeletonLine, { width: '30%', height: 9, marginTop: 9 }]} />\n          <View style={[styles.skeletonLine, { width: '88%', height: 10, marginTop: 13 }]} />\n          <View style={[styles.skeletonLine, { width: '68%', height: 10, marginTop: 7 }]} />\n        </View>\n      </View>\n      <View style={[styles.skeletonHistoryCard, { opacity: 0.72 }]}>\n        <View style={styles.skeletonDot} />\n        <View style={{ flex: 1 }}>\n          <View style={[styles.skeletonLine, { width: '42%', height: 13 }]} />\n          <View style={[styles.skeletonLine, { width: '26%', height: 9, marginTop: 9 }]} />\n          <View style={[styles.skeletonLine, { width: '80%', height: 10, marginTop: 13 }]} />\n        </View>\n      </View>\n    </SkeletonPulse>\n  );\n}\n\nfunction AppSkeleton() {\n  return (\n    <SafeAreaView style={styles.safe}>\n      <View style={styles.skeletonPage}>\n        <SkeletonPulse>\n          <View style={styles.skeletonTop}>\n            <View>\n              <View style={[styles.skeletonLine, { width: 92, height: 9 }]} />\n              <View style={[styles.skeletonLine, { width: 150, height: 25, marginTop: 9 }]} />\n              <View style={[styles.skeletonLine, { width: 126, height: 10, marginTop: 9 }]} />\n            </View>\n            <View style={styles.skeletonAvatar} />\n          </View>\n          <View style={styles.skeletonHero}>\n            <View style={[styles.skeletonLine, { width: 86, height: 9 }]} />\n            <View style={[styles.skeletonLine, { width: '83%', height: 20, marginTop: 15 }]} />\n            <View style={[styles.skeletonLine, { width: '68%', height: 20, marginTop: 8 }]} />\n            <View style={[styles.skeletonLine, { width: '92%', height: 10, marginTop: 15 }]} />\n            <View style={[styles.skeletonLine, { width: '74%', height: 10, marginTop: 7 }]} />\n            <View style={styles.skeletonButton} />\n          </View>\n          <View style={styles.skeletonGrid}>\n            <View style={styles.skeletonQuick} />\n            <View style={styles.skeletonQuick} />\n          </View>\n          <View style={[styles.skeletonLine, { width: 170, height: 17, marginBottom: 13 }]} />\n          <View style={styles.skeletonLast} />\n        </SkeletonPulse>\n      </View>\n    </SafeAreaView>\n  );\n}\n\nconst styles = StyleSheet.create({`,
    'skeleton components');

  const replacements = [
    ["safe: { flex: 1, backgroundColor: themeColor('#f6f8f7', '#07100f') }", "safe: { flex: 1, backgroundColor: themeColor('#eef3f0', '#07100f') }"],
    ["centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#f6f8f7', '#07100f') }", "centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#eef3f0', '#07100f') }"],
    ["heroCard: { backgroundColor: themeColor('#eef7f1', '#10201d'), borderWidth: 1, borderColor: themeColor('#cbe2d7', '#21483c'), borderRadius: 24, padding: 22, marginBottom: 14 }", "heroCard: { backgroundColor: themeColor('#e7efe9', '#10201d'), borderRadius: 24, padding: 22, marginBottom: 14 }"],
    ["quickCard: { flex: 1, minHeight: 116, borderRadius: 18, backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'), padding: 15 }", "quickCard: { flex: 1, minHeight: 116, borderRadius: 18, backgroundColor: themeColor('#f7faf8', '#0c1816'), padding: 15 }"],
    ["lastCard: { backgroundColor: '#f7fbf8', borderRadius: 20, padding: 18, marginBottom: 27 }", "lastCard: { backgroundColor: themeColor('#f5f8f6', '#0d1916'), borderRadius: 20, padding: 18, marginBottom: 27 }"],
    ["lastDoctor: { color: '#14201d', fontSize: 17, fontWeight: '800', marginTop: 14 }", "lastDoctor: { color: themeColor('#14201d', '#eef5f1'), fontSize: 17, fontWeight: '800', marginTop: 14 }"],
    ["lastSummary: { color: '#596763', lineHeight: 20, marginTop: 6 }", "lastSummary: { color: themeColor('#596763', '#94a39d'), lineHeight: 20, marginTop: 6 }"],
    ["historyLine: { flexDirection: 'row', backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'), borderRadius: 17, padding: 15 }", "historyLine: { flexDirection: 'row', backgroundColor: themeColor('#f8faf9', '#0c1816'), borderRadius: 17, padding: 15 }"],
    ["docsCard: { flexDirection: 'row', gap: 13, alignItems: 'center', backgroundColor: themeColor('#ffffff', '#0b1715'), borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'), borderRadius: 18, padding: 16, marginTop: 25 }", "docsCard: { flexDirection: 'row', gap: 13, alignItems: 'center', backgroundColor: themeColor('#f4f8f5', '#0d1916'), borderRadius: 18, padding: 16, marginTop: 25 }"],
    ["documentItem: { backgroundColor: themeColor('#ffffff', '#0d1916'), borderWidth: 1, borderColor: themeColor('#dfe7e2', '#1b2b26'), borderRadius: 18, marginBottom: 12, overflow: 'hidden' }", "documentItem: { backgroundColor: themeColor('#f7faf8', '#0d1916'), borderRadius: 18, marginBottom: 12, overflow: 'hidden' }"],
    ["documentPdf: { width: 44, height: 50, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#eef4f1', '#14231f'), borderWidth: 1, borderColor: '#28463b' }", "documentPdf: { width: 44, height: 50, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#e8f1ec', '#14231f') }"],
    ["documentConsultButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: themeColor('#e0e8e4', '#192823') }", "documentConsultButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#edf3ef', '#101e1a') }"],
    ["emptyCard: { borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'), backgroundColor: themeColor('#ffffff', '#0b1715'), borderRadius: 16, padding: 18, marginBottom: 24 }", "emptyCard: { backgroundColor: themeColor('#f7faf8', '#0c1816'), borderRadius: 16, padding: 18, marginBottom: 24 }"],
    ["appointmentCard: { borderWidth: 1, borderColor: themeColor('#dce6e1', '#1d342f'), backgroundColor: themeColor('#ffffff', '#0b1715'), borderRadius: 16, padding: 17, marginBottom: 10 }", "appointmentCard: { backgroundColor: themeColor('#f7faf8', '#0c1816'), borderRadius: 16, padding: 17, marginBottom: 10 }"],
  ];
  for (const [from, to] of replacements) s = exact(s, from, to, `App style ${from.slice(0, 22)}`);

  s = exact(s,
`  refreshText: { color: themeColor('#66736e', '#71807b'), fontWeight: '700', fontSize: 13 },`,
`  refreshText: { color: themeColor('#66736e', '#71807b'), fontWeight: '700', fontSize: 13 },\n  skeletonPage: { flex: 1, paddingHorizontal: 20, paddingTop: 12, backgroundColor: themeColor('#eef3f0', '#07100f') },\n  skeletonTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },\n  skeletonLine: { borderRadius: 999, backgroundColor: themeColor('#d7e1dc', '#1b2925') },\n  skeletonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: themeColor('#d7e1dc', '#172823') },\n  skeletonHero: { minHeight: 225, borderRadius: 24, padding: 22, backgroundColor: themeColor('#e3ebe6', '#0f1d19'), marginBottom: 14 },\n  skeletonButton: { height: 48, borderRadius: 15, backgroundColor: themeColor('#d0dbd5', '#193027'), marginTop: 20 },\n  skeletonGrid: { flexDirection: 'row', gap: 10, marginBottom: 30 },\n  skeletonQuick: { flex: 1, height: 116, borderRadius: 18, backgroundColor: themeColor('#e1e8e4', '#0c1816') },\n  skeletonLast: { height: 150, borderRadius: 20, backgroundColor: themeColor('#e1e8e4', '#0d1916') },\n  skeletonHistoryCard: { minHeight: 120, flexDirection: 'row', borderRadius: 17, padding: 15, marginBottom: 9, backgroundColor: themeColor('#e4ebe7', '#0c1816') },\n  skeletonDot: { width: 9, height: 9, borderRadius: 5, marginTop: 3, marginRight: 12, backgroundColor: themeColor('#c6d3cc', '#20352e') },`,
    'skeleton styles');

  return s;
});

patchFile('src/AppRoot.tsx', (input) => {
  let s = input;
  s = s.replaceAll("themeColor('#f6f8f7', '#07100f')", "themeColor('#eef3f0', '#07100f')");
  s = exact(s,
`    backgroundColor: themeColor('#eef7f1', '#10201d'),\n    borderWidth: 1,\n    borderColor: themeColor('#b9d9ca', '#285746'),`,
`    backgroundColor: themeColor('#e6efe9', '#10201d'),`,
    'resume card border');
  s = exact(s, '    shadowOpacity: 0.35,', '    shadowOpacity: 0.2,', 'resume shadow');
  s = exact(s, '    shadowRadius: 12,', '    shadowRadius: 18,', 'resume radius');
  return s;
});

patchFile('src/components/ChatPaciente.tsx', (input) => {
  let s = input;

  s = exact(s,
`function CloseIcon({ color = '#a9b5b0' }: { color?: string }) {`,
`function DeliveryChecks({ read }: { read: boolean }) {\n  const color = read ? '#16c783' : themeColor('#708079', '#71857c');\n  return (\n    <Svg width={read ? 19 : 13} height={12} viewBox={read ? '0 0 20 12' : '0 0 13 12'} fill=\"none\">\n      {read ? <Path d=\"M1.5 6.3 4.4 9.1 9.3 3.3M8.2 8.8l1.4 1.3 7-7.6\" stroke={color} strokeWidth=\"1.7\" strokeLinecap=\"round\" strokeLinejoin=\"round\" /> : <Path d=\"M1.5 6.3 4.4 9.1 10.7 2.7\" stroke={color} strokeWidth=\"1.7\" strokeLinecap=\"round\" strokeLinejoin=\"round\" />}\n    </Svg>\n  );\n}\n\nfunction CloseIcon({ color = '#a9b5b0' }: { color?: string }) {`,
    'delivery checks');

  s = exact(s,
`        if (gesture.dx >= 34) onReply(mensagem);`,
`        if (gesture.dx >= 28) onReply(mensagem);`,
    'swipe threshold');
  s = exact(s,
`  const hintOpacity = x.interpolate({ inputRange: [0, 10, 34], outputRange: [0, 0.35, 1], extrapolate: 'clamp' });\n  const hintScale = x.interpolate({ inputRange: [0, 34], outputRange: [0.82, 1], extrapolate: 'clamp' });`,
`  const hintOpacity = x.interpolate({ inputRange: [0, 8, 28], outputRange: [0, 0.4, 1], extrapolate: 'clamp' });\n  const hintScale = x.interpolate({ inputRange: [0, 28], outputRange: [0.86, 1], extrapolate: 'clamp' });`,
    'swipe hint');

  s = exact(s,
`  const [viewer, setViewer] = useState<ViewerState>(null);\n  const scrollRef = useRef<ScrollView | null>(null);`,
`  const [viewer, setViewer] = useState<ViewerState>(null);\n  const attachmentAnim = useRef(new Animated.Value(0)).current;\n  const scrollRef = useRef<ScrollView | null>(null);`,
    'attachment animation ref');

  s = exact(s,
`  useEffect(() => {\n    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));\n  }, [mensagens.length]);`,
`  useEffect(() => {\n    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));\n  }, [mensagens.length]);\n\n  useEffect(() => {\n    if (!menuAnexo) return;\n    attachmentAnim.setValue(0);\n    Animated.spring(attachmentAnim, {\n      toValue: 1,\n      damping: 19,\n      stiffness: 260,\n      mass: 0.72,\n      useNativeDriver: true,\n    }).start();\n  }, [attachmentAnim, menuAnexo]);`,
    'attachment animation effect');

  s = exact(s,
`                      <View style={styles.metaRow}>\n                        <Text style={[styles.time, m.autor === 'paciente' && styles.mineTime]}>{new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>\n                        {m.autor === 'paciente' ? <Text style={[styles.delivery, m.lido_medico_em && styles.deliveryRead]}>{m.lido_medico_em ? '✓✓ Visualizado' : '✓ Enviado'}</Text> : null}\n                      </View>`,
`                      <View style={styles.metaRow}>\n                        <Text style={[styles.time, m.autor === 'paciente' && styles.mineTime]}>{new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>\n                        {m.autor === 'paciente' ? <View style={styles.delivery}><DeliveryChecks read={!!m.lido_medico_em} /></View> : null}\n                      </View>`,
    'message meta');

  s = exact(s,
`            {menuAnexo && !recorderState.isRecording ? (\n              <View style={styles.attachmentMenu}>\n                <Pressable onPress={abrirCamera} style={styles.attachmentOption}><View style={styles.attachmentIcon}><CameraIcon /></View><Text style={styles.attachmentLabel}>Câmera</Text></Pressable>\n                <Pressable onPress={abrirFotos} style={styles.attachmentOption}><View style={styles.attachmentIcon}><PhotoIcon /></View><Text style={styles.attachmentLabel}>Fotos</Text></Pressable>\n                <Pressable onPress={abrirDocumento} style={styles.attachmentOption}><View style={styles.attachmentIcon}><FileIcon /></View><Text style={styles.attachmentLabel}>Documento</Text></Pressable>\n              </View>\n            ) : null}\n\n`,
``,
    'old attachment menu');

  s = exact(s,
`      </KeyboardAvoidingView>\n\n      <Modal visible={!!viewer}`,
`      </KeyboardAvoidingView>\n\n      {menuAnexo && !recorderState.isRecording ? (\n        <View style={styles.attachmentOverlay}>\n          <Pressable style={styles.attachmentBackdrop} onPress={() => setMenuAnexo(false)} accessibilityLabel=\"Fechar menu de anexos\" />\n          <Animated.View\n            style={[\n              styles.attachmentMenu,\n              {\n                opacity: attachmentAnim,\n                transform: [\n                  { translateY: attachmentAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },\n                  { scale: attachmentAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },\n                ],\n              },\n            ]}\n          >\n            <Pressable onPress={abrirCamera} style={styles.attachmentOption}><View style={styles.attachmentIcon}><CameraIcon /></View><Text style={styles.attachmentLabel}>Câmera</Text></Pressable>\n            <Pressable onPress={abrirFotos} style={styles.attachmentOption}><View style={styles.attachmentIcon}><PhotoIcon /></View><Text style={styles.attachmentLabel}>Fotos</Text></Pressable>\n            <Pressable onPress={abrirDocumento} style={styles.attachmentOption}><View style={styles.attachmentIcon}><FileIcon /></View><Text style={styles.attachmentLabel}>Documento</Text></Pressable>\n          </Animated.View>\n        </View>\n      ) : null}\n\n      <Modal visible={!!viewer}`,
    'attachment overlay');

  const replacements = [
    ["safe: { flex: 1, backgroundColor: themeColor('#f6f8f7', '#07100f') }", "safe: { flex: 1, backgroundColor: themeColor('#eef3f0', '#07100f') }"],
    ["screen: { flex: 1, backgroundColor: themeColor('#f6f8f7', '#07100f') }", "screen: { flex: 1, backgroundColor: themeColor('#eef3f0', '#07100f') }"],
    ["backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#ffffff', '#0d1916') }", "backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#e4ece7', '#0d1916') }"],
    ["notice: { alignSelf: 'center', maxWidth: 310, backgroundColor: themeColor('#eef3f0', '#0d1916'), borderRadius: 13, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 16 }", "notice: { alignSelf: 'center', maxWidth: 310, backgroundColor: themeColor('#e3ebe6', '#0d1916'), borderRadius: 13, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 16 }"],
    ["mineBubble: { backgroundColor: themeColor('#dff5ea', '#123d31'), borderBottomRightRadius: 6 }", "mineBubble: { backgroundColor: themeColor('#d8eee3', '#123d31'), borderBottomRightRadius: 6 }"],
    ["theirBubble: { backgroundColor: themeColor('#ffffff', '#10201c'), borderBottomLeftRadius: 6 }", "theirBubble: { backgroundColor: themeColor('#f7faf8', '#10201c'), borderBottomLeftRadius: 6 }"],
    ["metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7, marginTop: 5 }", "metaRow: { minWidth: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 5 }"],
    ["delivery: { color: themeColor('#66736e', '#769087'), fontSize: 9.5, fontWeight: '700' },\n  deliveryRead: { color: themeColor('#0b8f61', '#78f25f') },", "delivery: { minWidth: 19, alignItems: 'flex-end', justifyContent: 'center', marginLeft: 3 },"],
    ["composerArea: { paddingHorizontal: 10, paddingTop: 7, paddingBottom: Platform.OS === 'ios' ? 6 : 10, backgroundColor: themeColor('#f6f8f7', '#07100f') }", "composerArea: { paddingHorizontal: 10, paddingTop: 7, paddingBottom: Platform.OS === 'ios' ? 6 : 10, backgroundColor: themeColor('#eef3f0', '#07100f') }"],
    ["composer: { minHeight: 52, flexDirection: 'row', alignItems: 'flex-end', gap: 7, backgroundColor: themeColor('#ffffff', '#0d1916'), borderRadius: 19, padding: 5 }", "composer: { minHeight: 52, flexDirection: 'row', alignItems: 'flex-end', gap: 7, backgroundColor: themeColor('#f7faf8', '#0d1916'), borderRadius: 19, padding: 5 }"],
    ["attachmentMenu: { position: 'absolute', left: 12, bottom: 66, zIndex: 20, flexDirection: 'row', gap: 7, backgroundColor: themeColor('#ffffff', '#0d1916'), borderRadius: 17, padding: 8, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 }", "attachmentOverlay: { ...StyleSheet.absoluteFill, zIndex: 50 },\n  attachmentBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'transparent' },\n  attachmentMenu: { position: 'absolute', left: 12, bottom: Platform.OS === 'ios' ? 82 : 72, flexDirection: 'row', gap: 7, backgroundColor: themeColor('#f7faf8', '#0d1916'), borderRadius: 18, padding: 8, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 9 }"],
    ["attachmentOption: { width: 76, minHeight: 67, borderRadius: 13, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: themeColor('#f3f7f5', '#101d1a') }", "attachmentOption: { width: 76, minHeight: 67, borderRadius: 13, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: themeColor('#edf3ef', '#101d1a') }"],
    ["viewerSafe: { flex: 1, backgroundColor: themeColor('#f6f8f7', '#07100f') }", "viewerSafe: { flex: 1, backgroundColor: themeColor('#eef3f0', '#07100f') }"],
    ["webview: { flex: 1, backgroundColor: themeColor('#f6f8f7', '#07100f') }", "webview: { flex: 1, backgroundColor: themeColor('#eef3f0', '#07100f') }"],
  ];
  for (const [from, to] of replacements) s = exact(s, from, to, `Chat style ${from.slice(0, 24)}`);

  return s;
});

console.log('Patient UX polish applied.');
