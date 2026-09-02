import fs from 'node:fs';

const path = 'App.tsx';
let s = fs.readFileSync(path, 'utf8');

function replaceOnce(oldText, newText, label) {
  if (!s.includes(oldText)) {
    if (s.includes(newText)) return;
    throw new Error(`Missing snippet: ${label}`);
  }
  s = s.replace(oldText, newText);
}

replaceOnce(
  `  type RenovacaoPaciente,\n  type TriageMessage,\n} from './src/api/client';`,
  `  type RenovacaoPaciente,\n  type TriageMessage,\n  type AtendimentoEmAndamento,\n} from './src/api/client';`,
  'type import',
);

replaceOnce(
  `  const [webPage, setWebPage] = useState<{ title: string; url: string } | null>(null);\n  const homeScrollOffsetRef = useRef(0);`,
  `  const [webPage, setWebPage] = useState<{ title: string; url: string } | null>(null);\n  const [atendimentoEmAndamento, setAtendimentoEmAndamento] = useState<AtendimentoEmAndamento | null>(null);\n  const [retomarAtendimento, setRetomarAtendimento] = useState<AtendimentoEmAndamento | null>(null);\n  const homeScrollOffsetRef = useRef(0);`,
  'home states',
);

replaceOnce(
`      const [agenda, history, docs, renewalData] = await Promise.all([
        comRetry(carregarAgendamentos),
        comRetry(carregarHistoricoPaciente),
        comRetry(carregarDocumentosPaciente),
        comRetry(carregarRenovacoesPaciente),
      ]);

      if (agenda) setAgendamentos(agenda.agendamentos || []);
      if (history) setHistorico(history.atendimentos || []);
      if (docs) setDocumentos(docs.documentos || []);
      if (renewalData) setRenovacoes(renewalData.renovacoes || []);`,
`      const [agenda, history, docs, renewalData, activeData] = await Promise.all([
        comRetry(carregarAgendamentos),
        comRetry(carregarHistoricoPaciente),
        comRetry(carregarDocumentosPaciente),
        comRetry(carregarRenovacoesPaciente),
        comRetry(carregarAtendimentoEmAndamento),
      ]);

      if (agenda) setAgendamentos(agenda.agendamentos || []);
      if (history) setHistorico(history.atendimentos || []);
      if (docs) setDocumentos(docs.documentos || []);
      if (renewalData) setRenovacoes(renewalData.renovacoes || []);
      setAtendimentoEmAndamento(activeData?.atendimento || null);`,
  'load active consultation',
);

replaceOnce(
`  if (tela === 'nova-consulta') {
    return <NovaConsulta paciente={paciente} onVoltar={() => setTela('home')} onPerfilAtualizado={setPaciente} />;
  }`,
`  if (tela === 'nova-consulta') {
    return <NovaConsulta paciente={paciente} atendimentoInicial={retomarAtendimento} onVoltar={() => { setRetomarAtendimento(null); setTela('home'); carregarHome(); }} onPerfilAtualizado={setPaciente} />;
  }`,
  'NovaConsulta render',
);

replaceOnce(
  `      historico={historico}\n      documentos={documentos}`,
  `      historico={historico}\n      atendimentoEmAndamento={atendimentoEmAndamento}\n      documentos={documentos}`,
  'home active prop',
);

replaceOnce(
  `      onNovaConsulta={() => setTela('nova-consulta')}`,
  `      onNovaConsulta={() => { setRetomarAtendimento(null); setTela('nova-consulta'); }}\n      onRetomarAtendimento={(item) => { setRetomarAtendimento(item); setTela('nova-consulta'); }}`,
  'resume handler',
);

replaceOnce(
`function PacienteHome({ paciente, agendamentos, historico, documentos, renovacoes, loading, initialScrollOffset, onScrollOffset, mostrarTudo, onMostrarTudo, onAtualizar, onPerfil, onNovaConsulta, onDocumentos, onRenovacao, onEspecialistas, onPsicologia, onAbrirRenovacao, onAbrirAtendimento }: {
  paciente: Paciente;
  agendamentos: Agendamento[];
  historico: AtendimentoHistorico[];
  documentos: DocumentoPaciente[];`,
`function PacienteHome({ paciente, agendamentos, historico, atendimentoEmAndamento, documentos, renovacoes, loading, initialScrollOffset, onScrollOffset, mostrarTudo, onMostrarTudo, onAtualizar, onPerfil, onNovaConsulta, onRetomarAtendimento, onDocumentos, onRenovacao, onEspecialistas, onPsicologia, onAbrirRenovacao, onAbrirAtendimento }: {
  paciente: Paciente;
  agendamentos: Agendamento[];
  historico: AtendimentoHistorico[];
  atendimentoEmAndamento: AtendimentoEmAndamento | null;
  documentos: DocumentoPaciente[];`,
  'PacienteHome signature',
);

replaceOnce(
  `  onNovaConsulta: () => void;\n  onDocumentos: () => void;`,
  `  onNovaConsulta: () => void;\n  onRetomarAtendimento: (item: AtendimentoEmAndamento) => void;\n  onDocumentos: () => void;`,
  'PacienteHome handler type',
);

