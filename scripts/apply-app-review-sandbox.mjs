import fs from 'fs';

function patch(path, transform) {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) {
    console.log(`[app-review-sandbox] no changes needed in ${path}`);
    return;
  }
  fs.writeFileSync(path, after);
  console.log(`[app-review-sandbox] updated ${path}`);
}

patch('App.tsx', (src) => {
  let out = src;
  out = out.replace(`  iniciarAtendimentoBeta,\n`, '');
  out = out.replace(`const BETA_TEST_PHONE = '98991344646';\n`, '');
  out = out.replace(`  const [iniciandoBeta, setIniciandoBeta] = useState(false);\n`, '');
  out = out.replace(`    if (!validarDados() || iniciandoBeta || salvandoPerfil) return;`, `    if (!validarDados() || salvandoPerfil) return;`);
  out = out.replace(`loading={iniciandoBeta || salvandoPerfil}`, `loading={salvandoPerfil}`);

  const betaBlock = `    const beta = digits(paciente.tel).slice(-11) === BETA_TEST_PHONE;\n    if (!beta) {\n      mudarEtapa('pagamento', 1);\n      return;\n    }\n\n    setIniciandoBeta(true);\n    try {\n      const data = await iniciarAtendimentoBeta({\n        nome: pacienteNomeSelecionado,\n        cpf: pacienteCpfSelecionado,\n        email: paciente.email || undefined,\n        dataNascimento: pacienteNascimentoSelecionado,\n        atendimentoParaTerceiro: para === 'outra-pessoa',\n      });\n      if (!data.ok || !data.beta || !data.atendimentoId) {\n        throw new Error('Não foi possível iniciar o atendimento beta.');\n      }\n      await iniciarTriagemAposPagamento(data.atendimentoId);\n    } catch (error) {\n      Alert.alert(\n        'Não foi possível iniciar a consulta',\n        error instanceof Error ? error.message : 'Tente novamente em instantes.',\n      );\n    } finally {\n      setIniciandoBeta(false);\n    }\n`;
  const legacyBetaBlock = betaBlock.replace(`const beta = digits(paciente.tel).slice(-11) === BETA_TEST_PHONE;`, `const beta = [BETA_TEST_PHONE, '98900000000'].includes(digits(paciente.tel).slice(-11));`);
  if (out.includes(betaBlock)) out = out.replace(betaBlock, `    mudarEtapa('pagamento', 1);\n    return;\n`);
  if (out.includes(legacyBetaBlock)) out = out.replace(legacyBetaBlock, `    mudarEtapa('pagamento', 1);\n    return;\n`);

  return out;
});

patch('src/components/PagamentoConsulta.tsx', (src) => {
  let out = src;

  const phoneMarker = `  const telefoneContato = useMemo(() => digits(pacienteLogado.tel), [pacienteLogado.tel]);\n`;
  if (!out.includes('const modoReview = telefoneContato ===')) {
    if (!out.includes(phoneMarker)) throw new Error('PagamentoConsulta phone marker not found');
    out = out.replace(phoneMarker, `${phoneMarker}  const modoReview = telefoneContato === '98991344646';\n`);
  }

  const leadMarker = `      <Text style={styles.lead}>Assim que o pagamento for confirmado, o app libera uma triagem rápida antes de entrar na fila médica.</Text>\n`;
  if (!out.includes('AMBIENTE DE REVISÃO')) {
    if (!out.includes(leadMarker)) throw new Error('PagamentoConsulta lead marker not found');
    out = out.replace(leadMarker, `${leadMarker}      {modoReview ? (\n        <View style={styles.patientCard}>\n          <Text style={styles.patientLabel}>AMBIENTE DE REVISÃO</Text>\n          <Text style={styles.patientHint}>PIX e cartão são demonstrativos. Nenhuma cobrança real será realizada.</Text>\n        </View>\n      ) : null}\n`);
  }

  const cardForm = `              <EfiCardForm\n                key={cartaoFormKey}\n                holderName={pacienteLogado.nome}\n                holderDocument={pagadorCpf}\n                disabled={bloqueado}\n                onToken={processarTokenCartao}\n                onError={(message) => Alert.alert('Cartão', message)}\n              />\n`;
  if (!out.includes('Usar cartão de teste')) {
    if (!out.includes(cardForm)) throw new Error('PagamentoConsulta card form marker not found');
    out = out.replace(cardForm, `              {modoReview ? (\n                <>\n                  <Text style={styles.methodText}>Para a revisão da App Store, use o cartão de teste abaixo. Nenhum dado real é necessário.</Text>\n                  <Pressable\n                    onPress={() => processarTokenCartao({\n                      paymentToken: 'APP_REVIEW_TEST_TOKEN',\n                      cardMask: '•••• 4242',\n                      holderName: pacienteLogado.nome || 'Apple Review Patient',\n                      holderDocument: pagadorCpf,\n                    })}\n                    disabled={bloqueado}\n                    style={[styles.primaryButton, bloqueado && { opacity: .65 }]}\n                  >\n                    {loading ? <ActivityIndicator color=\"#07100f\" /> : <Text style={styles.primaryButtonText}>Usar cartão de teste</Text>}\n                  </Pressable>\n                </>\n              ) : (\n${cardForm.replace(/^/gm, '                ')}              )}\n`);
  }

  const pixInstruction = `          <Text style={styles.pixInstruction}>Abra o app do seu banco e escaneie o QR Code ou copie o código abaixo.</Text>\n`;
  if (!out.includes('QR Code demonstrativo')) {
    if (!out.includes(pixInstruction)) throw new Error('PagamentoConsulta PIX marker not found');
    out = out.replace(pixInstruction, `${pixInstruction}          {modoReview ? <Text style={styles.safeText}>QR Code demonstrativo para App Review. A confirmação acontece automaticamente e não gera cobrança.</Text> : null}\n`);
  }

  return out;
});
