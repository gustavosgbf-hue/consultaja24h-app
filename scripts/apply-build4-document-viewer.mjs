import fs from 'node:fs';

const path = 'App.tsx';
let s = fs.readFileSync(path, 'utf8');

function once(from, to, label) {
  if (!s.includes(from)) throw new Error(`Anchor not found: ${label}`);
  s = s.replace(from, to);
}

if (!s.includes("import DocumentViewer from './src/components/DocumentViewer';")) {
  once(
    "import ThemeToggle from './src/components/ThemeToggle';",
    "import ThemeToggle from './src/components/ThemeToggle';\nimport DocumentViewer from './src/components/DocumentViewer';",
    'DocumentViewer import',
  );
}

if (!s.includes('const [docAberto, setDocAberto] = useState<DocumentoPaciente | null>(null);')) {
  once(
    `function DocumentosPaciente({ documentos, onVoltar, onAbrirConsulta }: {\n  documentos: DocumentoPaciente[];\n  onVoltar: () => void;\n  onAbrirConsulta: (atendimentoId: number) => void;\n}) {\n  return (`,
    `function DocumentosPaciente({ documentos, onVoltar, onAbrirConsulta }: {\n  documentos: DocumentoPaciente[];\n  onVoltar: () => void;\n  onAbrirConsulta: (atendimentoId: number) => void;\n}) {\n  const [docAberto, setDocAberto] = useState<DocumentoPaciente | null>(null);\n\n  return (`,
    'documents viewer state',
  );
}

s = s.replace(
  '            <Pressable onPress={() => abrirLink(doc.arquivo_url)} style={styles.documentMain}>',
  '            <Pressable onPress={() => setDocAberto(doc)} style={styles.documentMain}>',
);

if (!s.includes('visible={!!docAberto}')) {
  once(
    `      </ScrollView>\n    </SafeAreaView>\n  );\n}\n\nfunction Perfil`,
    `      </ScrollView>\n      <DocumentViewer\n        visible={!!docAberto}\n        url={docAberto?.arquivo_url}\n        name={docAberto?.arquivo_nome}\n        type="pdf"\n        onClose={() => setDocAberto(null)}\n      />\n    </SafeAreaView>\n  );\n}\n\nfunction Perfil`,
    'documents viewer component',
  );
}

fs.writeFileSync(path, s);
console.log('Build 4 document viewer applied.');