replaceOnce(
`  const primeiroNome = paciente.nome?.split(' ')[0] || 'Paciente';
  const historicoConsultas = historico.filter((item) => !String(item.tipo || '').toLowerCase().startsWith('renovacao_'));
  const atendimentoAtivo = historicoConsultas.find((item) => String(item.status || '').trim().toLowerCase() === 'assumido');`,
`  const primeiroNome = paciente.nome?.split(' ')[0] || 'Paciente';
  const historicoConsultas = historico.filter((item) => !String(item.tipo || '').toLowerCase().startsWith('renovacao_'));
  const atendimentoAtivoHistorico = historicoConsultas.find((item) => String(item.status || '').trim().toLowerCase() === 'assumido');
  const atendimentoAtivo = atendimentoEmAndamento || atendimentoAtivoHistorico || null;`,
  'active source',
);

replaceOnce(
`        {atendimentoAtivo ? (
          <Pressable onPress={() => onAbrirAtendimento(atendimentoAtivo)} style={({ pressed }) => [styles.activeCareCard, pressed && styles.primaryPressed]}>
            <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.activeCareEyebrow}>ATENDIMENTO EM ANDAMENTO</Text></View>
            <Text style={styles.activeCareTitle}>Continuar atendimento</Text>
            <Text style={styles.activeCareText}>{atendimentoAtivo.medico_nome ? 'Voltar para a conversa com ' + atendimentoAtivo.medico_nome + '.' : 'Voltar para a conversa com o médico.'}</Text>
            <Text style={styles.activeCareAction}>Abrir conversa ›</Text>
          </Pressable>
        ) : null}`,
`        {atendimentoAtivo ? (
          <Pressable onPress={() => atendimentoEmAndamento ? onRetomarAtendimento(atendimentoEmAndamento) : onAbrirAtendimento(atendimentoAtivo as AtendimentoHistorico)} style={({ pressed }) => [styles.activeCareCard, pressed && styles.primaryPressed]}>
            <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.activeCareEyebrow}>ATENDIMENTO EM ANDAMENTO</Text></View>
            <Text style={styles.activeCareTitle}>Continuar atendimento</Text>
            <Text style={styles.activeCareText}>{atendimentoEmAndamento?.etapa === 'pagamento' ? 'Seu pagamento ainda precisa ser concluído.' : atendimentoEmAndamento?.etapa === 'triagem' ? 'Pagamento confirmado. Continue sua triagem.' : atendimentoEmAndamento?.etapa === 'fila' ? 'Sua triagem foi concluída. Continue acompanhando o atendimento.' : atendimentoAtivo.medico_nome ? 'Voltar para a conversa com ' + atendimentoAtivo.medico_nome + '.' : 'Retome de onde você parou.'}</Text>
            <Text style={styles.activeCareAction}>Continuar ›</Text>
          </Pressable>
        ) : null}`,
  'active card',
);

replaceOnce(
  `function NovaConsulta({ paciente, onVoltar, onPerfilAtualizado }: { paciente: Paciente; onVoltar: () => void; onPerfilAtualizado: (paciente: Paciente) => void }) {`,
  `function NovaConsulta({ paciente, atendimentoInicial, onVoltar, onPerfilAtualizado }: { paciente: Paciente; atendimentoInicial?: AtendimentoEmAndamento | null; onVoltar: () => void; onPerfilAtualizado: (paciente: Paciente) => void }) {`,
  'NovaConsulta signature',
);

replaceOnce(
`  const telefoneContato = digits(paciente.tel);

  function validarDados() {`,
`  const telefoneContato = digits(paciente.tel);

  useEffect(() => {
    if (!atendimentoInicial?.id) return;
    setAtendimentoPagoId(atendimentoInicial.id);
    const queixaSalva = String(atendimentoInicial.queixa || atendimentoInicial.triagem || '').trim();
    const queixaBase = queixaSalva && !queixaSalva.startsWith('(') ? queixaSalva : 'Queixa informada anteriormente';
    setQueixa(queixaBase);

    if (atendimentoInicial.etapa === 'pagamento') {
      setEtapaConsulta('pagamento');
      return;
    }
    if (atendimentoInicial.etapa === 'fila' || atendimentoInicial.etapa === 'chat') {
      setEtapaConsulta('fila');
      return;
    }
    if (atendimentoInicial.etapa === 'triagem') {
      const history: TriageMessage[] = [{ role: 'user', content: \`Queixa inicial informada pelo paciente: \${queixaBase}\` }];
      setTriageMessages(history);
      setPerguntaAtual('');
      setRespostaTriagem('');
      setEtapaConsulta('triagem');
      setTriagemLoading(true);
      conversarTriagem(SYSTEM_TRIAGE, history)
        .then((data) => tratarRetornoTriagem(data.text, history, atendimentoInicial.id))
        .catch(() => Alert.alert('Triagem', 'Não foi possível retomar a triagem agora. Tente novamente em instantes.'))
        .finally(() => setTriagemLoading(false));
    }
  }, [atendimentoInicial?.id]);

  function validarDados() {`,
  'resume effect',
);

fs.writeFileSync(path, s);
console.log('Home resume patch applied');
