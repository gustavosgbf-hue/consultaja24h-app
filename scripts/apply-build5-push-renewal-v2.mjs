import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(path.join(root, rel), value);

function replaceOnce(source, before, after, file) {
  if (!source.includes(before)) throw new Error('Trecho não encontrado em ' + file);
  return source.replace(before, after);
}

function patchClient() {
  const file = 'src/api/client.ts';
  let src = read(file);
  if (src.includes('export type RenovacaoPaciente')) return;
  src += `

export type RenovacaoPaciente = {
  id: number;
  tipo: string;
  etapa: 'pagamento' | 'analise' | 'pronta' | 'enviada';
  status?: string | null;
  pagamento_status?: string | null;
  criado_em?: string | null;
  medicamento?: string | null;
  receita_pronta_em?: string | null;
  receita_url?: string | null;
  receita_nome?: string | null;
  enviada_em?: string | null;
  rastreio?: string | null;
};

export async function registrarPushTokenPaciente(expoPushToken: string, plataforma: string) {
  return postJson<{ ok: boolean }>(
    '/api/paciente/push-token',
    { expo_push_token: expoPushToken, plataforma },
    true,
  );
}

export async function carregarRenovacoesPaciente() {
  return authenticatedFetch<{ ok: boolean; renovacoes: RenovacaoPaciente[] }>('/api/paciente/renovacoes');
}

export async function carregarRenovacaoPaciente(id: number) {
  return authenticatedFetch<{ ok: boolean; renovacao: RenovacaoPaciente }>(
    '/api/paciente/renovacao/' + encodeURIComponent(String(id)),
  );
}
`;
  write(file, src);
}

function patchRoot() {
  const file = 'src/AppRoot.tsx';
  let src = read(file);
  if (src.includes("from './notifications/push'")) return;

  src = replaceOnce(
    src,
    "import AtendimentoEmAndamentoCard from './components/AtendimentoEmAndamentoCard';",
    "import AtendimentoEmAndamentoCard from './components/AtendimentoEmAndamentoCard';\nimport { observarToquesEmPush, registrarPushDoPaciente } from './notifications/push';\nimport { emitPushNavigation } from './navigation/pushNavigation';",
    file,
  );

  const marker = "  const betaEmTriagem = atendimento?.etapa === 'triagem' && atendimento.pagamento_metodo === 'beta_test';";
  const effect = `  useEffect(() => {
    let ativo = true;

    async function registrar() {
      if (!ativo) return;
      await registrarPushDoPaciente();
    }

    registrar();
    const registerTimer = setInterval(registrar, 5000);

    const pararObservacao = observarToquesEmPush(async (data) => {
      const kind = String(data.kind || '');
      const atendimentoId = Number(data.atendimentoId || 0);
      if (!atendimentoId) return;

      if (kind === 'renovacao') {
        setModoAtendimento(false);
        setMostrarInicio(true);
        emitPushNavigation({
          kind: 'renovacao',
          atendimentoId,
          documentoUrl: typeof data.documentoUrl === 'string' ? data.documentoUrl : null,
        });
        return;
      }

      if (kind === 'chat') {
        try {
          const result = await carregarAtendimentoEmAndamento();
          const atual = result.atendimento || null;
          if (atual && Number(atual.id) === atendimentoId) {
            atendimentoIdRef.current = atual.id;
            etapaRef.current = atual.etapa;
            chatFechadoManualRef.current = false;
            setAtendimento(atual);
            setMostrarInicio(false);
            setModoAtendimento(true);
          }
        } catch {
          // O polling normal recupera a consulta se houver falha temporária.
        }
      }
    });

    return () => {
      ativo = false;
      clearInterval(registerTimer);
      pararObservacao();
    };
  }, []);

`;
  src = replaceOnce(src, marker, effect + marker, file);
  write(file, src);
}

