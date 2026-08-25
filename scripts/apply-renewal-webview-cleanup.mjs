import fs from 'node:fs';

const path = 'App.tsx';
let src = fs.readFileSync(path, 'utf8');

if (!src.includes('const renewalWebCleanupScript = `')) {
  const anchor = "function InternalWebScreen({ title, url, onVoltar }: { title: string; url: string; onVoltar: () => void }) {";
  const injected = `const renewalWebCleanupScript = \`\n(function() {\n  function hideInternalHeader() {\n    const nodes = Array.from(document.querySelectorAll('header, nav, section, div'));\n    const target = nodes.find(function(el) {\n      const text = (el.innerText || '').replace(/\\s+/g, ' ').trim();\n      return text.includes('ConsultaJá24h') && text.includes('Plantão 24h') && el.children.length <= 12;\n    });\n    if (target) {\n      target.style.setProperty('display', 'none', 'important');\n      return true;\n    }\n    return false;\n  }\n  hideInternalHeader();\n  const observer = new MutationObserver(function() {\n    if (hideInternalHeader()) observer.disconnect();\n  });\n  observer.observe(document.documentElement, { childList: true, subtree: true });\n})();\ntrue;\n\`;\n\n${anchor}`;
  if (!src.includes(anchor)) throw new Error('InternalWebScreen anchor not found');
  src = src.replace(anchor, injected);
}

const webAnchor = `            source={{ uri: url }}\n            style={styles.webView}`;
const webReplacement = `            source={{ uri: url }}\n            injectedJavaScriptBeforeContentLoaded={title === 'Renovar receita' ? renewalWebCleanupScript : undefined}\n            injectedJavaScript={title === 'Renovar receita' ? renewalWebCleanupScript : undefined}\n            style={styles.webView}`;
if (!src.includes('injectedJavaScriptBeforeContentLoaded={title === \'Renovar receita\'')) {
  if (!src.includes(webAnchor)) throw new Error('WebView anchor not found');
  src = src.replace(webAnchor, webReplacement);
}

// Keep only one support card if a prior patch was applied twice.
const supportBlock = `        <Pressable onPress={abrirSuporte} style={({ pressed }) => [styles.supportButton, pressed && { opacity: 0.82 }]} accessibilityRole="button" accessibilityLabel="Falar com o suporte">\n          <View style={styles.supportIcon}>\n            <View style={styles.supportBubble}>\n              <View style={styles.supportBubbleDot} />\n              <View style={styles.supportBubbleDot} />\n              <View style={styles.supportBubbleDot} />\n            </View>\n          </View>\n          <View style={{ flex: 1 }}>\n            <Text style={styles.supportTitle}>Suporte</Text>\n            <Text style={styles.supportText}>Fale com a equipe da ConsultaJá24h</Text>\n          </View>\n          <Text style={styles.supportArrow}>›</Text>\n        </Pressable>\n`;
while (src.includes(`${supportBlock}\n${supportBlock}`)) {
  src = src.replace(`${supportBlock}\n${supportBlock}`, supportBlock);
}

fs.writeFileSync(path, src);
console.log('Renewal WebView cleanup applied');
