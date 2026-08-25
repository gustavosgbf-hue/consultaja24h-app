import fs from 'node:fs';

const path = 'App.tsx';
let s = fs.readFileSync(path, 'utf8');

if (!s.includes('completarPerfilPaciente,')) {
  s = s.replace('  carregarPaciente,\n', '  carregarPaciente,\n  completarPerfilPaciente,\n');
}

if (!s.includes('function formatarNascimentoInput(')) {
  const marker = 'function formatarCpf(valor: string) {';
  const helper = `function formatarNascimentoInput(valor: string) {\n  const n = digits(valor).slice(0, 8);\n  if (n.length <= 2) return n;\n  if (n.length <= 4) return n.slice(0, 2) + '/' + n.slice(2);\n  return n.slice(0, 2) + '/' + n.slice(2, 4) + '/' + n.slice(4);\n}\n\nfunction nascimentoValido(valor: string) {\n  const m = String(valor || '').trim().match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})$/);\n  if (!m) return false;\n  const dia = Number(m[1]), mes = Number(m[2]), ano = Number(m[3]);\n  const d = new Date(Date.UTC(ano, mes - 1, dia));\n  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia && d.getTime() <= Date.now();\n}\n\n`;
  if (!s.includes(marker)) throw new Error('formatarCpf marker not found');
  s = s.replace(marker, helper + marker);
}

s = s.replace(
  "return <NovaConsulta paciente={paciente} onVoltar={() => setTela('home')} />;",
  "return <NovaConsulta paciente={paciente} onVoltar={() => setTela('home')} onPerfilAtualizado={setPaciente} />;"
);

s = s.replace(
  'function NovaConsulta({ paciente, onVoltar }: { paciente: Paciente; onVoltar: () => void }) {',
  'function NovaConsulta({ paciente, onVoltar, onPerfilAtualizado }: { paciente: Paciente; onVoltar: () => void; onPerfilAtualizado: (paciente: Paciente) => void }) {'
);

if (!s.includes('const [nomeProprio, setNomeProprio]')) {
  s = s.replace(
    "  const [nascimentoOutro, setNascimentoOutro] = useState('');",
    `  const [nascimentoOutro, setNascimentoOutro] = useState('');\n  const [nomeProprio, setNomeProprio] = useState(() => {\n    const atual = String(paciente.nome || '').trim();\n    return /^(paciente|paciente whatsapp|-)$/i.test(atual) ? '' : atual;\n  });\n  const [nascimentoProprio, setNascimentoProprio] = useState(() => {\n    const atual = String(paciente.data_nascimento || '').trim();\n    const iso = atual.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);\n    return iso ? iso[3] + '/' + iso[2] + '/' + iso[1] : atual;\n  });\n  const [salvandoPerfil, setSalvandoPerfil] = useState(false);`
  );
}

const oldSelected = "  const pacienteNomeSelecionado = para === 'outra-pessoa' ? nomeOutro.trim() : paciente.nome;\n  const pacienteCpfSelecionado = para === 'outra-pessoa' ? digits(cpfOutro) : digits(paciente.cpf);\n  const pacienteNascimentoSelecionado = para === 'outra-pessoa' ? nascimentoOutro.trim() : undefined;\n  const telefoneContato = digits(paciente.tel);";
const newSelected = "  const nomeCadastro = String(paciente.nome || '').trim();\n  const perfilIncompleto = !nomeCadastro || /^(paciente|paciente whatsapp|-)$/i.test(nomeCadastro) || !String(paciente.data_nascimento || '').trim();\n  const pacienteNomeSelecionado = para === 'outra-pessoa' ? nomeOutro.trim() : (perfilIncompleto ? nomeProprio.trim() : paciente.nome);\n  const pacienteCpfSelecionado = para === 'outra-pessoa' ? digits(cpfOutro) : digits(paciente.cpf);\n  const pacienteNascimentoSelecionado = para === 'outra-pessoa' ? nascimentoOutro.trim() : (perfilIncompleto ? nascimentoProprio.trim() : (paciente.data_nascimento || undefined));\n  const telefoneContato = digits(paciente.tel);";
if (s.includes(oldSelected)) s = s.replace(oldSelected, newSelected);

const oldValidation = "    } else if (digits(paciente.cpf).length !== 11) {\n      Alert.alert('CPF não encontrado', 'Seu cadastro precisa ter um CPF válido antes de iniciar a consulta.');\n      return false;\n    }\n    if (queixa.trim().length < 5) {";
const newValidation = "    } else {\n      if (digits(paciente.cpf).length !== 11) {\n        Alert.alert('CPF não encontrado', 'Seu cadastro precisa ter um CPF válido antes de iniciar a consulta.');\n        return false;\n      }\n      if (perfilIncompleto && nomeProprio.trim().split(/\\s+/).filter(Boolean).length < 2) {\n        Alert.alert('Confira o nome', 'Informe seu nome completo.');\n        return false;\n      }\n      if (perfilIncompleto && !nascimentoValido(nascimentoProprio)) {\n        Alert.alert('Confira a data', 'Informe sua data de nascimento no formato DD/MM/AAAA.');\n        return false;\n      }\n    }\n    if (queixa.trim().length < 5) {";
if (s.includes(oldValidation)) s = s.replace(oldValidation, newValidation);

