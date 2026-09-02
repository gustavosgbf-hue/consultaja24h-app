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

patch('src/AppRoot.tsx', (src) => {
  let out = src;

  out = out.replace(
    `  const betaEmTriagem = atendimento?.etapa === 'triagem' && atendimento.pagamento_metodo === 'beta_test';`,
    `  // Durante pagamento/triagem do ambiente de review, o fluxo local da NovaConsulta\n  // precisa permanecer montado. Caso o AppRoot intercepte a consulta nessa fase,\n  // ele desmonta PagamentoConsulta e o polling de confirmação, deixando o usuário\n  // preso em \"Pagamento pendente\". Só assumimos a navegação global quando o\n  // sandbox chegar ao chat.\n  const betaEmFluxoLocal = atendimento?.pagamento_metodo === 'beta_test' &&\n    (atendimento.etapa === 'pagamento' || atendimento.etapa === 'triagem');`,
  );

  out = out.replace(/!betaEmTriagem/g, '!betaEmFluxoLocal');
  return out;
});

patch('src/components/PagamentoConsulta.tsx', (src) => {
  let out = src;
  out = out.replace('Para a revisão da App Store, use o cartão de teste abaixo. Nenhum dado real é necessário.', 'Para a revisão da loja, use o cartão de teste abaixo. Nenhum dado real é necessário.');
  out = out.replace("holderName: pacienteLogado.nome || 'Apple Review Patient'", "holderName: pacienteLogado.nome || 'App Review Patient'");
  out = out.replace('QR Code demonstrativo para App Review. A confirmação acontece automaticamente e não gera cobrança.', 'QR Code demonstrativo para revisão. A confirmação acontece automaticamente e não gera cobrança.');
  return out;
});
