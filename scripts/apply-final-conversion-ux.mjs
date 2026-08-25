import './apply-navigation-carousel-ux.mjs';
import fs from 'node:fs';

const path = 'App.tsx';
let s = fs.readFileSync(path, 'utf8');

function replaceOnce(oldText, newText, label) {
  if (!s.includes(oldText)) throw new Error(`Anchor not found: ${label}`);
  s = s.replace(oldText, newText);
}

// Home hierarchy: active care first, then strongest chat CTA.
replaceOnce(
  "  const ultimo = historico[0];\n  const itensHistorico = mostrarTudo ? historico : historico.slice(0, 4);",
  "  const atendimentoAtivo = historico.find((item) => String(item.status || '').trim().toLowerCase() === 'assumido');\n  const ultimo = historico.find((item) => String(item.status || '').trim().toLowerCase() !== 'assumido');\n  const itensHistorico = mostrarTudo ? historico : historico.slice(0, 4);",
  'home active attendance hierarchy',
);

replaceOnce(
  `        <View style={styles.heroCard}>\n          <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.heroEyebrow}>MÉDICO ONLINE</Text></View>\n          <Text style={styles.heroTitle}>Atendimento por chat, sem precisar sair de casa.</Text>\n          <Text style={styles.heroText}>Você paga, faz uma triagem rápida e entra na fila. O atendimento acontecerá pelo próprio app.</Text>\n          <Pressable onPress={onNovaConsulta} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}><Text style={styles.primaryButtonText}>Consultar agora</Text></Pressable>\n        </View>`,
  `        {atendimentoAtivo ? (\n          <Pressable onPress={() => onAbrirAtendimento(atendimentoAtivo)} style={({ pressed }) => [styles.activeCareCard, pressed && styles.primaryPressed]}>\n            <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.activeCareEyebrow}>ATENDIMENTO EM ANDAMENTO</Text></View>\n            <Text style={styles.activeCareTitle}>Continuar atendimento</Text>\n            <Text style={styles.activeCareText}>{atendimentoAtivo.medico_nome ? 'Voltar para a conversa com ' + atendimentoAtivo.medico_nome + '.' : 'Voltar para a conversa com o médico.'}</Text>\n            <Text style={styles.activeCareAction}>Abrir conversa ›</Text>\n          </Pressable>\n        ) : null}\n\n        <View style={styles.heroCard}>\n          <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.heroEyebrow}>MÉDICO ONLINE AGORA</Text></View>\n          <Text style={styles.heroTitle}>Consulta por chat, direto pelo app.</Text>\n          <Text style={styles.heroText}>Sem videochamada. Sem precisar agendar.</Text>\n          <Pressable onPress={onNovaConsulta} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}><Text style={styles.primaryButtonText}>Falar com um médico agora</Text></Pressable>\n        </View>`,
  'conversion focused hero',
);

// Keep the last attendance section focused on completed care when an active chat exists.
replaceOnce(
  '<SectionHeader title="Último atendimento" />',
  '<SectionHeader title="Último atendimento" />',
  'last attendance anchor',
);

// Tone down remaining home typography and add active attendance styles.
replaceOnce(
  "  heroTitle: { color: themeColor('#14201d', '#fff'), fontSize: 25, fontWeight: '700', lineHeight: 31, marginTop: 10, letterSpacing: -.35 },",
  "  heroTitle: { color: themeColor('#14201d', '#fff'), fontSize: 24, fontWeight: '600', lineHeight: 30, marginTop: 10, letterSpacing: -.3 },",
  'hero typography',
);
replaceOnce(
  "  heroText: { color: themeColor('#5f6c67', '#a9b5b0'), lineHeight: 21, marginTop: 9, marginBottom: 14 },",
  "  heroText: { color: themeColor('#5f6c67', '#a9b5b0'), lineHeight: 20, marginTop: 8, marginBottom: 15, fontSize: 13.5 },\n  activeCareCard: { backgroundColor: themeColor('#d7e8df', '#10251f'), borderRadius: 20, padding: 18, marginBottom: 12 },\n  activeCareEyebrow: { color: themeColor('#18724f', '#78f25f'), fontSize: 10, fontWeight: '700', letterSpacing: 1 },\n  activeCareTitle: { color: themeColor('#14201d', '#f3f8f5'), fontSize: 19, fontWeight: '600', marginTop: 9 },\n  activeCareText: { color: themeColor('#596763', '#9fb0a9'), fontSize: 13, lineHeight: 19, marginTop: 5 },\n  activeCareAction: { color: '#16c783', fontSize: 12.5, fontWeight: '600', marginTop: 11 },",
  'active care styles',
);
replaceOnce(
  "  primaryButtonText: { color: '#07100f', fontSize: 16, fontWeight: '800' },",
  "  primaryButtonText: { color: '#07100f', fontSize: 15.5, fontWeight: '700' },",
  'primary CTA typography',
);
replaceOnce(
  "  greeting: { color: themeColor('#14201d', '#fff'), fontSize: 30, fontWeight: '700', marginTop: 3, letterSpacing: -.6 },",
  "  greeting: { color: themeColor('#14201d', '#fff'), fontSize: 29, fontWeight: '600', marginTop: 3, letterSpacing: -.5 },",
  'home greeting typography',
);
replaceOnce(
  "  sectionTitle: { color: themeColor('#14201d', '#fff'), fontSize: 19, fontWeight: '700' },",
  "  sectionTitle: { color: themeColor('#14201d', '#fff'), fontSize: 18.5, fontWeight: '600' },",
  'section typography',
);

// No em dash or en dash in patient facing copy.
s = s.replace(/[—–]/g, ',');

fs.writeFileSync(path, s);
console.log('Final conversion UX patch applied.');
