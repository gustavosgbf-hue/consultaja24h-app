import fs from 'node:fs';

function replaceOnce(src, from, to, label) {
  if (src.includes(to)) return src;
  if (!src.includes(from)) throw new Error(`Âncora não encontrada: ${label}`);
  return src.replace(from, to);
}

// App.tsx: evita uma segunda consulta imediata, esconde o CTA concorrente e finaliza pequenos ajustes aprovados.
{
  const path = 'App.tsx';
  let src = fs.readFileSync(path, 'utf8');

  if (!src.includes('carregarAtendimentoEmAndamento,')) {
    src = replaceOnce(
      src,
      '  carregarPaciente,\n',
      '  carregarPaciente,\n  carregarAtendimentoEmAndamento,\n',
      'import carregarAtendimentoEmAndamento',
    );
  }

  src = src.replace(
    "const mensagem = encodeURIComponent('Olá, preciso de ajuda com o ConsultaJá24h.');",
    "const mensagem = encodeURIComponent('Olá, preciso de ajuda com meu atendimento.');",
  );

  src = src.replace(
    "  return `***.${n.slice(3, 6)}.${n.slice(6, 9)}-**`;",
    "  return formatarCpf(n);",
  );

  const hero = `        <View style={styles.heroCard}>\n          <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.heroEyebrow}>MÉDICO ONLINE AGORA</Text></View>\n          <Text style={styles.heroTitle}>Consulta por chat, direto pelo app.</Text>\n          <Text style={styles.heroText}>Sem videochamada. Sem precisar agendar.</Text>\n          <Pressable onPress={onNovaConsulta} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}><Text style={styles.primaryButtonText}>Falar com um médico agora</Text></Pressable>\n        </View>`;
  const heroConditional = `        {!atendimentoAtivo ? (\n          <View style={styles.heroCard}>\n            <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.heroEyebrow}>MÉDICO ONLINE AGORA</Text></View>\n            <Text style={styles.heroTitle}>Consulta por chat, direto pelo app.</Text>\n            <Text style={styles.heroText}>Sem videochamada. Sem precisar agendar.</Text>\n            <Pressable onPress={onNovaConsulta} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}><Text style={styles.primaryButtonText}>Falar com um médico agora</Text></Pressable>\n          </View>\n        ) : null}`;
  if (!src.includes(heroConditional)) {
    src = replaceOnce(src, hero, heroConditional, 'hero da nova consulta');
  }

  const irPagamento = `  async function irParaPagamento() {\n    if (!validarDados() || iniciandoBeta || salvandoPerfil) return;\n\n    if (para === 'mim' && perfilIncompleto) {`;
  const irPagamentoGuard = `  async function irParaPagamento() {\n    if (!validarDados() || iniciandoBeta || salvandoPerfil) return;\n\n    try {\n      const existente = await carregarAtendimentoEmAndamento();\n      if (existente.atendimento) {\n        Alert.alert('Atendimento em andamento', 'Você já tem uma consulta em andamento. Continue o atendimento atual antes de iniciar outra.');\n        onVoltar();\n        return;\n      }\n    } catch {\n      // Se a checagem temporária falhar, o fluxo existente continua normalmente.\n    }\n\n    if (para === 'mim' && perfilIncompleto) {`;
  if (!src.includes("Alert.alert('Atendimento em andamento', 'Você já tem uma consulta em andamento.")) {
    src = replaceOnce(src, irPagamento, irPagamentoGuard, 'proteção contra consulta simultânea');
  }

  fs.writeFileSync(path, src);
}

