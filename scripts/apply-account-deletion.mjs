import fs from 'node:fs';

const appPath = 'App.tsx';
const clientPath = 'src/api/client.ts';

let client = fs.readFileSync(clientPath, 'utf8');
if (!client.includes('export async function solicitarExclusaoConta()')) {
  client += `\n\nexport async function solicitarExclusaoConta() {\n  return postJson<{ ok: boolean; message?: string }>(\n    '/api/paciente/exclusao-conta',\n    {},\n    true,\n  );\n}\n`;
  fs.writeFileSync(clientPath, client);
}

let src = fs.readFileSync(appPath, 'utf8');
const importAnchor = '  solicitarOtpPaciente,\n';
if (!src.includes('  solicitarExclusaoConta,\n')) {
  if (!src.includes(importAnchor)) throw new Error('API import anchor not found');
  src = src.replace(importAnchor, `  solicitarExclusaoConta,\n${importAnchor}`);
}

const perfilStart = src.indexOf('function Perfil(');
const perfilEnd = src.indexOf('\nfunction NovaConsulta(', perfilStart);
if (perfilStart < 0 || perfilEnd < 0) throw new Error('Perfil block not found');
let perfil = src.slice(perfilStart, perfilEnd);

const motionAnchor = '  const motion = usePageSlide(onVoltar);\n';
if (!perfil.includes('const [excluindoConta, setExcluindoConta]')) {
  if (!perfil.includes(motionAnchor)) throw new Error('Perfil motion anchor not found');
  const helper = `  const [excluindoConta, setExcluindoConta] = useState(false);\n\n  function confirmarExclusaoConta() {\n    if (excluindoConta) return;\n    Alert.alert(\n      'Excluir minha conta',\n      'Ao confirmar, sua solicitação de exclusão será registrada. Alguns dados médicos e documentos podem precisar ser preservados pelo prazo legal aplicável.',\n      [\n        { text: 'Cancelar', style: 'cancel' },\n        {\n          text: 'Solicitar exclusão',\n          style: 'destructive',\n          onPress: async () => {\n            setExcluindoConta(true);\n            try {\n              await solicitarExclusaoConta();\n              Alert.alert(\n                'Solicitação registrada',\n                'Recebemos seu pedido de exclusão da conta. Dados sujeitos a obrigação legal de guarda poderão ser preservados pelo prazo aplicável.',\n                [{ text: 'OK', onPress: onSair }],\n              );\n            } catch (error) {\n              Alert.alert('Não foi possível solicitar a exclusão', error instanceof Error ? error.message : 'Tente novamente em alguns instantes.');\n            } finally {\n              setExcluindoConta(false);\n            }\n          },\n        },\n      ],\n    );\n  }\n`;
  perfil = perfil.replace(motionAnchor, motionAnchor + helper);
}

const logoutAnchor = `        <Pressable onPress={onSair} style={styles.logoutButton}><Text style={styles.logoutButtonText}>Sair da conta</Text></Pressable>`;
if (!perfil.includes('Excluir minha conta</Text>')) {
  if (!perfil.includes(logoutAnchor)) throw new Error('Logout anchor not found');
  const deletionButton = `        <Pressable\n          onPress={confirmarExclusaoConta}\n          disabled={excluindoConta}\n          style={[styles.logoutButton, { marginTop: 10, borderColor: 'rgba(239,68,68,.28)' }, excluindoConta && { opacity: 0.55 }]}\n          accessibilityRole="button"\n          accessibilityLabel="Excluir minha conta"\n        >\n          <Text style={[styles.logoutButtonText, { color: '#f87171' }]}>{excluindoConta ? 'Enviando solicitação...' : 'Excluir minha conta'}</Text>\n        </Pressable>\n\n${logoutAnchor}`;
  perfil = perfil.replace(logoutAnchor, deletionButton);
}

src = src.slice(0, perfilStart) + perfil + src.slice(perfilEnd);
fs.writeFileSync(appPath, src);
console.log('Account deletion request flow applied');
