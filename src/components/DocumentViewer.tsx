import {
  ActivityIndicator,
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.back} accessibilityLabel="Fechar documento">
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>{name || 'Documento'}</Text>
          <Pressable onPress={openExternal} style={styles.external} accessibilityLabel="Abrir documento no navegador">
            <Text style={styles.externalText}>↗</Text>
          </Pressable>
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
  external: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#dfe8e3', '#0d1916') },
  externalText: { color: themeColor('#18724f', '#78f25f'), fontSize: 22, fontWeight: '500', marginTop: -2 },
  webview: { flex: 1, backgroundColor: themeColor('#e8efeb', '#07100f') },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#e8efeb', '#07100f') },
  imageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor('#e2e9e5', '#040807') },
  image: { width: '100%', height: '100%' },
});
