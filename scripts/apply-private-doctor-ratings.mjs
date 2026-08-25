import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, content) => fs.writeFileSync(path.join(root, rel), content);

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Trecho não encontrado em ${label}`);
  return source.replace(before, after);
}

function patchChat() {
  const rel = 'src/components/ChatPaciente.tsx';
  let src = read(rel);
  if (src.includes('function AvaliacaoConsulta(')) return;

  src = replaceOnce(
    src,
    "import ThemeToggle from './ThemeToggle';",
    "import ThemeToggle from './ThemeToggle';\nimport { carregarAvaliacaoAtendimento, salvarAvaliacaoAtendimento } from '../api/avaliacao';",
    rel,
  );

  src = replaceOnce(
    src,
    `  somenteLeitura?: boolean;\n};`,
    `  somenteLeitura?: boolean;\n  avaliavel?: boolean;\n};`,
    rel,
  );

  const marker = `export default function ChatPaciente({ atendimentoId, medicoNome, onVoltar, somenteLeitura = false }: Props) {`;
  const component = `function RatingStar({ active, onPress }: { active: boolean; onPress: () => void }) {\n  return (\n    <Pressable onPress={onPress} style={styles.ratingStarButton} accessibilityRole="button" accessibilityLabel={active ? 'Estrela selecionada' : 'Selecionar estrela'}>\n      <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">\n        <Path\n          d="m12 3.2 2.55 5.18 5.72.83-4.14 4.03.98 5.69L12 16.24l-5.11 2.69.98-5.69-4.14-4.03 5.72-.83L12 3.2Z"\n          fill={active ? '#78f25f' : 'transparent'}\n          stroke={active ? '#78f25f' : themeColor('#8da098', '#5f716a')}\n          strokeWidth="1.45"\n          strokeLinejoin="round"\n        />\n      </Svg>\n    </Pressable>\n  );\n}\n\nfunction AvaliacaoConsulta({ atendimentoId, medicoNome }: { atendimentoId: number; medicoNome?: string | null }) {\n  const [carregando, setCarregando] = useState(true);\n  const [permitida, setPermitida] = useState(false);\n  const [estrelas, setEstrelas] = useState(0);\n  const [comentario, setComentario] = useState('');\n  const [salvando, setSalvando] = useState(false);\n  const [salva, setSalva] = useState(false);\n\n  useEffect(() => {\n    let ativo = true;\n    carregarAvaliacaoAtendimento(atendimentoId)\n      .then((data) => {\n        if (!ativo) return;\n        setPermitida(!!data.avaliavel);\n        if (data.avaliacao) setSalva(true);\n      })\n      .catch(() => {})\n      .finally(() => { if (ativo) setCarregando(false); });\n    return () => { ativo = false; };\n  }, [atendimentoId]);\n\n  async function salvar() {\n    if (estrelas < 1 || salvando) return;\n    setSalvando(true);\n    try {\n      await salvarAvaliacaoAtendimento(atendimentoId, estrelas, comentario);\n      setSalva(true);\n      setEstrelas(0);\n      setComentario('');\n    } catch (error) {\n      Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente em instantes.');\n    } finally {\n      setSalvando(false);\n    }\n  }\n\n  if (carregando || !permitida) return null;\n\n  if (salva) {\n    return (\n      <View style={styles.ratingThanks}>\n        <Text style={styles.ratingThanksTitle}>Obrigado pelo seu feedback</Text>\n        <Text style={styles.ratingThanksText}>Sua avaliação foi registrada de forma privada pela ConsultaJá24h.</Text>\n      </View>\n    );\n  }\n\n  return (\n    <View style={styles.ratingCard}>\n      <Text style={styles.ratingEyebrow}>AVALIAÇÃO DO ATENDIMENTO</Text>\n      <Text style={styles.ratingTitle}>Como foi seu atendimento{medicoNome ? ' com ' + medicoNome : ''}?</Text>\n      <Text style={styles.ratingText}>Sua avaliação é privada e ajuda a ConsultaJá24h a acompanhar a qualidade dos atendimentos.</Text>\n      <View style={styles.ratingStars}>\n        {[1, 2, 3, 4, 5].map((n) => <RatingStar key={n} active={n <= estrelas} onPress={() => setEstrelas(n)} />)}\n      </View>\n      {estrelas > 0 ? (\n        <>\n          <TextInput\n            value={comentario}\n            onChangeText={(value) => setComentario(value.slice(0, 600))}\n            placeholder="Quer deixar um comentário? (opcional)"\n            placeholderTextColor={themeColor('#84918c', '#697b74')}\n            style={styles.ratingInput}\n            multiline\n            maxLength={600}\n            textAlignVertical="top"\n          />\n          <Pressable onPress={salvar} disabled={salvando} style={[styles.ratingSave, salvando && { opacity: 0.6 }]}>\n            {salvando ? <ActivityIndicator size="small" color="#07100f" /> : <Text style={styles.ratingSaveText}>Enviar avaliação</Text>}\n          </Pressable>\n        </>\n      ) : null}\n    </View>\n  );\n}\n\n`;

  src = replaceOnce(src, marker, component + `export default function ChatPaciente({ atendimentoId, medicoNome, onVoltar, somenteLeitura = false, avaliavel = false }: Props) {`, rel);

  src = replaceOnce(
    src,
    `            <View style={styles.notice}>\n              <Text style={styles.noticeText}>{somenteLeitura ? 'Esta conversa foi encerrada e permanece disponível para consulta e acesso aos documentos.' : 'Você está falando diretamente com o profissional responsável pelo seu atendimento.'}</Text>\n            </View>`,
    `            <View style={styles.notice}>\n              <Text style={styles.noticeText}>{somenteLeitura ? 'Esta conversa foi encerrada e permanece disponível para consulta e acesso aos documentos.' : 'Você está falando diretamente com o profissional responsável pelo seu atendimento.'}</Text>\n            </View>\n            {avaliavel ? <AvaliacaoConsulta atendimentoId={atendimentoId} medicoNome={medicoNome} /> : null}`,
    rel,
  );

  src = replaceOnce(
    src,
    `  noticeText: { textAlign: 'center', color: themeColor('#66736e', '#899892'), fontSize: 11, lineHeight: 16 },`,
    `  noticeText: { textAlign: 'center', color: themeColor('#66736e', '#899892'), fontSize: 11, lineHeight: 16 },\n  ratingCard: { marginBottom: 16, borderRadius: 18, padding: 16, backgroundColor: themeColor('#f7fbf8', '#0d1916'), borderWidth: 1, borderColor: themeColor('#dce8e1', '#183029') },\n  ratingEyebrow: { color: themeColor('#18724f', '#78f25f'), fontSize: 9, fontWeight: '800', letterSpacing: 1 },\n  ratingTitle: { marginTop: 7, color: themeColor('#14201d', '#f1f7f4'), fontSize: 15, fontWeight: '800', lineHeight: 20 },\n  ratingText: { marginTop: 5, color: themeColor('#66736e', '#87968f'), fontSize: 11.5, lineHeight: 17 },\n  ratingStars: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, marginBottom: 4 },\n  ratingStarButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },\n  ratingInput: { minHeight: 72, marginTop: 10, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, color: themeColor('#14201d', '#e9f1ed'), backgroundColor: themeColor('#edf4f0', '#09120f'), borderWidth: 1, borderColor: themeColor('#d5e2db', '#1b3029'), fontSize: 12.5, lineHeight: 18 },\n  ratingSave: { marginTop: 10, minHeight: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#78f25f' },\n  ratingSaveText: { color: '#07100f', fontSize: 12.5, fontWeight: '800' },\n  ratingThanks: { marginBottom: 16, borderRadius: 16, padding: 14, backgroundColor: themeColor('#eef7f1', '#0d1916'), borderWidth: 1, borderColor: themeColor('#dce8e1', '#183029') },\n  ratingThanksTitle: { color: themeColor('#14201d', '#f1f7f4'), fontSize: 13.5, fontWeight: '800' },\n  ratingThanksText: { marginTop: 4, color: themeColor('#66736e', '#87968f'), fontSize: 11.5, lineHeight: 17 },`,
    rel,
  );

  write(rel, src);
}

function patchApp() {
  const rel = 'App.tsx';
  let src = read(rel);
  if (src.includes('avaliavel={atendimentoConcluido(item.status)}')) return;
  if (!src.includes('function HistoricoChatPage(')) {
    throw new Error('Aplique primeiro scripts/apply-final-navigation-polish.mjs');
  }

  src = replaceOnce(
    src,
    `        somenteLeitura={String(item.status || '').trim().toLowerCase() !== 'assumido'}\n        onVoltar={motion.close}`,
    `        somenteLeitura={String(item.status || '').trim().toLowerCase() !== 'assumido'}\n        avaliavel={atendimentoConcluido(item.status)}\n        onVoltar={motion.close}`,
    rel,
  );
  write(rel, src);
}

patchChat();
patchApp();
console.log('Private doctor ratings applied.');