const oldStart = "  async function irParaPagamento() {\n    if (!validarDados() || iniciandoBeta) return;\n\n    const beta = digits(paciente.tel).slice(-11) === BETA_TEST_PHONE;";
const newStart = "  async function irParaPagamento() {\n    if (!validarDados() || iniciandoBeta || salvandoPerfil) return;\n\n    if (para === 'mim' && perfilIncompleto) {\n      setSalvandoPerfil(true);\n      try {\n        const salvo = await completarPerfilPaciente(nomeProprio.trim(), nascimentoProprio.trim());\n        if (!salvo?.paciente) throw new Error('Não foi possível atualizar o cadastro.');\n        onPerfilAtualizado(salvo.paciente);\n      } catch (error) {\n        Alert.alert('Não foi possível salvar seus dados', error instanceof Error ? error.message : 'Tente novamente em instantes.');\n        return;\n      } finally {\n        setSalvandoPerfil(false);\n      }\n    }\n\n    const beta = digits(paciente.tel).slice(-11) === BETA_TEST_PHONE;";
if (s.includes(oldStart)) s = s.replace(oldStart, newStart);

const oldCard = `              {para === 'mim' ? (\n                <View style={styles.identityCard}>\n                  <Text style={styles.identityKicker}>PACIENTE</Text>\n                  <Text style={styles.identityName}>{paciente.nome}</Text>\n                  <Text style={styles.identityMeta}>{mascararCpf(paciente.cpf)} · {mascararTelefone(paciente.tel)}</Text>\n                </View>\n              ) : (`;
const newCard = `              {para === 'mim' ? (\n                perfilIncompleto ? (\n                  <View style={styles.formCard}>\n                    <Text style={styles.inputLabelDark}>Nome completo</Text>\n                    <TextInput value={nomeProprio} onChangeText={setNomeProprio} placeholder="Nome e sobrenome" placeholderTextColor="#66736e" style={styles.darkInput} autoCapitalize="words" />\n                    <Text style={styles.inputLabelDark}>Data de nascimento</Text>\n                    <TextInput value={nascimentoProprio} onChangeText={(v) => setNascimentoProprio(formatarNascimentoInput(v))} placeholder="DD/MM/AAAA" placeholderTextColor="#66736e" style={styles.darkInput} keyboardType="number-pad" maxLength={10} />\n                    <Text style={styles.identityMeta}>CPF {mascararCpf(paciente.cpf)}</Text>\n                  </View>\n                ) : (\n                  <View style={styles.identityCard}>\n                    <Text style={styles.identityKicker}>PACIENTE</Text>\n                    <Text style={styles.identityName}>{paciente.nome}</Text>\n                    <Text style={styles.identityMeta}>{mascararCpf(paciente.cpf)} · {mascararTelefone(paciente.tel)}</Text>\n                  </View>\n                )\n              ) : (`;
if (s.includes(oldCard)) s = s.replace(oldCard, newCard);

s = s.replace(
  '<TextInput value={nascimentoOutro} onChangeText={setNascimentoOutro} placeholder="DD/MM/AAAA" placeholderTextColor="#66736e" style={styles.darkInput} keyboardType="numbers-and-punctuation" maxLength={10} />',
  '<TextInput value={nascimentoOutro} onChangeText={(v) => setNascimentoOutro(formatarNascimentoInput(v))} placeholder="DD/MM/AAAA" placeholderTextColor="#66736e" style={styles.darkInput} keyboardType="number-pad" maxLength={10} />'
);

s = s.replace(
  '              <PrimaryButton label="Continuar para pagamento" loading={iniciandoBeta} onPress={irParaPagamento} />',
  '              <PrimaryButton label="Continuar para pagamento" loading={iniciandoBeta || salvandoPerfil} onPress={irParaPagamento} />'
);

const flow = `              <View style={styles.flowPreview}>\n                <Text style={styles.flowPreviewTitle}>Como funciona</Text>\n                <View style={styles.flowCompact}>\n                  <FlowChip number="1" title="Pagamento" />\n                  <FlowChip number="2" title="Triagem" />\n                  <FlowChip number="3" title="Chat" />\n                </View>\n              </View>\n`;
s = s.replace(flow, '');

fs.writeFileSync(path, s);
console.log('First consultation profile completion applied.');