function patchViewer() {
  const file = 'src/components/DocumentViewer.tsx';
  let src = read(file);
  if (src.includes('async function saveOrShare()')) return;

  src = replaceOnce(src, '  ActivityIndicator,\n  DynamicColorIOS,', '  ActivityIndicator,\n  Alert,\n  DynamicColorIOS,', file);
  src = replaceOnce(
    src,
    "import { WebView } from 'react-native-webview';",
    "import { WebView } from 'react-native-webview';\nimport * as FileSystem from 'expo-file-system/legacy';\nimport * as Sharing from 'expo-sharing';",
    file,
  );

  const openExternal = `  async function openExternal() {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      // O documento permanece aberto no visualizador interno se o sistema não conseguir abrir externamente.
    }
  }`;
  const withShare = `${openExternal}

  async function saveOrShare() {
    if (!url) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Salvar documento', 'O compartilhamento não está disponível neste aparelho.');
        return;
      }
      const ext = type === 'imagem' ? '.jpg' : '.pdf';
      const fallback = type === 'imagem' ? 'Documento.jpg' : 'Documento.pdf';
      const safeName = String(name || fallback)
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 90);
      const finalName = safeName.includes('.') ? safeName : safeName + ext;
      const target = String(FileSystem.cacheDirectory || '') + Date.now() + '-' + finalName;
      const result = await FileSystem.downloadAsync(url, target);
      await Sharing.shareAsync(result.uri, {
        mimeType: type === 'imagem' ? 'image/jpeg' : 'application/pdf',
        dialogTitle: 'Salvar ou compartilhar documento',
        UTI: type === 'imagem' ? 'public.jpeg' : 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Não foi possível salvar', 'Tente novamente em instantes.');
    }
  }`;
  src = replaceOnce(src, openExternal, withShare, file);

  src = replaceOnce(
    src,
    `          <Pressable onPress={openExternal} style={styles.external} accessibilityLabel="Abrir documento no navegador">
            <Text style={styles.externalText}>↗</Text>
          </Pressable>`,
    `          <View style={styles.headerActions}>
            <Pressable onPress={saveOrShare} style={styles.external} accessibilityLabel="Salvar ou compartilhar documento">
              <Text style={styles.saveText}>↓</Text>
            </Pressable>
            <Pressable onPress={openExternal} style={styles.external} accessibilityLabel="Abrir documento no navegador">
              <Text style={styles.externalText}>↗</Text>
            </Pressable>
          </View>`,
    file,
  );

  src = replaceOnce(
    src,
    "  external: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dfe8e3', '#0d1916') },\n  externalText:",
    "  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },\n  external: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dfe8e3', '#0d1916') },\n  saveText: { color: themeColor('#18724f', '#78f25f'), fontSize: 24, fontWeight: '600', marginTop: -2 },\n  externalText:",
    file,
  );
  write(file, src);
}

