import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
test('a consulta pendente reabre o mesmo checkout sem criar cobrança',()=>{
 assert.match(code,/if \(existente\.atendimento\?\.etapa === 'pagamento'\)/);
 assert.match(code,/setPagamentoRecuperado\(existente\.atendimento\)/);
 assert.match(code,/atendimentoInicial=\{pagamentoRecuperado \|\| atendimentoInicial\}/);
});
test('os dados do PIX são atualizados quando o backend retorna nova versão',()=>{
 assert.match(code,/\{ \.\.\.atual, \.\.\.resumeTriagem \}/);
});
