import fs from 'node:fs';

const path = 'App.tsx';
let src = fs.readFileSync(path, 'utf8');

if (!src.includes("const SUPPORT_WHATSAPP = '5598989272727';")) {
  src = src.replace(
    "const URL_ESPECIALISTAS = 'https://consultaja24h.com.br/especialistas';",
    "const URL_ESPECIALISTAS = 'https://consultaja24h.com.br/especialistas';\nconst SUPPORT_WHATSAPP = '5598989272727';",
  );
}

if (!src.includes('async function abrirSuporte()')) {
  const anchor = `async function abrirLink(url: string) {\n  try {\n    await Linking.openURL(url);\n  } catch {\n    Alert.alert('Não foi possível abrir', 'Tente novamente em instantes.');\n  }\n}`;
  const replacement = `${anchor}\n\nasync function abrirSuporte() {\n  const mensagem = encodeURIComponent('Olá, preciso de ajuda com o ConsultaJá24h.');\n  await abrirLink(\`https://wa.me/\${SUPPORT_WHATSAPP}?text=\${mensagem}\`);\n}`;
  if (!src.includes(anchor)) throw new Error('Âncora abrirLink não encontrada');
  src = src.replace(anchor, replacement);
}

if (!src.includes('style={styles.supportButton}')) {
  const anchor = `        <View style={styles.profileNotice}>\n          <Text style={styles.profileNoticeTitle}>Privacidade</Text>`;
  const replacement = `        <Pressable onPress={abrirSuporte} style={({ pressed }) => [styles.supportButton, pressed && { opacity: 0.82 }]} accessibilityRole="button" accessibilityLabel="Falar com o suporte">\n          <View style={styles.supportIcon}>\n            <View style={styles.supportBubble}>\n              <View style={styles.supportBubbleDot} />\n              <View style={styles.supportBubbleDot} />\n              <View style={styles.supportBubbleDot} />\n            </View>\n          </View>\n          <View style={{ flex: 1 }}>\n            <Text style={styles.supportTitle}>Suporte</Text>\n            <Text style={styles.supportText}>Fale com a equipe da ConsultaJá24h</Text>\n          </View>\n          <Text style={styles.supportArrow}>›</Text>\n        </Pressable>\n\n${anchor}`;
  if (!src.includes(anchor)) throw new Error('Âncora do perfil não encontrada');
  src = src.replace(anchor, replacement);
}

if (!src.includes('supportButton: {')) {
  const anchor = `  profileNotice: { backgroundColor: themeColor('#eef7f1', '#10201d'), borderRadius: 16, padding: 16, marginTop: 14 },`;
  const styles = `  supportButton: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 66, borderRadius: 18, paddingHorizontal: 15, marginTop: 14, backgroundColor: themeColor('#e9f0ec', '#0d1916') },\n  supportIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dcebe3', '#123027') },\n  supportBubble: { width: 19, height: 15, borderWidth: 1.6, borderColor: themeColor('#0b8f61', '#78f25f'), borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2.2 },\n  supportBubbleDot: { width: 2.5, height: 2.5, borderRadius: 2, backgroundColor: themeColor('#0b8f61', '#78f25f') },\n  supportTitle: { color: themeColor('#14201d', '#eef5f1'), fontSize: 14.5, fontWeight: '800' },\n  supportText: { color: themeColor('#66736e', '#8a97a6'), fontSize: 11.5, marginTop: 3 },\n  supportArrow: { color: themeColor('#7b8b84', '#6f8179'), fontSize: 24, marginTop: -1 },\n${anchor}`;
  if (!src.includes(anchor)) throw new Error('Âncora de estilos do perfil não encontrada');
  src = src.replace(anchor, styles);
}

fs.writeFileSync(path, src);
console.log('Support entry applied');