function patchApp() {
  const file = 'App.tsx';
  let src = read(file);
  if (src.includes('function RenovacaoAcompanhamento(')) return;

  src = replaceOnce(src, `  carregarDocumentosPaciente,
  carregarPaciente,`, `  carregarDocumentosPaciente,
  carregarPaciente,
  carregarRenovacoesPaciente,
  carregarRenovacaoPaciente,`, file);

  src = replaceOnce(src, `  verificarOtpPaciente,
  type TriageMessage,`, `  verificarOtpPaciente,
  type RenovacaoPaciente,
  type TriageMessage,`, file);

  src = replaceOnce(src, "import DocumentViewer from './src/components/DocumentViewer';", "import DocumentViewer from './src/components/DocumentViewer';\nimport { setPushNavigationHandler } from './src/navigation/pushNavigation';", file);
  src = replaceOnce(src, "type Tela = 'home' | 'perfil' | 'nova-consulta' | 'documentos' | 'historico-chat' | 'servicos' | 'web';", "type Tela = 'home' | 'perfil' | 'nova-consulta' | 'documentos' | 'historico-chat' | 'servicos' | 'web' | 'renovacao';", file);

  src = replaceOnce(src, `  const [documentos, setDocumentos] = useState<DocumentoPaciente[]>([]);
  const [historicoSelecionado, setHistoricoSelecionado] = useState<AtendimentoHistorico | null>(null);`, `  const [documentos, setDocumentos] = useState<DocumentoPaciente[]>([]);
  const [renovacoes, setRenovacoes] = useState<RenovacaoPaciente[]>([]);
  const [renovacaoSelecionada, setRenovacaoSelecionada] = useState<RenovacaoPaciente | null>(null);
  const [historicoSelecionado, setHistoricoSelecionado] = useState<AtendimentoHistorico | null>(null);`, file);

  src = replaceOnce(src, `  useEffect(() => {
    restaurarSessao();
  }, []);`, `  useEffect(() => {
    restaurarSessao();
  }, []);

  useEffect(() => {
    setPushNavigationHandler((action) => {
      if (action.kind !== 'renovacao') return;
      setTela('renovacao');
      setRenovacaoSelecionada(null);
      carregarRenovacaoPaciente(action.atendimentoId)
        .then((data) => setRenovacaoSelecionada(data.renovacao))
        .catch(() => {
          setTela('home');
          Alert.alert('Renovação', 'Não foi possível abrir esta renovação agora.');
        });
    });
    return () => setPushNavigationHandler(null);
  }, []);`, file);

  src = replaceOnce(src, `      const [me, agenda, history, docs] = await Promise.all([
        carregarPaciente(),
        carregarAgendamentos(),
        carregarHistoricoPaciente().catch(() => ({ ok: true, atendimentos: [] })),
        carregarDocumentosPaciente().catch(() => ({ ok: true, documentos: [] })),
      ]);`, `      const [me, agenda, history, docs, renewalData] = await Promise.all([
        carregarPaciente(),
        carregarAgendamentos(),
        carregarHistoricoPaciente().catch(() => ({ ok: true, atendimentos: [] })),
        carregarDocumentosPaciente().catch(() => ({ ok: true, documentos: [] })),
        carregarRenovacoesPaciente().catch(() => ({ ok: true, renovacoes: [] })),
      ]);`, file);

  src = replaceOnce(src, `      setHistorico(history.atendimentos || []);
      setDocumentos(docs.documentos || []);`, `      setHistorico(history.atendimentos || []);
      setDocumentos(docs.documentos || []);
      setRenovacoes(renewalData.renovacoes || []);`, file);

  src = replaceOnce(src, `    setHistorico([]);
    setDocumentos([]);`, `    setHistorico([]);
    setDocumentos([]);
    setRenovacoes([]);
    setRenovacaoSelecionada(null);`, file);

  src = replaceOnce(src, `  if (tela === 'servicos') {`, `  if (tela === 'renovacao') {
    return <RenovacaoAcompanhamento renovacao={renovacaoSelecionada} onVoltar={() => { setRenovacaoSelecionada(null); setTela('home'); carregarHome(); }} onAtualizar={async () => { if (!renovacaoSelecionada?.id) return; const data = await carregarRenovacaoPaciente(renovacaoSelecionada.id); setRenovacaoSelecionada(data.renovacao); await carregarHome(); }} />;
  }

  if (tela === 'servicos') {`, file);

  src = replaceOnce(src, `  if (tela === 'web' && webPage) {
    return <InternalWebScreen title={webPage.title} url={webPage.url} onVoltar={() => { const voltarHome = webPage.title === 'Renovar receita' || webPage.title === 'Psicologia'; setWebPage(null); setTela(voltarHome ? 'home' : 'servicos'); }} />;
  }`, `  if (tela === 'web' && webPage) {
    return <InternalWebScreen title={webPage.title} url={webPage.url} onVoltar={() => { const voltarHome = webPage.title === 'Renovar receita' || webPage.title === 'Psicologia'; const eraRenovacao = webPage.title === 'Renovar receita'; setWebPage(null); setTela(voltarHome ? 'home' : 'servicos'); if (eraRenovacao) carregarHome(); }} />;
  }`, file);

  src = replaceOnce(src, `      documentos={documentos}
      loading={homeLoading}`, `      documentos={documentos}
      renovacoes={renovacoes}
      loading={homeLoading}`, file);

  src = replaceOnce(src, `      onPsicologia={() => { setWebPage({ title: 'Psicologia', url: 'https://consultaja24h.com.br/psicologo-online' }); setTela('web'); }}
      onAbrirAtendimento=`, `      onPsicologia={() => { setWebPage({ title: 'Psicologia', url: 'https://consultaja24h.com.br/psicologo-online' }); setTela('web'); }}
      onAbrirRenovacao={(item) => { setRenovacaoSelecionada(item); setTela('renovacao'); }}
      onAbrirAtendimento=`, file);

  src = replaceOnce(src, `function PacienteHome({ paciente, agendamentos, historico, documentos, loading, mostrarTudo, onMostrarTudo, onAtualizar, onPerfil, onNovaConsulta, onDocumentos, onRenovacao, onEspecialistas, onPsicologia, onAbrirAtendimento }: {
  paciente: Paciente;
  agendamentos: Agendamento[];
  historico: AtendimentoHistorico[];
  documentos: DocumentoPaciente[];`, `function PacienteHome({ paciente, agendamentos, historico, documentos, renovacoes, loading, mostrarTudo, onMostrarTudo, onAtualizar, onPerfil, onNovaConsulta, onDocumentos, onRenovacao, onEspecialistas, onPsicologia, onAbrirRenovacao, onAbrirAtendimento }: {
  paciente: Paciente;
  agendamentos: Agendamento[];
  historico: AtendimentoHistorico[];
  documentos: DocumentoPaciente[];
  renovacoes: RenovacaoPaciente[];`, file);

  src = replaceOnce(src, `  onPsicologia: () => void;
  onAbrirAtendimento: (item: AtendimentoHistorico) => void;`, `  onPsicologia: () => void;
  onAbrirRenovacao: (item: RenovacaoPaciente) => void;
  onAbrirAtendimento: (item: AtendimentoHistorico) => void;`, file);

  src = replaceOnce(src, `  const primeiroNome = paciente.nome?.split(' ')[0] || 'Paciente';
  const atendimentoAtivo = historico.find((item) => String(item.status || '').trim().toLowerCase() === 'assumido');
  const ultimo = historico.find((item) => String(item.status || '').trim().toLowerCase() !== 'assumido');
  const itensHistorico = mostrarTudo ? historico : historico.slice(0, 4);`, `  const primeiroNome = paciente.nome?.split(' ')[0] || 'Paciente';
  const historicoConsultas = historico.filter((item) => !String(item.tipo || '').toLowerCase().startsWith('renovacao_'));
  const atendimentoAtivo = historicoConsultas.find((item) => String(item.status || '').trim().toLowerCase() === 'assumido');
  const ultimo = historicoConsultas.find((item) => String(item.status || '').trim().toLowerCase() !== 'assumido');
  const itensHistorico = mostrarTudo ? historicoConsultas : historicoConsultas.slice(0, 4);
  const renovacaoAtual = renovacoes.find((item) => String(item.pagamento_status || '').toLowerCase() === 'confirmado') || null;`, file);

  src = replaceOnce(src, `        </Pressable>

        {ultimo && (`, `        </Pressable>

        {renovacaoAtual ? (
          <Pressable onPress={() => onAbrirRenovacao(renovacaoAtual)} style={({ pressed }) => [styles.renewalStatusCard, pressed && styles.quickCardPressed]}>
            <View style={styles.renewalStatusTop}>
              <Text style={styles.renewalStatusKicker}>RENOVAÇÃO DE RECEITA</Text>
              <View style={[styles.renewalStatusPill, renovacaoAtual.etapa === 'pronta' && styles.renewalStatusPillReady]}>
                <Text style={[styles.renewalStatusPillText, renovacaoAtual.etapa === 'pronta' && styles.renewalStatusPillTextReady]}>
                  {renovacaoAtual.etapa === 'pronta' ? 'RECEITA PRONTA' : renovacaoAtual.etapa === 'enviada' ? 'ENVIADA' : 'EM ANÁLISE'}
                </Text>
              </View>
            </View>
            <Text style={styles.renewalStatusTitle}>{renovacaoAtual.tipo === 'renovacao_fisica' ? 'Receita física' : 'Receita digital'}</Text>
            <Text style={styles.renewalStatusText}>{renovacaoAtual.etapa === 'pronta' ? 'Seu documento já está disponível no app.' : renovacaoAtual.etapa === 'enviada' ? 'A receita foi enviada. Toque para acompanhar.' : 'Sua solicitação foi recebida e está sendo analisada.'}</Text>
            <Text style={styles.renewalStatusAction}>{renovacaoAtual.etapa === 'pronta' ? 'Ver receita' : 'Acompanhar solicitação'} ›</Text>
          </Pressable>
        ) : null}

        {ultimo && (`, file);

  src = src.replaceAll('historico.length > 4', 'historicoConsultas.length > 4');
  src = src.replaceAll('loading && historico.length === 0', 'loading && historicoConsultas.length === 0');

  const componentMarker = `function DocumentosPaciente({ documentos, onVoltar, onAbrirConsulta }: {`;
  const component = `function RenovacaoAcompanhamento({ renovacao, onVoltar, onAtualizar }: { renovacao: RenovacaoPaciente | null; onVoltar: () => void; onAtualizar: () => Promise<void> | void }) {
  const motion = usePageSlide(onVoltar);
  const [docAberto, setDocAberto] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function atualizar() {
    setRefreshing(true);
    try { await onAtualizar(); } finally { setRefreshing(false); }
  }

  const pronta = renovacao?.etapa === 'pronta' || renovacao?.etapa === 'enviada';
  const fisica = renovacao?.tipo === 'renovacao_fisica';

  return (
    <Animated.View style={motion.style}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.pageWrap} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={atualizar} tintColor="#16c783" colors={["#16c783"]} />}>
          <PageHeader title="Renovação de receita" onVoltar={motion.close} />
          {!renovacao ? (
            <View style={styles.renewalLoading}><ActivityIndicator color="#16c783" /><Text style={styles.renewalLoadingText}>Carregando solicitação...</Text></View>
          ) : (
            <>
              <View style={styles.renewalHero}>
                <Text style={styles.renewalHeroKicker}>{fisica ? 'RECEITA FÍSICA' : 'RECEITA DIGITAL'}</Text>
                <Text style={styles.renewalHeroTitle}>{renovacao.etapa === 'pronta' ? 'Sua receita está pronta' : renovacao.etapa === 'enviada' ? 'Sua receita foi enviada' : 'Sua solicitação está em análise'}</Text>
                <Text style={styles.renewalHeroText}>{renovacao.etapa === 'pronta' ? 'O documento já pode ser aberto, salvo ou compartilhado pelo app.' : renovacao.etapa === 'enviada' ? 'A emissão foi concluída e o envio já foi realizado.' : 'Assim que a emissão for concluída, o documento aparecerá aqui automaticamente.'}</Text>
              </View>

              <View style={styles.renewalTimeline}>
                <RenewalStep done title="Pagamento confirmado" />
                <RenewalStep done={pronta} active={!pronta} title="Análise e emissão" />
                <RenewalStep done={pronta} active={renovacao.etapa === 'pronta'} title={fisica ? 'Receita emitida' : 'Receita disponível'} />
                {fisica ? <RenewalStep done={renovacao.etapa === 'enviada'} active={renovacao.etapa === 'enviada'} title="Envio" last /> : null}
              </View>

              {renovacao.receita_url ? (
                <Pressable onPress={() => setDocAberto(true)} style={({ pressed }) => [styles.renewalDocumentCard, pressed && styles.quickCardPressed]}>
                  <View style={styles.documentPdf}><Text style={styles.documentPdfText}>PDF</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.renewalDocumentTitle}>{renovacao.receita_nome || 'Receita médica.pdf'}</Text>
                    <Text style={styles.renewalDocumentText}>Abrir receita no app</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ) : null}

              {fisica && renovacao.rastreio ? (
                <View style={styles.renewalTracking}>
                  <Text style={styles.renewalTrackingLabel}>CÓDIGO DE RASTREIO</Text>
                  <Text style={styles.renewalTrackingCode}>{renovacao.rastreio}</Text>
                </View>
              ) : null}

              <Text style={styles.renewalUpdatedHint}>Puxe a tela para baixo para atualizar o status.</Text>
            </>
          )}
        </ScrollView>
        <DocumentViewer visible={docAberto} url={renovacao?.receita_url} name={renovacao?.receita_nome || 'Receita médica.pdf'} type="pdf" onClose={() => setDocAberto(false)} />
      </SafeAreaView>
    </Animated.View>
  );
}

function RenewalStep({ title, done, active, last }: { title: string; done?: boolean; active?: boolean; last?: boolean }) {
  return <View style={[styles.renewalStep, last && { marginBottom: 0 }]}>
    <View style={styles.renewalStepRail}>
      <View style={[styles.renewalStepDot, done && styles.renewalStepDotDone, active && styles.renewalStepDotActive]}>{done ? <Text style={styles.renewalStepCheck}>✓</Text> : null}</View>
      {!last ? <View style={[styles.renewalStepLine, done && styles.renewalStepLineDone]} /> : null}
    </View>
    <Text style={[styles.renewalStepText, (done || active) && styles.renewalStepTextActive]}>{title}</Text>
  </View>;
}

`;
  src = replaceOnce(src, componentMarker, component + componentMarker, file);

  const styleMarker = `  pageWrap: { padding: 20, paddingBottom: 50 },`;
  const styles = `  renewalStatusCard: { backgroundColor: themeColor('#e7f0eb', '#0e1c18'), borderRadius: 20, padding: 17, marginBottom: 22 },
  renewalStatusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  renewalStatusKicker: { color: themeColor('#18724f', '#78f25f'), fontSize: 9.5, fontWeight: '900', letterSpacing: .9 },
  renewalStatusPill: { backgroundColor: themeColor('#dfe8e3', '#17251f'), borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  renewalStatusPillReady: { backgroundColor: themeColor('#d9f7e7', '#153a2b') },
  renewalStatusPillText: { color: themeColor('#66736e', '#9aa7a2'), fontSize: 9, fontWeight: '800' },
  renewalStatusPillTextReady: { color: themeColor('#0b8f61', '#78f25f') },
  renewalStatusTitle: { color: themeColor('#14201d', '#fff'), fontSize: 17, fontWeight: '800', marginTop: 12 },
  renewalStatusText: { color: themeColor('#596763', '#9ba9a4'), fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  renewalStatusAction: { color: '#16c783', fontSize: 12, fontWeight: '800', marginTop: 11 },
  renewalLoading: { minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 10 },
  renewalLoadingText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 12 },
  renewalHero: { backgroundColor: themeColor('#e6eee9', '#0e1c18'), borderRadius: 22, padding: 20, marginBottom: 18 },
  renewalHeroKicker: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  renewalHeroTitle: { color: themeColor('#14201d', '#fff'), fontSize: 22, lineHeight: 28, fontWeight: '800', marginTop: 9 },
  renewalHeroText: { color: themeColor('#596763', '#9ba9a4'), fontSize: 13, lineHeight: 20, marginTop: 8 },
  renewalTimeline: { backgroundColor: themeColor('#edf3ef', '#0b1715'), borderRadius: 18, padding: 17, marginBottom: 14 },
  renewalStep: { flexDirection: 'row', minHeight: 48, marginBottom: 2 },
  renewalStepRail: { width: 30, alignItems: 'center' },
  renewalStepDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: themeColor('#b8c5bf', '#31423c'), alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#edf3ef', '#0b1715') },
  renewalStepDotDone: { borderColor: '#16c783', backgroundColor: '#16c783' },
  renewalStepDotActive: { borderColor: '#16c783' },
  renewalStepCheck: { color: '#07100f', fontSize: 12, fontWeight: '900' },
  renewalStepLine: { flex: 1, width: 1.5, backgroundColor: themeColor('#c9d4ce', '#24332e'), marginVertical: 4 },
  renewalStepLineDone: { backgroundColor: '#16c783' },
  renewalStepText: { color: themeColor('#71807a', '#75827e'), fontSize: 13, fontWeight: '700', paddingTop: 2, marginLeft: 9 },
  renewalStepTextActive: { color: themeColor('#14201d', '#eef5f1') },
  renewalDocumentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: themeColor('#edf3ef', '#0d1916'), borderRadius: 18, padding: 15, marginBottom: 14 },
  renewalDocumentTitle: { color: themeColor('#14201d', '#eef5f1'), fontSize: 14, fontWeight: '800' },
  renewalDocumentText: { color: '#67bd94', fontSize: 11.5, fontWeight: '700', marginTop: 4 },
  renewalTracking: { backgroundColor: themeColor('#edf3ef', '#0d1916'), borderRadius: 16, padding: 15, marginBottom: 14 },
  renewalTrackingLabel: { color: themeColor('#66736e', '#75827e'), fontSize: 9.5, fontWeight: '900', letterSpacing: .8 },
  renewalTrackingCode: { color: themeColor('#14201d', '#fff'), fontSize: 16, fontWeight: '800', marginTop: 7, letterSpacing: .5 },
  renewalUpdatedHint: { color: themeColor('#71807a', '#75827e'), textAlign: 'center', fontSize: 11, marginTop: 8, marginBottom: 8 },

`;
  src = replaceOnce(src, styleMarker, styles + styleMarker, file);
  write(file, src);
}

patchClient();
patchRoot();
patchViewer();
patchApp();
console.log('Build 5 push, renewal tracking and PDF save/share patch applied.');
