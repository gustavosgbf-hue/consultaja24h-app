import fs from 'fs';

function patch(path, transform) {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) {
    console.log(`[review-resume-fix] no changes needed in ${path}`);
    return;
  }
  fs.writeFileSync(path, after);
  console.log(`[review-resume-fix] updated ${path}`);
}

patch('App.tsx', (src) => {
  if (src.includes("const modoReviewFluxo = digits(paciente.tel).slice(-11) === '98991344646';")) return src;

  const oldBlock = `    try {\n      const existente = await carregarAtendimentoEmAndamento();\n      if (existente.atendimento) {\n        Alert.alert('Atendimento em andamento', 'Você já tem uma consulta em andamento. Continue o atendimento atual antes de iniciar outra.');\n        onVoltar();\n        return;\n      }\n    } catch {\n      // Se a checagem temporária falhar, o fluxo existente continua normalmente.\n    }\n`;

  if (!src.includes(oldBlock)) throw new Error('App.tsx review resume marker not found');

  const replacement = `    const modoReviewFluxo = digits(paciente.tel).slice(-11) === '98991344646';\n    if (!modoReviewFluxo) {\n      try {\n        const existente = await carregarAtendimentoEmAndamento();\n        if (existente.atendimento) {\n          Alert.alert('Atendimento em andamento', 'Você já tem uma consulta em andamento. Continue o atendimento atual antes de iniciar outra.');\n          onVoltar();\n          return;\n        }\n      } catch {\n        // Se a checagem temporária falhar, o fluxo existente continua normalmente.\n      }\n    }\n`;

  return src.replace(oldBlock, replacement);
});

patch('src/AppRoot.tsx', (src) => {
  let out = src;
  out = out.replace(
    `  const betaEmTriagem = atendimento?.etapa === 'triagem' && atendimento.pagamento_metodo === 'beta_test';`,
    `  const betaFluxoLocal = atendimento?.pagamento_metodo === 'beta_test' && (atendimento.etapa === 'pagamento' || atendimento.etapa === 'triagem');`,
  );
  out = out.replaceAll('betaEmTriagem', 'betaFluxoLocal');
  return out;
});
