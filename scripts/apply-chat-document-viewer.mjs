import fs from 'node:fs';

const file = 'src/components/ChatPaciente.tsx';
let src = fs.readFileSync(file, 'utf8');

if (src.includes("import DocumentViewer from './DocumentViewer';")) {
  console.log('Chat document viewer patch already applied.');
  process.exit(0);
}

src = src.replace("import ThemeToggle from './ThemeToggle';", "import ThemeToggle from './ThemeToggle';\nimport DocumentViewer from './DocumentViewer';");

const oldModal = `      <Modal visible={!!viewer} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setViewer(null)}>
        <SafeAreaView style={styles.viewerSafe}>
          <View style={styles.viewerHeader}>
            <Pressable onPress={() => setViewer(null)} style={styles.viewerBack} accessibilityLabel="Fechar documento"><Text style={styles.backText}>‹</Text></Pressable>
            <Text style={styles.viewerTitle} numberOfLines={1}>{viewer?.name || 'Documento'}</Text>
            <Pressable
              onPress={() => viewer?.url && Linking.openURL(viewer.url)}
              style={styles.viewerExternal}
              accessibilityLabel="Abrir documento no navegador"
            >
              <Text style={styles.viewerExternalText}>↗</Text>
            </Pressable>
          </View>
          {viewer?.type === 'imagem' ? (
            <View style={styles.imageViewer}><Image source={{ uri: viewer.url }} style={styles.viewerImage} resizeMode="contain" /></View>
          ) : viewer?.url ? (
            <WebView source={{ uri: viewer.url }} style={styles.webview} startInLoadingState renderLoading={() => <View style={styles.center}><ActivityIndicator color="#16c783" /></View>} />
          ) : null}
        </SafeAreaView>
      </Modal>`;

const newViewer = `      <DocumentViewer
        visible={!!viewer}
        url={viewer?.url || null}
        name={viewer?.name || null}
        type={viewer?.type || 'pdf'}
        onClose={() => setViewer(null)}
      />`;

if (!src.includes(oldModal)) {
  throw new Error('Viewer antigo do ChatPaciente não encontrado.');
}

src = src.replace(oldModal, newViewer);

// Remove imports that were only used by the old embedded viewer.
src = src.replace('  Linking,\n  Image,\n', '');
src = src.replace('  Modal,\n', '');
src = src.replace("import { WebView } from 'react-native-webview';\n", '');

fs.writeFileSync(file, src);
console.log('Chat now reuses DocumentViewer with save/share support.');
