import fs from 'node:fs';

const path = 'App.tsx';
let src = fs.readFileSync(path, 'utf8');

const cleanup = `const renewalWebCleanupScript = \`\n(function() {\n  function hideInternalHeader() {\n    var links = Array.from(document.querySelectorAll('a, button'));\n    var plantao = links.find(function(el) {\n      return /Plantão\\s*24h/i.test((el.innerText || el.textContent || '').trim());\n    });\n    if (!plantao) return false;\n\n    var target = plantao.closest('header, nav');\n    if (!target) {\n      var node = plantao.parentElement;\n      while (node && node !== document.body) {\n        var text = (node.innerText || '').replace(/\\s+/g, ' ').trim();\n        if (/ConsultaJá24h/i.test(text) && /Plantão\\s*24h/i.test(text)) {\n          target = node;\n          break;\n        }\n        node = node.parentElement;\n      }\n    }\n\n    if (!target) target = plantao.parentElement && plantao.parentElement.parentElement;\n    if (!target) return false;\n\n    target.style.setProperty('display', 'none', 'important');\n    target.style.setProperty('height', '0', 'important');\n    target.style.setProperty('min-height', '0', 'important');\n    target.style.setProperty('margin', '0', 'important');\n    target.style.setProperty('padding', '0', 'important');\n    target.style.setProperty('border', '0', 'important');\n    return true;\n  }\n\n  hideInternalHeader();\n  var attempts = 0;\n  var timer = setInterval(function() {\n    attempts += 1;\n    if (hideInternalHeader() || attempts >= 30) clearInterval(timer);\n  }, 200);\n\n  var observer = new MutationObserver(function() { hideInternalHeader(); });\n  observer.observe(document.documentElement, { childList: true, subtree: true });\n  setTimeout(function() { observer.disconnect(); }, 8000);\n})();\ntrue;\n\`;`;

const start = src.indexOf('const renewalWebCleanupScript = `');
if (start >= 0) {
  const endMarker = '\n`;';
  const end = src.indexOf(endMarker, start);
  if (end < 0) throw new Error('Fim do renewalWebCleanupScript não encontrado');
  src = src.slice(0, start) + cleanup + src.slice(end + endMarker.length);
} else {
  const anchor = "function InternalWebScreen({ title, url, onVoltar }: { title: string; url: string; onVoltar: () => void }) {";
  if (!src.includes(anchor)) throw new Error('InternalWebScreen anchor not found');
  src = src.replace(anchor, `${cleanup}\n\n${anchor}`);
}

const webAnchor = `            source={{ uri: url }}\n            style={styles.webView}`;
const webReplacement = `            source={{ uri: url }}\n            injectedJavaScriptBeforeContentLoaded={title === 'Renovar receita' ? renewalWebCleanupScript : undefined}\n            injectedJavaScript={title === 'Renovar receita' ? renewalWebCleanupScript : undefined}\n            style={styles.webView}`;
if (!src.includes("injectedJavaScriptBeforeContentLoaded={title === 'Renovar receita'")) {
  if (!src.includes(webAnchor)) throw new Error('WebView anchor not found');
  src = src.replace(webAnchor, webReplacement);
}

const supportBlock = `        <Pressable onPress={abrirSuporte} style={({ pressed }) => [styles.supportButton, pressed && { opacity: 0.82 }]} accessibilityRole="button" accessibilityLabel="Falar com o suporte">\n          <View style={styles.supportIcon}>\n            <View style={styles.supportBubble}>\n              <View style={styles.supportBubbleDot} />\n              <View style={styles.supportBubbleDot} />\n              <View style={styles.supportBubbleDot} />\n            </View>\n          </View>\n          <View style={{ flex: 1 }}>\n            <Text style={styles.supportTitle}>Suporte</Text>\n            <Text style={styles.supportText}>Fale com a equipe da ConsultaJá24h</Text>\n          </View>\n          <Text style={styles.supportArrow}>›</Text>\n        </Pressable>\n`;
while (src.includes(`${supportBlock}\n${supportBlock}`)) {
  src = src.replace(`${supportBlock}\n${supportBlock}`, supportBlock);
}

fs.writeFileSync(path, src);
console.log('Renewal WebView cleanup applied');
