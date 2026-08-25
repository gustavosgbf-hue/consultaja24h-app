import fs from 'node:fs';

const path = 'App.tsx';
let s = fs.readFileSync(path, 'utf8');

function replaceOnce(oldText, newText, label) {
  if (!s.includes(oldText)) throw new Error(`Anchor not found: ${label}`);
  s = s.replace(oldText, newText);
}

// Psychology becomes a first-class Home destination.
replaceOnce(
  `      onRenovacao={() => { setWebPage({ title: 'Renovar receita', url: URL_RENOVACAO }); setTela('web'); }}\n      onEspecialistas={() => setTela('servicos')}\n      onAbrirAtendimento=`,
  `      onRenovacao={() => { setWebPage({ title: 'Renovar receita', url: URL_RENOVACAO }); setTela('web'); }}\n      onEspecialistas={() => setTela('servicos')}\n      onPsicologia={() => { setWebPage({ title: 'Psicologia', url: 'https://consultaja24h.com.br/psicologo-online' }); setTela('web'); }}\n      onAbrirAtendimento=`,
  'Home psychology handler',
);

replaceOnce(
  `function PacienteHome({ paciente, agendamentos, historico, documentos, loading, mostrarTudo, onMostrarTudo, onAtualizar, onPerfil, onNovaConsulta, onDocumentos, onRenovacao, onEspecialistas, onAbrirAtendimento }: {`,
  `function PacienteHome({ paciente, agendamentos, historico, documentos, loading, mostrarTudo, onMostrarTudo, onAtualizar, onPerfil, onNovaConsulta, onDocumentos, onRenovacao, onEspecialistas, onPsicologia, onAbrirAtendimento }: {`,
  'PacienteHome psychology prop signature',
);
replaceOnce(
  `  onRenovacao: () => void;\n  onEspecialistas: () => void;\n  onAbrirAtendimento:`,
  `  onRenovacao: () => void;\n  onEspecialistas: () => void;\n  onPsicologia: () => void;\n  onAbrirAtendimento:`,
  'PacienteHome psychology prop type',
);
replaceOnce(
  `        <View style={styles.quickGrid}>\n          <QuickCard title="Renovar receita" subtitle="Solicite pelo app" onPress={onRenovacao} featured />\n          <QuickCard title="Especialistas" subtitle="Escolha o profissional" onPress={onEspecialistas} />\n        </View>`,
  `        <View style={styles.quickGrid}>\n          <QuickCard title="Renovar receita" subtitle="Solicite pelo app" onPress={onRenovacao} featured />\n          <QuickCard title="Especialistas" subtitle="Escolha o profissional" onPress={onEspecialistas} />\n        </View>\n        <Pressable onPress={onPsicologia} style={({ pressed }) => [styles.psychologyHomeCard, pressed && styles.quickCardPressed]}>\n          <View style={styles.psychologyHomeBadge}><Text style={styles.psychologyHomeBadgeText}>PSI</Text></View>\n          <View style={{ flex: 1 }}>\n            <Text style={styles.psychologyHomeTitle}>Psicologia</Text>\n            <Text style={styles.psychologyHomeText}>Psicoterapia online com horário marcado</Text>\n          </View>\n        </Pressable>`,
  'Psychology Home card',
);

// Web destinations launched directly from Home return directly to Home.
replaceOnce(
  `onVoltar={() => { setWebPage(null); setTela(webPage.title === 'Renovar receita' ? 'home' : 'servicos'); }}`,
  `onVoltar={() => { const voltarHome = webPage.title === 'Renovar receita' || webPage.title === 'Psicologia'; setWebPage(null); setTela(voltarHome ? 'home' : 'servicos'); }}`,
  'Internal web back destination',
);

