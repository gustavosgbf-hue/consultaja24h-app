import fs from 'node:fs';

const path = 'App.tsx';
let s = fs.readFileSync(path, 'utf8');

function replaceOnce(oldText, newText, label) {
  if (!s.includes(oldText)) throw new Error(`Anchor not found: ${label}`);
  s = s.replace(oldText, newText);
}

if (!s.includes("from 'react-native-svg'")) {
  replaceOnce(
    "import type { Agendamento, AtendimentoHistorico, DocumentoPaciente, Paciente } from './src/types';\n",
    "import type { Agendamento, AtendimentoHistorico, DocumentoPaciente, Paciente } from './src/types';\nimport Svg, { Path as SvgPath } from 'react-native-svg';\n",
    'svg import',
  );
}

if (!s.includes('historicoOrigem')) {
  replaceOnce(
    "  const [historicoSelecionado, setHistoricoSelecionado] = useState<AtendimentoHistorico | null>(null);\n",
    "  const [historicoSelecionado, setHistoricoSelecionado] = useState<AtendimentoHistorico | null>(null);\n  const [historicoOrigem, setHistoricoOrigem] = useState<'home' | 'documentos'>('home');\n",
    'history origin state',
  );
}

replaceOnce(
  "      if (item) { setHistoricoSelecionado(item); setTela('historico-chat'); }\n",
  "      if (item) { setHistoricoOrigem('documentos'); setHistoricoSelecionado(item); setTela('historico-chat'); }\n",
  'documents to chat',
);

replaceOnce(
  "        onVoltar={() => { setTela('home'); setHistoricoSelecionado(null); }}\n",
  "        onVoltar={() => { setTela(historicoOrigem === 'documentos' ? 'documentos' : 'home'); setHistoricoSelecionado(null); }}\n",
  'chat back target',
);

replaceOnce(
  "      onAbrirAtendimento={(item) => { setHistoricoSelecionado(item); setTela('historico-chat'); }}\n",
  "      onAbrirAtendimento={(item) => { setHistoricoOrigem('home'); setHistoricoSelecionado(item); setTela('historico-chat'); }}\n",
  'home to chat',
);

replaceOnce(
  '<View style={styles.docsIcon}><Text style={styles.docsIconText}>PDF</Text></View>',
  '<View style={styles.docsIcon}><DocumentIcon size={21} color="#78f25f" /></View>',
  'home document icon',
);

replaceOnce(
  '<View style={styles.documentPdf}><Text style={styles.documentPdfText}>PDF</Text></View>',
  '<View style={styles.documentPdf}><DocumentIcon size={24} color="#91b4a6" /></View>',
  'document list icon',
);

if (!s.includes('function DocumentIcon(')) {
  const marker = "function PageHeader({ title, onVoltar }: { title: string; onVoltar: () => void }) {\n";
  const component = `function DocumentIcon({ size = 22, color = '#78f25f' }: { size?: number; color?: string }) {\n  return (\n    <Svg width={size} height={size} viewBox=\"0 0 24 24\" fill=\"none\">\n      <SvgPath d=\"M6.75 2.75h7.1L18.25 7v14.25H6.75V2.75Z\" stroke={color} strokeWidth={1.65} strokeLinejoin=\"round\" />\n      <SvgPath d=\"M13.75 2.95V7.2h4.2\" stroke={color} strokeWidth={1.65} strokeLinejoin=\"round\" />\n      <SvgPath d=\"M9.25 11h6.5M9.25 14.25h6.5M9.25 17.5h4.4\" stroke={color} strokeWidth={1.55} strokeLinecap=\"round\" />\n    </Svg>\n  );\n}\n\n`;
  replaceOnce(marker, component + marker, 'document icon component');
}

fs.writeFileSync(path, s);
console.log('Documents polish applied successfully.');