import {
  ActivityIndicator,
  Alert,
  DynamicColorIOS,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

type Props = {
  visible: boolean;
  url?: string | null;
  name?: string | null;
  type?: 'pdf' | 'imagem';
  onClose: () => void;
};

function themeColor(light: string, dark: string) {
  return Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : dark;
}

export default function DocumentViewer({ visible, url, name, type = 'pdf', onClose }: Props) {
  async function openExternal() {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      // O documento permanece aberto no visualizador interno se o sistema não conseguir abrir externamente.
    }
  }

  async function saveOrShare() {
    if (!url) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Salvar documento', 'O compartilhamento não está disponível neste aparelho.');
        return;
      }
      const ext = type === 'imagem' ? '.jpg' : '.pdf';
      const fallback = type === 'imagem' ? 'Documento.jpg' : 'Documento.pdf';
      const safeName = String(name || fallback)
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 90);
      const finalName = safeName.includes('.') ? safeName : safeName + ext;
      const target = String(FileSystem.cacheDirectory || '') + Date.now() + '-' + finalName;
      const result = await FileSystem.downloadAsync(url, target);
      await Sharing.shareAsync(result.uri, {
        mimeType: type === 'imagem' ? 'image/jpeg' : 'application/pdf',
        dialogTitle: 'Salvar ou compartilhar documento',
        UTI: type === 'imagem' ? 'public.jpeg' : 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Não foi possível salvar', 'Tente novamente em instantes.');
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.back} accessibilityLabel="Fechar documento">
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>{name || 'Documento'}</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={saveOrShare} style={styles.external} accessibilityLabel="Salvar ou compartilhar documento">
              <Text style={styles.saveText}>↓</Text>
            </Pressable>
            <Pressable onPress={openExternal} style={styles.external} accessibilityLabel="Abrir documento no navegador">
              <Text style={styles.externalText}>↗</Text>
            </Pressable>
          </View>
        </View>
        {type === 'imagem' && url ? (
          <View style={styles.imageWrap}><Image source={{ uri: url }} style={styles.image} resizeMode="contain" /></View>
        ) : url ? (
          <WebView
            source={{ uri: url }}
            style={styles.webview}
            startInLoadingState
            renderLoading={() => <View style={styles.loading}><ActivityIndicator color="#16c783" /></View>}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: themeColor('#e8efeb', '#07100f') },
  header: { minHeight: 64, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dfe8e3', '#0d1916') },
  backText: { color: themeColor('#14201d', '#eef5f1'), fontSize: 34, lineHeight: 36, marginTop: -3 },
  title: { flex: 1, marginHorizontal: 10, textAlign: 'center', color: themeColor('#14201d', '#eef5f1'), fontSize: 15, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  external: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dfe8e3', '#0d1916') },
  saveText: { color: themeColor('#18724f', '#78f25f'), fontSize: 24, fontWeight: '600', marginTop: -2 },
  externalText: { color: themeColor('#18724f', '#78f25f'), fontSize: 22, fontWeight: '500', marginTop: -2 },
  webview: { flex: 1, backgroundColor: themeColor('#e8efeb', '#07100f') },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#e8efeb', '#07100f') },
  imageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#e2e9e5', '#040807') },
  image: { width: '100%', height: '100%' },
});