// Specialists is a medical-specialty screen only, with a more intentional card hierarchy.
replaceOnce(
  `  const servicos = [\n    { title: 'Psiquiatria', text: 'Consulta médica especializada', url: 'https://consultaja24h.com.br/especialistas/psiquiatria' },\n    { title: 'Dermatologia', text: 'Avaliação dermatológica online', url: 'https://consultaja24h.com.br/especialistas/dermatologia' },\n    { title: 'Endocrinologia', text: 'Acompanhamento endocrinológico', url: 'https://consultaja24h.com.br/especialistas/endocrinologia' },\n    { title: 'Psicologia', text: 'Psicoterapia online com horário marcado', url: 'https://consultaja24h.com.br/psicologo-online' },\n  ];`,
  `  const servicos = [\n    { title: 'Psiquiatria', text: 'Saúde mental e acompanhamento médico', code: '01', url: 'https://consultaja24h.com.br/especialistas/psiquiatria' },\n    { title: 'Dermatologia', text: 'Avaliação de pele, cabelos e unhas', code: '02', url: 'https://consultaja24h.com.br/especialistas/dermatologia' },\n    { title: 'Endocrinologia', text: 'Hormônios, metabolismo e acompanhamento', code: '03', url: 'https://consultaja24h.com.br/especialistas/endocrinologia' },\n  ];`,
  'Medical specialists only',
);
replaceOnce(
  `<Text style={styles.pageLead}>Escolha a área e veja profissionais, valores e horários disponíveis.</Text>\n          <View style={styles.serviceList}>\n            {servicos.map((item) => (\n              <Pressable key={item.title} onPress={() => onAbrir(item.title, item.url)} style={({ pressed }) => [styles.serviceCard, pressed && styles.quickCardPressed]}>\n                <View style={styles.serviceDot} />\n                <View style={{ flex: 1 }}>\n                  <Text style={styles.serviceTitle}>{item.title}</Text>\n                  <Text style={styles.serviceText}>{item.text}</Text>\n                </View>\n              </Pressable>\n            ))}\n          </View>`,
  `<Text style={styles.pageLead}>Escolha a especialidade para ver profissionais, valores e horários.</Text>\n          <View style={styles.serviceList}>\n            {servicos.map((item) => (\n              <Pressable key={item.title} onPress={() => onAbrir(item.title, item.url)} style={({ pressed }) => [styles.serviceCard, pressed && styles.quickCardPressed]}>\n                <View style={styles.serviceCardTop}>\n                  <Text style={styles.serviceCode}>{item.code}</Text>\n                  <View style={styles.serviceStatus}><View style={styles.serviceStatusDot} /><Text style={styles.serviceStatusText}>ONLINE</Text></View>\n                </View>\n                <Text style={styles.serviceTitle}>{item.title}</Text>\n                <Text style={styles.serviceText}>{item.text}</Text>\n                <Text style={styles.serviceAction}>Ver profissionais</Text>\n              </Pressable>\n            ))}\n          </View>`,
  'Specialists premium cards',
);

// Compact first consultation step and keep the payment CTA always visible.
const dataStageOld = `  return (\n    <Animated.View style={motion.style}>\n    <SafeAreaView style={styles.safe}>\n      <ScrollView contentContainerStyle={styles.pageWrap} keyboardShouldPersistTaps="handled">\n        <PageHeader title="Nova consulta" onVoltar={voltarEtapa} />\n        <ConsultaProgress current="dados" />\n        <Animated.View style={stageStyle}>\n        <Text style={styles.pageLead}>Vamos começar identificando quem será atendido.</Text>\n\n        <View style={styles.choiceRow}>\n          <ChoiceCard active={para === 'mim'} title="Para mim" subtitle={paciente.nome?.split(' ')[0] || 'Paciente'} onPress={() => setPara('mim')} />\n          <ChoiceCard active={para === 'outra-pessoa'} title="Outra pessoa" subtitle="Filho, familiar etc." onPress={() => setPara('outra-pessoa')} />\n        </View>\n\n        {para === 'mim' ? (\n          <View style={styles.identityCard}>\n            <Text style={styles.identityKicker}>PACIENTE</Text>\n            <Text style={styles.identityName}>{paciente.nome}</Text>\n            <Text style={styles.identityMeta}>{mascararCpf(paciente.cpf)} · {mascararTelefone(paciente.tel)}</Text>\n          </View>\n        ) : (\n          <View style={styles.formCard}>\n            <Text style={styles.inputLabelDark}>Nome completo do paciente</Text>\n            <TextInput value={nomeOutro} onChangeText={setNomeOutro} placeholder="Nome e sobrenome" placeholderTextColor="#66736e" style={styles.darkInput} autoCapitalize="words" />\n            <Text style={styles.inputLabelDark}>CPF</Text>\n            <TextInput value={cpfOutro} onChangeText={(v) => setCpfOutro(formatarCpf(v))} placeholder="000.000.000-00" placeholderTextColor="#66736e" style={styles.darkInput} keyboardType="number-pad" maxLength={14} />\n            <Text style={styles.inputLabelDark}>Data de nascimento</Text>\n            <TextInput value={nascimentoOutro} onChangeText={setNascimentoOutro} placeholder="DD/MM/AAAA" placeholderTextColor="#66736e" style={styles.darkInput} keyboardType="numbers-and-punctuation" maxLength={10} />\n          </View>\n        )}\n\n        <Text style={styles.formSectionTitle}>O que está acontecendo?</Text>\n        <TextInput\n          value={queixa}\n          onChangeText={setQueixa}\n          placeholder="Ex.: dor de garganta, febre desde ontem, dor abdominal..."\n          placeholderTextColor="#66736e"\n          style={[styles.darkInput, styles.textArea]}\n          multiline\n          textAlignVertical="top"\n          maxLength={1200}\n        />\n        <Text style={styles.counter}>{queixa.length}/1200</Text>\n\n        <View style={styles.flowPreview}>\n          <Text style={styles.flowPreviewTitle}>Como vai funcionar</Text>\n          <FlowRow number="1" title="Pagamento" text="Finalize por PIX ou cartão." />\n          <FlowRow number="2" title="Triagem rápida" text="Perguntas objetivas depois da confirmação do pagamento." />\n          <FlowRow number="3" title="Chat com o médico" text="Atendimento por mensagem pelo próprio app." last />\n        </View>\n\n        <PrimaryButton label="Continuar para pagamento" loading={iniciandoBeta} onPress={irParaPagamento} />\n        </Animated.View>\n      </ScrollView>\n    </SafeAreaView>\n    </Animated.View>\n  );`;

