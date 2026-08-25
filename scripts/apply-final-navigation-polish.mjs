import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, content) => fs.writeFileSync(path.join(root, rel), content);

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Trecho não encontrado em ${label}`);
  return source.replace(before, after);
}

function patchApp() {
  const rel = 'App.tsx';
  let src = read(rel);
  if (src.includes('finalNavigationPolishApplied')) return;

  src = replaceOnce(
    src,
    "type EtapaConsulta = 'dados' | 'pagamento' | 'triagem' | 'fila';",
    "type EtapaConsulta = 'dados' | 'pagamento' | 'triagem' | 'fila';\nconst finalNavigationPolishApplied = true;\n\nfunction atendimentoConcluido(status?: string | null) {\n  const valor = String(status || '').trim().toLowerCase();\n  return ['encerrado', 'finalizado', 'finalizada', 'concluido', 'concluído', 'arquivado'].includes(valor);\n}",
    rel,
  );

  src = replaceOnce(
    src,
    "  const [webPage, setWebPage] = useState<{ title: string; url: string } | null>(null);",
    "  const [webPage, setWebPage] = useState<{ title: string; url: string } | null>(null);\n  const homeScrollOffsetRef = useRef(0);",
    rel,
  );

  src = replaceOnce(
    src,
    `  if (tela === 'historico-chat' && historicoSelecionado) {\n    return (\n      <ChatPaciente\n        atendimentoId={historicoSelecionado.id}\n        medicoNome={historicoSelecionado.medico_nome || historicoSelecionado.profissional_nome}\n        somenteLeitura={String(historicoSelecionado.status || '').trim().toLowerCase() !== 'assumido'}\n        onVoltar={() => { setTela(historicoOrigem === 'documentos' ? 'documentos' : 'home'); setHistoricoSelecionado(null); }}\n      />\n    );\n  }`,
    `  if (tela === 'historico-chat' && historicoSelecionado) {\n    return (\n      <HistoricoChatPage\n        item={historicoSelecionado}\n        onVoltar={() => { setTela(historicoOrigem === 'documentos' ? 'documentos' : 'home'); setHistoricoSelecionado(null); }}\n      />\n    );\n  }`,
    rel,
  );

  src = replaceOnce(
    src,
    `      renovacoes={renovacoes}\n      loading={homeLoading}`,
    `      renovacoes={renovacoes}\n      loading={homeLoading}\n      initialScrollOffset={homeScrollOffsetRef.current}\n      onScrollOffset={(y) => { homeScrollOffsetRef.current = y; }}`,
    rel,
  );

  src = replaceOnce(
    src,
    `function PacienteHome({ paciente, agendamentos, historico, documentos, renovacoes, loading, mostrarTudo, onMostrarTudo, onAtualizar, onPerfil, onNovaConsulta, onDocumentos, onRenovacao, onEspecialistas, onPsicologia, onAbrirRenovacao, onAbrirAtendimento }: {`,
    `function PacienteHome({ paciente, agendamentos, historico, documentos, renovacoes, loading, initialScrollOffset, onScrollOffset, mostrarTudo, onMostrarTudo, onAtualizar, onPerfil, onNovaConsulta, onDocumentos, onRenovacao, onEspecialistas, onPsicologia, onAbrirRenovacao, onAbrirAtendimento }: {`,
    rel,
  );

  src = replaceOnce(
    src,
    `  loading: boolean;\n  mostrarTudo: boolean;`,
    `  loading: boolean;\n  initialScrollOffset: number;\n  onScrollOffset: (y: number) => void;\n  mostrarTudo: boolean;`,
    rel,
  );

  src = replaceOnce(
    src,
    `  const historicoConsultas = historico.filter((item) => !String(item.tipo || '').toLowerCase().startsWith('renovacao_'));\n  const atendimentoAtivo = historicoConsultas.find((item) => String(item.status || '').trim().toLowerCase() === 'assumido');\n  const ultimo = historicoConsultas.find((item) => String(item.status || '').trim().toLowerCase() !== 'assumido');\n  const itensHistorico = mostrarTudo ? historicoConsultas : historicoConsultas.slice(0, 4);`,
    `  const historicoConsultas = historico.filter((item) => !String(item.tipo || '').toLowerCase().startsWith('renovacao_'));\n  const atendimentoAtivo = historicoConsultas.find((item) => String(item.status || '').trim().toLowerCase() === 'assumido');\n  const historicoFinalizados = historicoConsultas.filter((item) => atendimentoConcluido(item.status));\n  const ultimo = historicoFinalizados[0] || null;\n  const itensHistorico = mostrarTudo ? historicoFinalizados : historicoFinalizados.slice(0, 4);`,
    rel,
  );

  src = replaceOnce(
    src,
    `      <ScrollView\n        contentContainerStyle={styles.home}\n        showsVerticalScrollIndicator={false}\n        refreshControl={<RefreshControl refreshing={loading} onRefresh={onAtualizar} tintColor="#16c783" colors={["#16c783"]} />}\n      >`,
    `      <ScrollView\n        contentContainerStyle={styles.home}\n        showsVerticalScrollIndicator={false}\n        contentOffset={{ x: 0, y: initialScrollOffset }}\n        onScroll={(event) => onScrollOffset(event.nativeEvent.contentOffset.y)}\n        scrollEventThrottle={32}\n        refreshControl={<RefreshControl refreshing={loading} onRefresh={onAtualizar} tintColor="#16c783" colors={["#16c783"]} />}\n      >`,
    rel,
  );

  src = src.replace(/historicoConsultas\.length > 4/g, 'historicoFinalizados.length > 4');
  src = src.replace(/loading && historicoConsultas\.length === 0/g, 'loading && historicoFinalizados.length === 0');

  const marker = `function RenovacaoAcompanhamento({ renovacao, onVoltar, onAtualizar }:`;
  const wrapper = `function HistoricoChatPage({ item, onVoltar }: { item: AtendimentoHistorico; onVoltar: () => void }) {\n  const motion = usePageSlide(onVoltar);\n  return (\n    <Animated.View style={motion.style}>\n      <ChatPaciente\n        atendimentoId={item.id}\n        medicoNome={item.medico_nome || item.profissional_nome}\n        somenteLeitura={String(item.status || '').trim().toLowerCase() !== 'assumido'}\n        onVoltar={motion.close}\n      />\n    </Animated.View>\n  );\n}\n\n`;
  if (!src.includes(marker)) throw new Error(`Marcador não encontrado em ${rel}`);
  src = src.replace(marker, wrapper + marker);

  write(rel, src);
}

function patchAppRoot() {
  const rel = 'src/AppRoot.tsx';
  let src = read(rel);
  if (src.includes('function AtendimentoAtualAnimado')) return;

  src = replaceOnce(
    src,
    `  ActivityIndicator,\n  DynamicColorIOS,`,
    `  ActivityIndicator,\n  Animated,\n  DynamicColorIOS,`,
    rel,
  );

  const componentMarker = `export default function AppRoot() {`;
  const component = `function AtendimentoAtualAnimado({ atendimento, onVoltar, onAtualizado }: {\n  atendimento: AtendimentoEmAndamento;\n  onVoltar: () => void;\n  onAtualizado: (atual: AtendimentoEmAndamento | null) => void;\n}) {\n  const x = useRef(new Animated.Value(28)).current;\n  const opacity = useRef(new Animated.Value(0)).current;\n\n  useEffect(() => {\n    Animated.parallel([\n      Animated.timing(x, { toValue: 0, duration: 230, useNativeDriver: true }),\n      Animated.timing(opacity, { toValue: 1, duration: 190, useNativeDriver: true }),\n    ]).start();\n  }, [opacity, x]);\n\n  function fechar() {\n    Animated.parallel([\n      Animated.timing(x, { toValue: 34, duration: 170, useNativeDriver: true }),\n      Animated.timing(opacity, { toValue: 0, duration: 145, useNativeDriver: true }),\n    ]).start(({ finished }) => {\n      if (finished) onVoltar();\n    });\n  }\n\n  return (\n    <Animated.View style={{ flex: 1, opacity, transform: [{ translateX: x }] }}>\n      <AtendimentoAtual atendimentoInicial={atendimento} onVoltar={fechar} onAtualizado={onAtualizado} />\n    </Animated.View>\n  );\n}\n\n`;
  src = replaceOnce(src, componentMarker, component + componentMarker, rel);

  src = replaceOnce(
    src,
    `      <AtendimentoAtual\n        atendimentoInicial={atendimento}\n        onVoltar={() => {`,
    `      <AtendimentoAtualAnimado\n        atendimento={atendimento}\n        onVoltar={() => {`,
    rel,
  );

  write(rel, src);
}

patchApp();
patchAppRoot();
console.log('Final navigation polish applied.');