// AtendimentoAtual.tsx: ao encerrar, mantém a conversa aberta em somente leitura com avaliação.
{
  const path = 'src/components/AtendimentoAtual.tsx';
  let src = fs.readFileSync(path, 'utf8');

  if (!src.includes('const [encerrado, setEncerrado] = useState(false);')) {
    src = replaceOnce(
      src,
      '  const [loading, setLoading] = useState(false);\n',
      '  const [loading, setLoading] = useState(false);\n  const [encerrado, setEncerrado] = useState(false);\n',
      'estado encerrado',
    );
  }

  const statusAnchor = `        const atual = status.atendimento;\n        if (status.fila?.posicao) setPosicao(status.fila.posicao);\n        if (atual?.status === 'assumido' || atual?.medico_id) {`;
  const statusReplacement = `        const atual = status.atendimento;\n        if (status.fila?.posicao) setPosicao(status.fila.posicao);\n        const statusAtual = String(atual?.status || '').trim().toLowerCase();\n        const foiEncerrado = ['encerrado', 'finalizado', 'finalizada', 'concluido', 'concluído', 'arquivado'].includes(statusAtual);\n        if (foiEncerrado && atendimento.etapa === 'chat') {\n          setEncerrado(true);\n          return;\n        }\n        if (atual?.status === 'assumido' || atual?.medico_id) {`;
  if (!src.includes('const foiEncerrado = [')) {
    src = replaceOnce(src, statusAnchor, statusReplacement, 'detecção de encerramento');
  }

  const recoveredAnchor = `        if (recuperado.atendimento) {\n          setAtendimento(recuperado.atendimento);\n          onAtualizado?.(recuperado.atendimento);\n        } else {\n          onAtualizado?.(null);\n        }`;
  const recoveredReplacement = `        if (recuperado.atendimento) {\n          setAtendimento(recuperado.atendimento);\n          onAtualizado?.(recuperado.atendimento);\n        } else if (atendimento.etapa === 'chat') {\n          setEncerrado(true);\n        } else {\n          onAtualizado?.(null);\n        }`;
  if (!src.includes("} else if (atendimento.etapa === 'chat') {\n          setEncerrado(true);")) {
    src = replaceOnce(src, recoveredAnchor, recoveredReplacement, 'preservar chat encerrado');
  }

  const catchAnchor = `      } catch {\n        // Polling best-effort: mantém a tela atual e tenta novamente.\n      } finally {`;
  const catchReplacement = `      } catch {\n        if (atendimento.etapa === 'chat') {\n          try {\n            const recuperado = await carregarAtendimentoEmAndamento();\n            if (ativo && !recuperado.atendimento) setEncerrado(true);\n          } catch {\n            // Polling best-effort: mantém a conversa visível e tenta novamente.\n          }\n        }\n      } finally {`;
  if (!src.includes('mantém a conversa visível e tenta novamente')) {
    src = replaceOnce(src, catchAnchor, catchReplacement, 'fallback de encerramento');
  }

  src = replaceOnce(
    src,
    `  if (atendimento.etapa === 'chat') {\n    return <ChatPaciente atendimentoId={atendimento.id} medicoNome={atendimento.medico_nome} onVoltar={onVoltar} />;\n  }`,
    `  if (atendimento.etapa === 'chat') {\n    return <ChatPaciente atendimentoId={atendimento.id} medicoNome={atendimento.medico_nome} somenteLeitura={encerrado} avaliavel={encerrado} onVoltar={onVoltar} />;\n  }`,
    'chat somente leitura após encerramento',
  );

  fs.writeFileSync(path, src);
}

// AppRoot.tsx: não desmonta a conversa no exato instante em que o backend remove o atendimento ativo.
{
  const path = 'src/AppRoot.tsx';
  let src = fs.readFileSync(path, 'utf8');

  const noActive = `        if (!atual) {\n          atendimentoIdRef.current = null;\n          etapaRef.current = null;\n          chatFechadoManualRef.current = false;\n          setAtendimento(null);\n          return;\n        }`;
  const preserveOpenChat = `        if (!atual) {\n          if (etapaRef.current === 'chat' && !chatFechadoManualRef.current) {\n            return;\n          }\n          atendimentoIdRef.current = null;\n          etapaRef.current = null;\n          chatFechadoManualRef.current = false;\n          setAtendimento(null);\n          return;\n        }`;
  if (!src.includes("if (etapaRef.current === 'chat' && !chatFechadoManualRef.current)")) {
    src = replaceOnce(src, noActive, preserveOpenChat, 'preservar chat aberto no encerramento');
  }

  fs.writeFileSync(path, src);
}

console.log('Final active consultation flow applied');