const dataStageNew = `  return (\n    <Animated.View style={motion.style}>\n      <SafeAreaView style={styles.safe}>\n        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>\n          <Animated.View style={[{ flex: 1 }, stageStyle]}>\n            <ScrollView\n              style={{ flex: 1 }}\n              contentContainerStyle={styles.consultDataScroll}\n              keyboardShouldPersistTaps="handled"\n              showsVerticalScrollIndicator={false}\n            >\n              <PageHeader title="Nova consulta" onVoltar={voltarEtapa} />\n              <ConsultaProgress current="dados" />\n              <Text style={styles.consultIntro}>Quem será atendido?</Text>\n\n              <View style={styles.choiceRow}>\n                <ChoiceCard active={para === 'mim'} title="Para mim" subtitle={paciente.nome?.split(' ')[0] || 'Paciente'} onPress={() => setPara('mim')} />\n                <ChoiceCard active={para === 'outra-pessoa'} title="Outra pessoa" subtitle="Filho ou familiar" onPress={() => setPara('outra-pessoa')} />\n              </View>\n\n              {para === 'mim' ? (\n                <View style={styles.identityCard}>\n                  <Text style={styles.identityKicker}>PACIENTE</Text>\n                  <Text style={styles.identityName}>{paciente.nome}</Text>\n                  <Text style={styles.identityMeta}>{mascararCpf(paciente.cpf)} · {mascararTelefone(paciente.tel)}</Text>\n                </View>\n              ) : (\n                <View style={styles.formCard}>\n                  <Text style={styles.inputLabelDark}>Nome completo do paciente</Text>\n                  <TextInput value={nomeOutro} onChangeText={setNomeOutro} placeholder="Nome e sobrenome" placeholderTextColor="#66736e" style={styles.darkInput} autoCapitalize="words" />\n                  <Text style={styles.inputLabelDark}>CPF</Text>\n                  <TextInput value={cpfOutro} onChangeText={(v) => setCpfOutro(formatarCpf(v))} placeholder="000.000.000-00" placeholderTextColor="#66736e" style={styles.darkInput} keyboardType="number-pad" maxLength={14} />\n                  <Text style={styles.inputLabelDark}>Data de nascimento</Text>\n                  <TextInput value={nascimentoOutro} onChangeText={setNascimentoOutro} placeholder="DD/MM/AAAA" placeholderTextColor="#66736e" style={styles.darkInput} keyboardType="numbers-and-punctuation" maxLength={10} />\n                </View>\n              )}\n\n              <Text style={styles.formSectionTitle}>O que está acontecendo?</Text>\n              <TextInput\n                value={queixa}\n                onChangeText={setQueixa}\n                placeholder="Ex.: dor de garganta, febre desde ontem..."\n                placeholderTextColor="#66736e"\n                style={[styles.darkInput, styles.textArea]}\n                multiline\n                textAlignVertical="top"\n                maxLength={1200}\n              />\n              <Text style={styles.counter}>{queixa.length}/1200</Text>\n\n              <View style={styles.flowPreview}>\n                <Text style={styles.flowPreviewTitle}>Como funciona</Text>\n                <View style={styles.flowCompact}>\n                  <FlowChip number="1" title="Pagamento" />\n                  <FlowChip number="2" title="Triagem" />\n                  <FlowChip number="3" title="Chat" />\n                </View>\n              </View>\n            </ScrollView>\n\n            <View style={styles.stickyCta}>\n              <PrimaryButton label="Continuar para pagamento" loading={iniciandoBeta} onPress={irParaPagamento} />\n            </View>\n          </Animated.View>\n        </KeyboardAvoidingView>\n      </SafeAreaView>\n    </Animated.View>\n  );`;
replaceOnce(dataStageOld, dataStageNew, 'Compact consultation first stage');

