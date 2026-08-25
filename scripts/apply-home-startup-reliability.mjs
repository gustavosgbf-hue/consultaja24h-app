import fs from 'node:fs';

const appPath = 'App.tsx';
const rootPath = 'src/AppRoot.tsx';

let app = fs.readFileSync(appPath, 'utf8');
let root = fs.readFileSync(rootPath, 'utf8');

const oldHome = `  async function carregarHome() {\n    setHomeLoading(true);\n    try {\n      const [me, agenda, history, docs, renewalData] = await Promise.all([\n        carregarPaciente(),\n        carregarAgendamentos(),\n        carregarHistoricoPaciente().catch(() => ({ ok: true, atendimentos: [] })),\n        carregarDocumentosPaciente().catch(() => ({ ok: true, documentos: [] })),\n        carregarRenovacoesPaciente().catch(() => ({ ok: true, renovacoes: [] })),\n      ]);\n      setPaciente(me.paciente);\n      setAgendamentos(agenda.agendamentos || []);\n      setHistorico(history.atendimentos || []);\n      setDocumentos(docs.documentos || []);\n      setRenovacoes(renewalData.renovacoes || []);\n    } finally {\n      setHomeLoading(false);\n    }\n  }`;

const newHome = `  async function carregarHome() {\n    setHomeLoading(true);\n    const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));\n    async function comRetry<T>(fn: () => Promise<T>, tentativas = 3): Promise<T | null> {\n      for (let i = 0; i < tentativas; i += 1) {\n        try {\n          return await fn();\n        } catch {\n          if (i < tentativas - 1) await esperar(450 * (i + 1));\n        }\n      }\n      return null;\n    }\n\n    try {\n      const me = await comRetry(carregarPaciente);\n      if (!me?.paciente) return;\n      setPaciente(me.paciente);\n\n      const [agenda, history, docs, renewalData] = await Promise.all([\n        comRetry(carregarAgendamentos),\n        comRetry(carregarHistoricoPaciente),\n        comRetry(carregarDocumentosPaciente),\n        comRetry(carregarRenovacoesPaciente),\n      ]);\n\n      if (agenda) setAgendamentos(agenda.agendamentos || []);\n      if (history) setHistorico(history.atendimentos || []);\n      if (docs) setDocumentos(docs.documentos || []);\n      if (renewalData) setRenovacoes(renewalData.renovacoes || []);\n    } finally {\n      setHomeLoading(false);\n    }\n  }`;

if (!app.includes(oldHome)) throw new Error('carregarHome target not found');
app = app.replace(oldHome, newHome);
fs.writeFileSync(appPath, app);

root = root.replace(
  `  ActivityIndicator,\n  Animated,`,
  `  ActivityIndicator,\n  Animated,\n  AppState,`,
);

const oldEffectStart = `    recuperar();\n    const timer = setInterval(recuperar, 3000);\n    return () => {\n      ativo = false;\n      clearInterval(timer);\n    };`;

const newEffectStart = `    recuperar();\n    const startup1 = setTimeout(recuperar, 500);\n    const startup2 = setTimeout(recuperar, 1400);\n    const timer = setInterval(recuperar, 3000);\n    const appStateSubscription = AppState.addEventListener('change', (state) => {\n      if (state === 'active') recuperar();\n    });\n    return () => {\n      ativo = false;\n      clearTimeout(startup1);\n      clearTimeout(startup2);\n      clearInterval(timer);\n      appStateSubscription.remove();\n    };`;

if (!root.includes(oldEffectStart)) throw new Error('AppRoot recovery target not found');
root = root.replace(oldEffectStart, newEffectStart);
fs.writeFileSync(rootPath, root);

console.log('Home startup reliability patch applied.');
