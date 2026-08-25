import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content);
}

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Trecho não encontrado em ${label}`);
  }
  return source.replace(before, after);
}

function patchClient() {
  const rel = 'src/api/client.ts';
  let src = read(rel);
  if (src.includes('export type RenovacaoPaciente')) return;

  src += `\n\nexport type RenovacaoPaciente = {\n  id: number;\n  tipo: string;\n  etapa: 'pagamento' | 'analise' | 'pronta' | 'enviada';\n  status?: string | null;\n  pagamento_status?: string | null;\n  criado_em?: string | null;\n  medicamento?: string | null;\n  receita_pronta_em?: string | null;\n  receita_url?: string | null;\n  receita_nome?: string | null;\n  enviada_em?: string | null;\n  rastreio?: string | null;\n};\n\nexport async function registrarPushTokenPaciente(expoPushToken: string, plataforma: string) {\n  return postJson<{ ok: boolean }>(\n    '/api/paciente/push-token',\n    { expo_push_token: expoPushToken, plataforma },\n    true,\n  );\n}\n\nexport async function carregarRenovacoesPaciente() {\n  return authenticatedFetch<{ ok: boolean; renovacoes: RenovacaoPaciente[] }>('/api/paciente/renovacoes');\n}\n\nexport async function carregarRenovacaoPaciente(id: number) {\n  return authenticatedFetch<{ ok: boolean; renovacao: RenovacaoPaciente }>(\n    \\`/api/paciente/renovacao/\\${encodeURIComponent(String(id))}\\`,\n  );\n}\n`;

  write(rel, src);
}

function patchAppRoot() {
  const rel = 'src/AppRoot.tsx';
  let src = read(rel);
  if (src.includes("from './notifications/push'")) return;

  src = replaceOnce(
    src,
    "import AtendimentoEmAndamentoCard from './components/AtendimentoEmAndamentoCard';",
    "import AtendimentoEmAndamentoCard from './components/AtendimentoEmAndamentoCard';\nimport { observarToquesEmPush, registrarPushDoPaciente } from './notifications/push';\nimport { emitPushNavigation } from './navigation/pushNavigation';",
    rel,
  );

  const marker = "  const betaEmTriagem = atendimento?.etapa === 'triagem' && atendimento.pagamento_metodo === 'beta_test';";
  const effect = `  useEffect(() => {\n    let ativo = true;\n\n    async function registrar() {\n      if (!ativo) return;\n      await registrarPushDoPaciente();\n    }\n\n    registrar();\n    const registerTimer = setInterval(registrar, 5000);\n\n    const pararObservacao = observarToquesEmPush(async (data) => {\n      const kind = String(data.kind || '');\n      const atendimentoId = Number(data.atendimentoId || 0);\n      if (!atendimentoId) return;\n\n      if (kind === 'renovacao') {\n        setModoAtendimento(false);\n        setMostrarInicio(true);\n        emitPushNavigation({\n          kind: 'renovacao',\n          atendimentoId,\n          documentoUrl: typeof data.documentoUrl === 'string' ? data.documentoUrl : null,\n        });\n        return;\n      }\n\n      if (kind === 'chat') {\n        try {\n          const result = await carregarAtendimentoEmAndamento();\n          const atual = result.atendimento || null;\n          if (atual && Number(atual.id) === atendimentoId) {\n            atendimentoIdRef.current = atual.id;\n            etapaRef.current = atual.etapa;\n            chatFechadoManualRef.current = false;\n            setAtendimento(atual);\n            setMostrarInicio(false);\n            setModoAtendimento(true);\n          }\n        } catch {\n          // O polling normal recupera a consulta se houver falha temporária.\n        }\n      }\n    });\n\n    return () => {\n      ativo = false;\n      clearInterval(registerTimer);\n      pararObservacao();\n    };\n  }, []);\n\n`;

  src = replaceOnce(src, marker, effect + marker, rel);
  write(rel, src);
}

function patchDocumentViewer() {
  const rel = 'src/components/DocumentViewer.tsx';
  let src = read(rel);
  if (src.includes('Salvar ou compartilhar documento')) return;

  src = replaceOnce(
    src,
    '  ActivityIndicator,\n  DynamicColorIOS,',
    '  ActivityIndicator,\n  Alert,\n  DynamicColorIOS,',
    rel,
  );

  src = replaceOnce(
    src,
    "import { WebView } from 'react-native-webview';",
    "import { WebView } from 'react-native-webview';\nimport * as FileSystem from 'expo-file-system/legacy';\nimport * as Sharing from 'expo-sharing';",
    rel,
  );

  src = replaceOnce(
    src,
    `  async function openExternal() {\n    if (!url) return;\n    try {\n      await Linking.openURL(url);\n    } catch {\n      // O documento permanece aberto no visualizador interno se o sistema não conseguir abrir externamente.\n    }\n  }`,
    `  async function openExternal() {\n    if (!url) return;\n    try {\n      await Linking.openURL(url);\n    } catch {\n      // O documento permanece aberto no visualizador interno se o sistema não conseguir abrir externamente.\n    }\n  }\n\n  async function saveOrShare() {\n    if (!url) return;\n    try {\n      const available = await Sharing.isAvailableAsync();\n      if (!available) {\n        Alert.alert('Salvar documento', 'O compartilhamento não está disponível neste aparelho.');\n        return;\n      }\n      const ext = type === 'imagem' ? '.jpg' : '.pdf';\n      const fallback = type === 'imagem' ? 'Documento.jpg' : 'Documento.pdf';\n      const safeName = String(name || fallback)\n        .replace(/[^a-zA-Z0-9._-]+/g, '_')\n        .replace(/_+/g, '_')\n        .slice(0, 90);\n      const finalName = safeName.includes('.') ? safeName : safeName + ext;\n      const target = \\`\\${FileSystem.cacheDirectory}\\${Date.now()}-\\${finalName}\\`;\n      const result = await FileSystem.downloadAsync(url, target);\n      await Sharing.shareAsync(result.uri, {\n        mimeType: type === 'imagem' ? 'image/jpeg' : 'application/pdf',\n        dialogTitle: 'Salvar ou compartilhar documento',\n        UTI: type === 'imagem' ? 'public.jpeg' : 'com.adobe.pdf',\n      });\n    } catch {\n      Alert.alert('Não foi possível salvar', 'Tente novamente em instantes.');\n    }\n  }`,
    rel,
  );

  src = replaceOnce(
    src,
    `          <Pressable onPress={openExternal} style={styles.external} accessibilityLabel="Abrir documento no navegador">\n            <Text style={styles.externalText}>↗</Text>\n          </Pressable>`,
    `          <View style={styles.headerActions}>\n            <Pressable onPress={saveOrShare} style={styles.external} accessibilityLabel="Salvar ou compartilhar documento">\n              <Text style={styles.saveText}>↓</Text>\n            </Pressable>\n            <Pressable onPress={openExternal} style={styles.external} accessibilityLabel="Abrir documento no navegador">\n              <Text style={styles.externalText}>↗</Text>\n            </Pressable>\n          </View>`,
    rel,
  );

  src = replaceOnce(
    src,
    "  external: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dfe8e3', '#0d1916') },\n  externalText:",
    "  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },\n  external: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dfe8e3', '#0d1916') },\n  saveText: { color: themeColor('#18724f', '#78f25f'), fontSize: 24, fontWeight: '600', marginTop: -2 },\n  externalText:",
    rel,
  );

  write(rel, src);
}

function patchApp() {
  const rel = 'App.tsx';
  let src = read(rel);
  if (src.includes('function RenovacaoAcompanhamento(')) return;

  src = replaceOnce(
    src,
    `  carregarDocumentosPaciente,\n  carregarPaciente,`,
    `  carregarDocumentosPaciente,\n  carregarPaciente,\n  carregarRenovacoesPaciente,\n  carregarRenovacaoPaciente,`,
    rel,
  );

  src = replaceOnce(
    src,
    `  verificarOtpPaciente,\n  type TriageMessage,`,
    `  verificarOtpPaciente,\n  type RenovacaoPaciente,\n  type TriageMessage,`,
    rel,
  );

  src = replaceOnce(
    src,
    "import DocumentViewer from './src/components/DocumentViewer';",
    "import DocumentViewer from './src/components/DocumentViewer';\nimport { setPushNavigationHandler } from './src/navigation/pushNavigation';",
    rel,
  );

  src = replaceOnce(
    src,
    "type Tela = 'home' | 'perfil' | 'nova-consulta' | 'documentos' | 'historico-chat' | 'servicos' | 'web';",
    "type Tela = 'home' | 'perfil' | 'nova-consulta' | 'documentos' | 'historico-chat' | 'servicos' | 'web' | 'renovacao';",
    rel,
  );

  src = replaceOnce(
    src,
    `  const [documentos, setDocumentos] = useState<DocumentoPaciente[]>([]);\n  const [historicoSelecionado, setHistoricoSelecionado] = useState<AtendimentoHistorico | null>(null);`,
    `  const [documentos, setDocumentos] = useState<DocumentoPaciente[]>([]);\n  const [renovacoes, setRenovacoes] = useState<RenovacaoPaciente[]>([]);\n  const [renovacaoSelecionada, setRenovacaoSelecionada] = useState<RenovacaoPaciente | null>(null);\n  const [historicoSelecionado, setHistoricoSelecionado] = useState<AtendimentoHistorico | null>(null);`,
    rel,
  );

  src = replaceOnce(
    src,
    `  useEffect(() => {\n    restaurarSessao();\n  }, []);`,
    `  useEffect(() => {\n    restaurarSessao();\n  }, []);\n\n  useEffect(() => {\n    setPushNavigationHandler((action) => {\n      if (action.kind !== 'renovacao') return;\n      setTela('renovacao');\n      setRenovacaoSelecionada(null);\n      carregarRenovacaoPaciente(action.atendimentoId)\n        .then((data) => setRenovacaoSelecionada(data.renovacao))\n        .catch(() => {\n          setTela('home');\n          Alert.alert('Renovação', 'Não foi possível abrir esta renovação agora.');\n        });\n    });\n    return () => setPushNavigationHandler(null);\n  }, []);`,
    rel,
  );

  src = replaceOnce(
    src,
    `      const [me, agenda, history, docs] = await Promise.all([\n        carregarPaciente(),\n        carregarAgendamentos(),\n        carregarHistoricoPaciente().catch(() => ({ ok: true, atendimentos: [] })),\n        carregarDocumentosPaciente().catch(() => ({ ok: true, documentos: [] })),\n      ]);`,
    `      const [me, agenda, history, docs, renewalData] = await Promise.all([\n        carregarPaciente(),\n        carregarAgendamentos(),\n        carregarHistoricoPaciente().catch(() => ({ ok: true, atendimentos: [] })),\n        carregarDocumentosPaciente().catch(() => ({ ok: true, documentos: [] })),\n        carregarRenovacoesPaciente().catch(() => ({ ok: true, renovacoes: [] })),\n      ]);`,
    rel,
  );

  src = replaceOnce(
    src,
    `      setHistorico(history.atendimentos || []);\n      setDocumentos(docs.documentos || []);`,
    `      setHistorico(history.atendimentos || []);\n      setDocumentos(docs.documentos || []);\n      setRenovacoes(renewalData.renovacoes || []);`,
    rel,
  );

  src = replaceOnce(
    src,
    `    setHistorico([]);\n    setDocumentos([]);`,
    `    setHistorico([]);\n    setDocumentos([]);\n    setRenovacoes([]);\n    setRenovacaoSelecionada(null);`,
    rel,
  );

  src = replaceOnce(
    src,
    `  if (tela === 'servicos') {`,
    `  if (tela === 'renovacao') {\n    return <RenovacaoAcompanhamento renovacao={renovacaoSelecionada} onVoltar={() => { setRenovacaoSelecionada(null); setTela('home'); carregarHome(); }} onAtualizar={async () => { if (!renovacaoSelecionada?.id) return; const data = await carregarRenovacaoPaciente(renovacaoSelecionada.id); setRenovacaoSelecionada(data.renovacao); await carregarHome(); }} />;\n  }\n\n  if (tela === 'servicos') {`,
    rel,
  );

  src = replaceOnce(
    src,
    `  if (tela === 'web' && webPage) {\n    return <InternalWebScreen title={webPage.title} url={webPage.url} onVoltar={() => { const voltarHome = webPage.title === 'Renovar receita' || webPage.title === 'Psicologia'; setWebPage(null); setTela(voltarHome ? 'home' : 'servicos'); }} />;\n  }`,
    `  if (tela === 'web' && webPage) {\n    return <InternalWebScreen title={webPage.title} url={webPage.url} onVoltar={() => { const voltarHome = webPage.title === 'Renovar receita' || webPage.title === 'Psicologia'; const eraRenovacao = webPage.title === 'Renovar receita'; setWebPage(null); setTela(voltarHome ? 'home' : 'servicos'); if (eraRenovacao) carregarHome(); }} />;\n  }`,
    rel,
  );

  src = replaceOnce(
    src,
    `      documentos={documentos}\n      loading={homeLoading}`,
    `      documentos={documentos}\n      renovacoes={renovacoes}\n      loading={homeLoading}`,
    rel,
  );

  src = replaceOnce(
    src,
    `      onPsicologia={() => { setWebPage({ title: 'Psicologia', url: 'https://consultaja24h.com.br/psicologo-online' }); setTela('web'); }}\n      onAbrirAtendimento=`,
    `      onPsicologia={() => { setWebPage({ title: 'Psicologia', url: 'https://consultaja24h.com.br/psicologo-online' }); setTela('web'); }}\n      onAbrirRenovacao={(item) => { setRenovacaoSelecionada(item); setTela('renovacao'); }}\n      onAbrirAtendimento=`,
    rel,
  );

  src = replaceOnce(
    src,
    `function PacienteHome({ paciente, agendamentos, historico, documentos, loading, mostrarTudo, onMostrarTudo, onAtualizar, onPerfil, onNovaConsulta, onDocumentos, onRenovacao, onEspecialistas, onPsicologia, onAbrirAtendimento }: {\n  paciente: Paciente;\n  agendamentos: Agendamento[];\n  historico: AtendimentoHistorico[];\n  documentos: DocumentoPaciente[];`,
    `function PacienteHome({ paciente, agendamentos, historico, documentos, renovacoes, loading, mostrarTudo, onMostrarTudo, onAtualizar, onPerfil, onNovaConsulta, onDocumentos, onRenovacao, onEspecialistas, onPsicologia, onAbrirRenovacao, onAbrirAtendimento }: {\n  paciente: Paciente;\n  agendamentos: Agendamento[];\n  historico: AtendimentoHistorico[];\n  documentos: DocumentoPaciente[];\n  renovacoes: RenovacaoPaciente[];`,
    rel,
  );

  src = replaceOnce(
    src,
    `  onPsicologia: () => void;\n  onAbrirAtendimento: (item: AtendimentoHistorico) => void;`,
    `  onPsicologia: () => void;\n  onAbrirRenovacao: (item: RenovacaoPaciente) => void;\n  onAbrirAtendimento: (item: AtendimentoHistorico) => void;`,
    rel,
  );

  src = replaceOnce(
    src,
    `  const primeiroNome = paciente.nome?.split(' ')[0] || 'Paciente';\n  const atendimentoAtivo = historico.find((item) => String(item.status || '').trim().toLowerCase() === 'assumido');\n  const ultimo = historico.find((item) => String(item.status || '').trim().toLowerCase() !== 'assumido');\n  const itensHistorico = mostrarTudo ? historico : historico.slice(0, 4);`,
    `  const primeiroNome = paciente.nome?.split(' ')[0] || 'Paciente';\n  const historicoConsultas = historico.filter((item) => !String(item.tipo || '').toLowerCase().startsWith('renovacao_'));\n  const atendimentoAtivo = historicoConsultas.find((item) => String(item.status || '').trim().toLowerCase() === 'assumido');\n  const ultimo = historicoConsultas.find((item) => String(item.status || '').trim().toLowerCase() !== 'assumido');\n  const itensHistorico = mostrarTudo ? historicoConsultas : historicoConsultas.slice(0, 4);\n  const renovacaoAtual = renovacoes.find((item) => String(item.pagamento_status || '').toLowerCase() === 'confirmado') || null;`,
    rel,
  );

  src = replaceOnce(
    src,
    `        </Pressable>\n\n        {ultimo && (`,
    `        </Pressable>\n\n        {renovacaoAtual ? (\n          <Pressable onPress={() => onAbrirRenovacao(renovacaoAtual)} style={({ pressed }) => [styles.renewalStatusCard, pressed && styles.quickCardPressed]}>\n            <View style={styles.renewalStatusTop}>\n              <Text style={styles.renewalStatusKicker}>RENOVAÇÃO DE RECEITA</Text>\n              <View style={[styles.renewalStatusPill, renovacaoAtual.etapa === 'pronta' && styles.renewalStatusPillReady]}>\n                <Text style={[styles.renewalStatusPillText, renovacaoAtual.etapa === 'pronta' && styles.renewalStatusPillTextReady]}>\n                  {renovacaoAtual.etapa === 'pronta' ? 'RECEITA PRONTA' : renovacaoAtual.etapa === 'enviada' ? 'ENVIADA' : 'EM ANÁLISE'}\n                </Text>\n              </View>\n            </View>\n            <Text style={styles.renewalStatusTitle}>{renovacaoAtual.tipo === 'renovacao_fisica' ? 'Receita física' : 'Receita digital'}</Text>\n            <Text style={styles.renewalStatusText}>{renovacaoAtual.etapa === 'pronta' ? 'Seu documento já está disponível no app.' : renovacaoAtual.etapa === 'enviada' ? 'A receita foi enviada. Toque para acompanhar.' : 'Sua solicitação foi recebida e está sendo analisada.'}</Text>\n            <Text style={styles.renewalStatusAction}>{renovacaoAtual.etapa === 'pronta' ? 'Ver receita' : 'Acompanhar solicitação'} ›</Text>\n          </Pressable>\n        ) : null}\n\n        {ultimo && (`,
    rel,
  );

  src = src.replaceAll('historico.length > 4', 'historicoConsultas.length > 4');
  src = src.replaceAll('loading && historico.length === 0', 'loading && historicoConsultas.length === 0');

  const componentMarker = `function DocumentosPaciente({ documentos, onVoltar, onAbrirConsulta }: {`;
  const renewalComponent = `function RenovacaoAcompanhamento({ renovacao, onVoltar, onAtualizar }: { renovacao: RenovacaoPaciente | null; onVoltar: () => void; onAtualizar: () => Promise<void> | void }) {\n  const motion = usePageSlide(onVoltar);\n  const [docAberto, setDocAberto] = useState(false);\n  const [refreshing, setRefreshing] = useState(false);\n\n  async function atualizar() {\n    setRefreshing(true);\n    try {\n      await onAtualizar();\n    } finally {\n      setRefreshing(false);\n    }\n  }\n\n  const pronta = renovacao?.etapa === 'pronta' || renovacao?.etapa === 'enviada';\n  const fisica = renovacao?.tipo === 'renovacao_fisica';\n\n  return (\n    <Animated.View style={motion.style}>\n      <SafeAreaView style={styles.safe}>\n        <ScrollView contentContainerStyle={styles.pageWrap} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={atualizar} tintColor="#16c783" colors={["#16c783"]} />}>\n          <PageHeader title="Renovação de receita" onVoltar={motion.close} />\n          {!renovacao ? (\n            <View style={styles.renewalLoading}><ActivityIndicator color="#16c783" /><Text style={styles.renewalLoadingText}>Carregando solicitação...</Text></View>\n          ) : (\n            <>\n              <View style={styles.renewalHero}>\n                <Text style={styles.renewalHeroKicker}>{fisica ? 'RECEITA FÍSICA' : 'RECEITA DIGITAL'}</Text>\n                <Text style={styles.renewalHeroTitle}>{renovacao.etapa === 'pronta' ? 'Sua receita está pronta' : renovacao.etapa === 'enviada' ? 'Sua receita foi enviada' : 'Sua solicitação está em análise'}</Text>\n                <Text style={styles.renewalHeroText}>{renovacao.etapa === 'pronta' ? 'O documento já pode ser aberto, salvo ou compartilhado pelo app.' : renovacao.etapa === 'enviada' ? 'A emissão foi concluída e o envio já foi realizado.' : 'Assim que a emissão for concluída, o documento aparecerá aqui automaticamente.'}</Text>\n              </View>\n\n              <View style={styles.renewalTimeline}>\n                <RenewalStep done title="Pagamento confirmado" />\n                <RenewalStep done={renovacao.etapa !== 'analise'} active={renovacao.etapa === 'analise'} title="Análise e emissão" />\n                <RenewalStep done={pronta} active={renovacao.etapa === 'pronta'} title={fisica ? 'Receita emitida' : 'Receita disponível'} />\n                {fisica ? <RenewalStep done={renovacao.etapa === 'enviada'} active={renovacao.etapa === 'enviada'} title="Envio" last /> : null}\n              </View>\n\n              {renovacao.receita_url ? (\n                <Pressable onPress={() => setDocAberto(true)} style={({ pressed }) => [styles.renewalDocumentCard, pressed && styles.quickCardPressed]}>\n                  <View style={styles.documentPdf}><Text style={styles.documentPdfText}>PDF</Text></View>\n                  <View style={{ flex: 1 }}>\n                    <Text style={styles.renewalDocumentTitle}>{renovacao.receita_nome || 'Receita médica.pdf'}</Text>\n                    <Text style={styles.renewalDocumentText}>Abrir receita no app</Text>\n                  </View>\n                  <Text style={styles.chevron}>›</Text>\n                </Pressable>\n              ) : null}\n\n              {fisica && renovacao.rastreio ? (\n                <View style={styles.renewalTracking}>\n                  <Text style={styles.renewalTrackingLabel}>CÓDIGO DE RASTREIO</Text>\n                  <Text style={styles.renewalTrackingCode}>{renovacao.rastreio}</Text>\n                </View>\n              ) : null}\n\n              <Text style={styles.renewalUpdatedHint}>Puxe a tela para baixo para atualizar o status.</Text>\n            </>\n          )}\n        </ScrollView>\n        <DocumentViewer visible={docAberto} url={renovacao?.receita_url} name={renovacao?.receita_nome || 'Receita médica.pdf'} type="pdf" onClose={() => setDocAberto(false)} />\n      </SafeAreaView>\n    </Animated.View>\n  );\n}\n\nfunction RenewalStep({ title, done, active, last }: { title: string; done?: boolean; active?: boolean; last?: boolean }) {\n  return <View style={[styles.renewalStep, last && { marginBottom: 0 }]}>\n    <View style={styles.renewalStepRail}>\n      <View style={[styles.renewalStepDot, done && styles.renewalStepDotDone, active && styles.renewalStepDotActive]}>{done ? <Text style={styles.renewalStepCheck}>✓</Text> : null}</View>\n      {!last ? <View style={[styles.renewalStepLine, done && styles.renewalStepLineDone]} /> : null}\n    </View>\n    <Text style={[styles.renewalStepText, (done || active) && styles.renewalStepTextActive]}>{title}</Text>\n  </View>;\n}\n\n`;
  src = replaceOnce(src, componentMarker, renewalComponent + componentMarker, rel);

  const styleMarker = `  pageWrap: { padding: 20, paddingBottom: 50 },`;
  const renewalStyles = `  renewalStatusCard: { backgroundColor: themeColor('#e7f0eb', '#0e1c18'), borderRadius: 20, padding: 17, marginBottom: 22 },\n  renewalStatusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },\n  renewalStatusKicker: { color: themeColor('#18724f', '#78f25f'), fontSize: 9.5, fontWeight: '900', letterSpacing: .9 },\n  renewalStatusPill: { backgroundColor: themeColor('#dfe8e3', '#17251f'), borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },\n  renewalStatusPillReady: { backgroundColor: themeColor('#d9f7e7', '#153a2b') },\n  renewalStatusPillText: { color: themeColor('#66736e', '#9aa7a2'), fontSize: 9, fontWeight: '800' },\n  renewalStatusPillTextReady: { color: themeColor('#0b8f61', '#78f25f') },\n  renewalStatusTitle: { color: themeColor('#14201d', '#fff'), fontSize: 17, fontWeight: '800', marginTop: 12 },\n  renewalStatusText: { color: themeColor('#596763', '#9ba9a4'), fontSize: 12.5, lineHeight: 18, marginTop: 5 },\n  renewalStatusAction: { color: '#16c783', fontSize: 12, fontWeight: '800', marginTop: 11 },\n  renewalLoading: { minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 10 },\n  renewalLoadingText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 12 },\n  renewalHero: { backgroundColor: themeColor('#e6eee9', '#0e1c18'), borderRadius: 22, padding: 20, marginBottom: 18 },\n  renewalHeroKicker: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 10, fontWeight: '900', letterSpacing: 1 },\n  renewalHeroTitle: { color: themeColor('#14201d', '#fff'), fontSize: 22, lineHeight: 28, fontWeight: '800', marginTop: 9 },\n  renewalHeroText: { color: themeColor('#596763', '#9ba9a4'), fontSize: 13, lineHeight: 20, marginTop: 8 },\n  renewalTimeline: { backgroundColor: themeColor('#edf3ef', '#0b1715'), borderRadius: 18, padding: 17, marginBottom: 14 },\n  renewalStep: { flexDirection: 'row', minHeight: 48, marginBottom: 2 },\n  renewalStepRail: { width: 30, alignItems: 'center' },\n  renewalStepDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: themeColor('#b8c5bf', '#31423c'), alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#edf3ef', '#0b1715') },\n  renewalStepDotDone: { borderColor: '#16c783', backgroundColor: '#16c783' },\n  renewalStepDotActive: { borderColor: '#16c783' },\n  renewalStepCheck: { color: '#07100f', fontSize: 12, fontWeight: '900' },\n  renewalStepLine: { flex: 1, width: 1.5, backgroundColor: themeColor('#c9d4ce', '#24332e'), marginVertical: 4 },\n  renewalStepLineDone: { backgroundColor: '#16c783' },\n  renewalStepText: { color: themeColor('#71807a', '#75827e'), fontSize: 13, fontWeight: '700', paddingTop: 2, marginLeft: 9 },\n  renewalStepTextActive: { color: themeColor('#14201d', '#eef5f1') },\n  renewalDocumentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: themeColor('#edf3ef', '#0d1916'), borderRadius: 18, padding: 15, marginBottom: 14 },\n  renewalDocumentTitle: { color: themeColor('#14201d', '#eef5f1'), fontSize: 14, fontWeight: '800' },\n  renewalDocumentText: { color: '#67bd94', fontSize: 11.5, fontWeight: '700', marginTop: 4 },\n  renewalTracking: { backgroundColor: themeColor('#edf3ef', '#0d1916'), borderRadius: 16, padding: 15, marginBottom: 14 },\n  renewalTrackingLabel: { color: themeColor('#66736e', '#75827e'), fontSize: 9.5, fontWeight: '900', letterSpacing: .8 },\n  renewalTrackingCode: { color: themeColor('#14201d', '#fff'), fontSize: 16, fontWeight: '800', marginTop: 7, letterSpacing: .5 },\n  renewalUpdatedHint: { color: themeColor('#71807a', '#75827e'), textAlign: 'center', fontSize: 11, marginTop: 8, marginBottom: 8 },\n\n`;
  src = replaceOnce(src, styleMarker, renewalStyles + styleMarker, rel);

  write(rel, src);
}

patchClient();
patchAppRoot();
patchDocumentViewer();
patchApp();

console.log('Build 5 push, renewal tracking and PDF save/share patch applied.');