replaceOnce(
  `function FlowRow({ number, title, text, last }: { number: string; title: string; text: string; last?: boolean }) {\n  return <View style={[styles.flowRow, last && { borderBottomWidth: 0, paddingBottom: 0 }]}><View style={styles.flowNumber}><Text style={styles.flowNumberText}>{number}</Text></View><View style={{ flex: 1 }}><Text style={styles.flowTitle}>{title}</Text><Text style={styles.flowText}>{text}</Text></View></View>;\n}\n`,
  `function FlowRow({ number, title, text, last }: { number: string; title: string; text: string; last?: boolean }) {\n  return <View style={[styles.flowRow, last && { borderBottomWidth: 0, paddingBottom: 0 }]}><View style={styles.flowNumber}><Text style={styles.flowNumberText}>{number}</Text></View><View style={{ flex: 1 }}><Text style={styles.flowTitle}>{title}</Text><Text style={styles.flowText}>{text}</Text></View></View>;\n}\n\nfunction FlowChip({ number, title }: { number: string; title: string }) {\n  return <View style={styles.flowChip}><View style={styles.flowChipNumber}><Text style={styles.flowChipNumberText}>{number}</Text></View><Text style={styles.flowChipTitle}>{title}</Text></View>;\n}\n`,
  'FlowChip component',
);

// Home service styles.
replaceOnce(
  `  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 28 },`,
  `  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },`,
  'Quick grid spacing',
);
replaceOnce(
  `  quickCardPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },`,
  `  quickCardPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },\n  psychologyHomeCard: { minHeight: 76, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 14, marginBottom: 28, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: themeColor('#e9eef6', '#101921') },\n  psychologyHomeBadge: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dbe6f5', '#172536') },\n  psychologyHomeBadgeText: { color: themeColor('#315b93', '#8ab9f5'), fontSize: 10, fontWeight: '900', letterSpacing: .8 },\n  psychologyHomeTitle: { color: themeColor('#14201d', '#fff'), fontSize: 15.5, fontWeight: '800' },\n  psychologyHomeText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 12, marginTop: 3 },`,
  'Psychology Home styles',
);

// Specialists screen styles.
replaceOnce(
  `  serviceList: { gap: 11 },\n  serviceCard: { minHeight: 82, borderRadius: 18, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: themeColor('#e9f0ec', '#0d1916') },\n  serviceDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16c783' },\n  serviceTitle: { color: themeColor('#14201d', '#fff'), fontSize: 17, fontWeight: '800' },\n  serviceText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 12.5, marginTop: 4 },`,
  `  serviceList: { gap: 12 },\n  serviceCard: { minHeight: 148, borderRadius: 22, padding: 18, backgroundColor: themeColor('#eef3f0', '#0d1916') },\n  serviceCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },\n  serviceCode: { color: themeColor('#9aa8a1', '#53635d'), fontSize: 12, fontWeight: '800', letterSpacing: 1 },\n  serviceStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: themeColor('#dff2e8', '#10271f') },\n  serviceStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16c783' },\n  serviceStatusText: { color: themeColor('#18724f', '#78f25f'), fontSize: 9, fontWeight: '900', letterSpacing: .8 },\n  serviceTitle: { color: themeColor('#14201d', '#fff'), fontSize: 21, fontWeight: '800', letterSpacing: -.3 },\n  serviceText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 12.5, lineHeight: 18, marginTop: 5 },\n  serviceAction: { color: '#16c783', fontSize: 12, fontWeight: '800', marginTop: 16 },`,
  'Specialists styles',
);

