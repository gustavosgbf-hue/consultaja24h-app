import fs from 'fs';

function patch(path, transform) {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) {
    console.log(`[review-flow] no changes needed in ${path}`);
    return;
  }
  fs.writeFileSync(path, after);
  console.log(`[review-flow] updated ${path}`);
}

patch('App.tsx', (src) => {
  if (src.includes("const modoReviewFluxo = digits(paciente.tel).slice(-11) === '98991344646';")) return src;

  const oldBlock = `    try {\n      const existente = await carregarAtendimentoEmAndamento();\n      if (existente.atendimento) {\n        Alert.alert('Atendimento em andamento', 'Você já tem uma consulta em andamento. Continue o atendimento atual antes de iniciar outra.');\n        onVoltar();\n        return;\n      }\n    } catch {\n      // Se a checagem temporária falhar, o fluxo existente continua normalmente.\n    }\n`;

  if (!src.includes(oldBlock)) throw new Error('App.tsx review resume marker not found');

  return src.replace(oldBlock, `    const modoReviewFluxo = digits(paciente.tel).slice(-11) === '98991344646';\n    if (!modoReviewFluxo) {\n      try {\n        const existente = await carregarAtendimentoEmAndamento();\n        if (existente.atendimento) {\n          Alert.alert('Atendimento em andamento', 'Você já tem uma consulta em andamento. Continue o atendimento atual antes de iniciar outra.');\n          onVoltar();\n          return;\n        }\n      } catch {\n        // Se a checagem temporária falhar, o fluxo existente continua normalmente.\n      }\n    }\n`);
});

patch('src/AppRoot.tsx', (src) => {
  let out = src;

  out = out.replace(
    `  const betaEmTriagem = atendimento?.etapa === 'triagem' && atendimento.pagamento_metodo === 'beta_test';`,
    `  const betaEmFluxoLocal = atendimento?.pagamento_metodo === 'beta_test' &&\n    (atendimento.etapa === 'pagamento' || atendimento.etapa === 'triagem');`,
  );
  out = out.replace(
    `  const betaFluxoLocal = atendimento?.pagamento_metodo === 'beta_test' && (atendimento.etapa === 'pagamento' || atendimento.etapa === 'triagem');`,
    `  const betaEmFluxoLocal = atendimento?.pagamento_metodo === 'beta_test' &&\n    (atendimento.etapa === 'pagamento' || atendimento.etapa === 'triagem');`,
  );
  out = out.replace(/betaEmTriagem/g, 'betaEmFluxoLocal');
  out = out.replace(/betaFluxoLocal/g, 'betaEmFluxoLocal');
  return out;
});

patch('src/components/PagamentoConsulta.tsx', (src) => {
  let out = src;
  out = out.replace('Para a revisão da App Store, use o cartão de teste abaixo. Nenhum dado real é necessário.', 'Para a revisão da loja, use o cartão de teste abaixo. Nenhum dado real é necessário.');
  out = out.replace("holderName: pacienteLogado.nome || 'Apple Review Patient'", "holderName: pacienteLogado.nome || 'App Review Patient'");
  out = out.replace('QR Code demonstrativo para App Review. A confirmação acontece automaticamente e não gera cobrança.', 'QR Code demonstrativo para revisão. A confirmação acontece automaticamente e não gera cobrança.');
  return out;
});
