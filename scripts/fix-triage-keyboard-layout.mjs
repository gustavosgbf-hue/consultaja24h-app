import fs from 'node:fs';

const path = 'App.tsx';
let s = fs.readFileSync(path, 'utf8');

const oldStart = `      <Animated.View style={motion.style}>
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[{ flex: 1 }, stageStyle]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <View style={styles.pageWrapFlex}>`;
const newStart = `      <Animated.View style={motion.style}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <Animated.View style={[{ flex: 1 }, stageStyle]}>
          <View style={styles.pageWrapFlex}>`;

if (s.includes(oldStart)) s = s.replace(oldStart, newStart);

const oldEnd = `          </View>
        </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
      </Animated.View>
    );
  }

  if (etapaConsulta === 'fila') {`;
const newEnd = `          </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </Animated.View>
    );
  }

  if (etapaConsulta === 'fila') {`;

if (s.includes(oldEnd)) s = s.replace(oldEnd, newEnd);

s = s.replace(
  `  pageWrapFlex: { flex: 1, padding: 20, paddingBottom: 14 },`,
  `  pageWrapFlex: { flex: 1, minHeight: 0, padding: 20, paddingBottom: 10 },`,
);
s = s.replace(
  `  triageChat: { flex: 1, marginTop: 2 },`,
  `  triageChat: { flex: 1, minHeight: 0, marginTop: 2 },`,
);
s = s.replace(
  `  triageComposer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingTop: 12 },`,
  `  triageComposer: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 10, paddingBottom: 2, backgroundColor: themeColor('#e8efeb', '#07100f') },`,
);

if (!s.includes(`pageWrapFlex: { flex: 1, minHeight: 0`) || !s.includes(`triageChat: { flex: 1, minHeight: 0`)) {
  throw new Error('Triagem keyboard patch não foi aplicado');
}

fs.writeFileSync(path, s);
console.log('Triagem keyboard layout patch aplicado.');