// Compact consultation styles and remove the white separators.
replaceOnce(
  `  choiceRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },\n  choiceCard: { flex: 1, minHeight: 120, borderRadius: 18, backgroundColor: themeColor('#e9f0ec', '#0b1715'), padding: 15 },`,
  `  consultDataScroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },\n  consultIntro: { color: themeColor('#5f6c67', '#a9b5b0'), fontSize: 13, marginTop: -5, marginBottom: 10 },\n  choiceRow: { flexDirection: 'row', gap: 10, marginBottom: 11 },\n  choiceCard: { flex: 1, minHeight: 94, borderRadius: 17, backgroundColor: themeColor('#e9f0ec', '#0b1715'), padding: 13 },`,
  'Compact choice cards',
);
replaceOnce(
  `  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#50605a', alignItems: 'center', justifyContent: 'center', marginBottom: 13 },`,
  `  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: '#50605a', alignItems: 'center', justifyContent: 'center', marginBottom: 9 },`,
  'Compact radio spacing',
);
replaceOnce(
  `  identityCard: { backgroundColor: '#f7fbf8', borderRadius: 18, padding: 17, marginBottom: 22 },`,
  `  identityCard: { backgroundColor: '#f7fbf8', borderRadius: 17, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 14 },`,
  'Compact identity card',
);
replaceOnce(
  `  identityName: { color: '#14201d', fontSize: 18, fontWeight: '800', marginTop: 8 },`,
  `  identityName: { color: '#14201d', fontSize: 16.5, fontWeight: '800', marginTop: 5 },`,
  'Compact identity name',
);
replaceOnce(
  `  formSectionTitle: { color: themeColor('#14201d', '#fff'), fontSize: 18, fontWeight: '800', marginBottom: 10 },\n  textArea: { minHeight: 128, paddingTop: 14 },\n  counter: { color: '#64736e', fontSize: 11, textAlign: 'right', marginTop: -7, marginBottom: 20 },\n  flowPreview: { backgroundColor: themeColor('#e9f0ec', '#0b1715'), borderRadius: 18, padding: 16, marginBottom: 17 },\n  flowPreviewTitle: { color: themeColor('#14201d', '#fff'), fontSize: 15, fontWeight: '800', marginBottom: 5 },\n  flowRow: { flexDirection: 'row', gap: 12, borderBottomWidth: 1, borderBottomColor: themeColor('#dce6e1', '#1d342f'), paddingVertical: 13 },`,
  `  formSectionTitle: { color: themeColor('#14201d', '#fff'), fontSize: 16.5, fontWeight: '800', marginBottom: 8 },\n  textArea: { minHeight: 92, paddingTop: 12 },\n  counter: { color: '#64736e', fontSize: 10.5, textAlign: 'right', marginTop: -8, marginBottom: 10 },\n  flowPreview: { backgroundColor: themeColor('#e9f0ec', '#0b1715'), borderRadius: 17, padding: 13, marginBottom: 4 },\n  flowPreviewTitle: { color: themeColor('#14201d', '#fff'), fontSize: 13.5, fontWeight: '800', marginBottom: 10 },\n  flowCompact: { flexDirection: 'row', gap: 8 },\n  flowChip: { flex: 1, minHeight: 58, borderRadius: 13, paddingHorizontal: 9, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dfe9e3', '#12201c') },\n  flowChipNumber: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#ccebdc', '#173329') },\n  flowChipNumberText: { color: themeColor('#0b8f61', '#78f25f'), fontSize: 10, fontWeight: '900' },\n  flowChipTitle: { color: themeColor('#34413d', '#e9f2ee'), fontSize: 10.5, fontWeight: '800', marginTop: 5, textAlign: 'center' },\n  stickyCta: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, backgroundColor: themeColor('#e8efeb', '#07100f') },\n  flowRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },`,
  'Compact flow preview and sticky CTA',
);

fs.writeFileSync(path, s);
console.log('Compact Home, specialists and consultation UX patch applied.');
