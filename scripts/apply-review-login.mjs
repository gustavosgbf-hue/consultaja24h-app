import fs from 'fs';

function patch(path, transform) {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) {
    console.log(`[review-login] no changes needed in ${path}`);
    return;
  }
  fs.writeFileSync(path, after);
  console.log(`[review-login] updated ${path}`);
}

patch('src/api/client.ts', (src) => {
  if (src.includes('export async function loginPacienteComSenha')) return src;
  const marker = `export async function verificarOtpPaciente(challengeId: string, codigo: string) {\n  return postJson<VerificarOtpResponse>('/api/paciente/otp/verificar', {\n    challenge_id: challengeId,\n    codigo,\n  });\n}\n`;
  if (!src.includes(marker)) throw new Error('client.ts marker not found');
  return src.replace(marker, `${marker}\nexport async function loginPacienteComSenha(email: string, senha: string) {\n  return postJson<VerificarOtpResponse>('/api/paciente/login', { email, senha });\n}\n`);
});

patch('App.tsx', (src) => {
  let out = src;

  if (!out.includes('loginPacienteComSenha,')) {
    const importMarker = `  iniciarAtendimentoBeta,\n  solicitarOtpPaciente,\n`;
    if (!out.includes(importMarker)) throw new Error('App import marker not found');
    out = out.replace(importMarker, `  iniciarAtendimentoBeta,\n  loginPacienteComSenha,\n  solicitarOtpPaciente,\n`);
  }

  if (!out.includes("const [senhaRevisao, setSenhaRevisao]")) {
    const stateMarker = `  const [codigo, setCodigo] = useState('');\n`;
    if (!out.includes(stateMarker)) throw new Error('App state marker not found');
    out = out.replace(stateMarker, `${stateMarker}  const [usarEmailSenha, setUsarEmailSenha] = useState(false);\n  const [senhaRevisao, setSenhaRevisao] = useState('');\n`);
  }

  if (!out.includes('async function entrarComEmailSenha()')) {
    const fnMarker = `  async function continuarComTelefone() {\n`;
    if (!out.includes(fnMarker)) throw new Error('App function marker not found');
    const fn = `  async function entrarComEmailSenha() {\n    const emailLimpo = email.trim().toLowerCase();\n    if (!/^\\S+@\\S+\\.\\S+$/.test(emailLimpo) || senhaRevisao.length < 6) {\n      Alert.alert('Confira os dados', 'Digite um e-mail válido e a senha da conta.');\n      return;\n    }\n    setLoading(true);\n    try {\n      const data = await loginPacienteComSenha(emailLimpo, senhaRevisao);\n      if (!data.token || !data.paciente) throw new Error('Não foi possível concluir o acesso.');\n      await saveSessionToken(data.token);\n      setPaciente(data.paciente);\n      setTela('home');\n      await carregarHome();\n    } catch (error) {\n      Alert.alert('Não foi possível entrar', error instanceof Error ? error.message : 'Confira o e-mail e a senha.');\n    } finally {\n      setLoading(false);\n    }\n  }\n\n`;
    out = out.replace(fnMarker, `${fn}${fnMarker}`);
  }

  if (!out.includes('Entrar com e-mail e senha')) {
    const blockStart = `          {etapa === 'telefone' && (\n            <>\n              <View style={styles.card}>\n`;
    if (!out.includes(blockStart)) throw new Error('App login block marker not found');
    out = out.replace(blockStart, `          {etapa === 'telefone' && (\n            <>\n              {usarEmailSenha ? (\n                <View style={styles.card}>\n                  <Badge text=\"ACESSO ALTERNATIVO\" />\n                  <Text style={styles.cardTitle}>Entre com e-mail e senha</Text>\n                  <Text style={styles.cardSubtitle}>Use esta opção somente se você já recebeu credenciais de acesso.</Text>\n                  <Text style={styles.inputLabel}>E-mail</Text>\n                  <TextInput value={email} onChangeText={setEmail} placeholder=\"voce@email.com\" placeholderTextColor=\"#94a09c\" keyboardType=\"email-address\" autoCapitalize=\"none\" autoCorrect={false} autoComplete=\"email\" style={styles.input} />\n                  <Text style={styles.inputLabel}>Senha</Text>\n                  <TextInput value={senhaRevisao} onChangeText={setSenhaRevisao} placeholder=\"Sua senha\" placeholderTextColor=\"#94a09c\" secureTextEntry autoCapitalize=\"none\" autoCorrect={false} style={styles.input} />\n                  <PrimaryButton label=\"Entrar\" loading={loading} onPress={entrarComEmailSenha} />\n                  <Pressable onPress={() => setUsarEmailSenha(false)} style={styles.singleSecondary}><Text style={styles.secondaryActionText}>Entrar com celular</Text></Pressable>\n                </View>\n              ) : (\n              <View style={styles.card}>\n`);

    const closeMarker = `                <Text style={styles.privacyText}>Seu celular é usado para localizar o cadastro do paciente. Dados do pagador não são usados como identidade clínica.</Text>\n              </View>\n              <Text style={styles.helperText}>Primeiro acesso ao app? Confirmaremos seus dados antes de vincular seu histórico.</Text>\n            </>\n          )}\n`;
    if (!out.includes(closeMarker)) throw new Error('App login close marker not found');
    out = out.replace(closeMarker, `                <Text style={styles.privacyText}>Seu celular é usado para localizar o cadastro do paciente. Dados do pagador não são usados como identidade clínica.</Text>\n                <Pressable onPress={() => setUsarEmailSenha(true)} style={styles.singleSecondary}><Text style={styles.secondaryActionText}>Entrar com e-mail e senha</Text></Pressable>\n              </View>\n              )}\n              <Text style={styles.helperText}>Primeiro acesso ao app? Confirmaremos seus dados antes de vincular seu histórico.</Text>\n            </>\n          )}\n`);
  }

  return out;
});
