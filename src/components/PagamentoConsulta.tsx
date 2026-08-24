import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import {
  cobrarCartaoConsulta,
  consultarStatusAtendimento,
  consultarStatusPix,
  gerarPixConsulta,
  iniciarAtendimento,
  vincularPixAoAtendimento,
} from '../api/client';
import type { Paciente } from '../types';
import EfiCardForm from './EfiCardForm';

type Props = {
  pacienteLogado: Paciente;
  atendimentoParaTerceiro: boolean;
  pacienteNome: string;
  pacienteCpf: string;
  pacienteNascimento?: string;
  onVoltar: () => void;
  onPagamentoConfirmado: (atendimentoId: number) => void;
};

type Metodo = 'pix' | 'cartao';

function digits(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function formatarValor(valor?: number) {
  if (!valor || !Number.isFinite(valor)) return 'R$ 49,90';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PagamentoConsulta({
  pacienteLogado,
  atendimentoParaTerceiro,
  pacienteNome,
  pacienteCpf,
  pacienteNascimento,
  onVoltar,
  onPagamentoConfirmado,
}: Props) {
  const [metodo, setMetodo] = useState<Metodo>('pix');
  const [loading, setLoading] = useState(false);
  const [atendimentoId, setAtendimentoId] = useState<number | null>(null);
  const [orderId, setOrderId] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [valor, setValor] = useState<number | undefined>();
  const [status, setStatus] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [cartaoPendente, setCartaoPendente] = useState(false);
  const [cartaoMask, setCartaoMask] = useState('');
  const [cartaoFormKey, setCartaoFormKey] = useState(0);

  const pagadorCpf = useMemo(() => digits(pacienteLogado.cpf), [pacienteLogado.cpf]);
  const telefoneContato = useMemo(() => digits(pacienteLogado.tel), [pacienteLogado.tel]);

  async function garantirAtendimento() {
    if (atendimentoId) return atendimentoId;
    if (!telefoneContato) throw new Error('Celular não encontrado no seu cadastro.');
    if (digits(pacienteCpf).length !== 11) throw new Error('Não foi possível identificar um CPF válido para o paciente.');

    const criado = await iniciarAtendimento({
      nome: pacienteNome,
      telefone: telefoneContato,
      cpf: digits(pacienteCpf),
      email: pacienteLogado.email || undefined,
      dataNascimento: pacienteNascimento || undefined,
      triagem: '(aguardando pagamento)',
      atendimentoParaTerceiro,
    });
    if (!criado.atendimentoId) throw new Error('Não foi possível criar o atendimento.');
    setAtendimentoId(criado.atendimentoId);
    if (criado.pagamentoConfirmado) {
      onPagamentoConfirmado(criado.atendimentoId);
    }
    return criado.atendimentoId;
  }

  useEffect(() => {
    if (!orderId || !atendimentoId) return;
    let ativo = true;
    let checando = false;

    async function verificar() {
      if (!ativo || checando) return;
      checando = true;
      try {
        const pix = await consultarStatusPix(orderId);
        if (!ativo) return;
        if (pix.pago) {
          setStatus('Pagamento confirmado');
          ativo = false;
          onPagamentoConfirmado(atendimentoId!);
          return;
        }
        const atendimento = await consultarStatusAtendimento(atendimentoId!);
        if (!ativo) return;
        if (atendimento.atendimento?.pagamento_status === 'confirmado') {
          setStatus('Pagamento confirmado');
          ativo = false;
          onPagamentoConfirmado(atendimentoId!);
          return;
        }
        setStatus('Aguardando pagamento…');
      } catch {
        if (ativo) setStatus('Aguardando confirmação…');
      } finally {
        checando = false;
      }
    }

    verificar();
    const timer = setInterval(verificar, 3000);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [orderId, atendimentoId, onPagamentoConfirmado]);

  useEffect(() => {
    if (!cartaoPendente || !atendimentoId) return;
    let ativo = true;
    let checando = false;

    async function verificarCartao() {
      if (!ativo || checando) return;
      checando = true;
      try {
        const atendimento = await consultarStatusAtendimento(atendimentoId!);
        if (!ativo) return;
        if (atendimento.atendimento?.pagamento_status === 'confirmado') {
          setStatus('Pagamento confirmado');
          setCartaoPendente(false);
          ativo = false;
          onPagamentoConfirmado(atendimentoId!);
          return;
        }
        setStatus('Cartão recebido · aguardando confirmação da Efí…');
      } catch {
        if (ativo) setStatus('Aguardando confirmação da Efí…');
      } finally {
        checando = false;
      }
    }

    verificarCartao();
    const timer = setInterval(verificarCartao, 3000);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [cartaoPendente, atendimentoId, onPagamentoConfirmado]);

  async function gerarPix() {
    if (loading || pixCode) return;
    if (pagadorCpf.length !== 11) {
      Alert.alert('CPF do pagador', 'Seu perfil precisa ter um CPF válido para gerar o PIX.');
      return;
    }
    setLoading(true);
    setStatus('Criando atendimento…');
    try {
      const id = await garantirAtendimento();
      setStatus('Gerando PIX…');
      const pix = await gerarPixConsulta({
        atendimentoId: id,
        pagadorNome: pacienteLogado.nome,
        pagadorCpf,
        pagadorEmail: pacienteLogado.email || undefined,
        pacienteNome,
        pacienteCpf: digits(pacienteCpf),
        atendimentoParaTerceiro,
      });
      if (!pix.order_id || !pix.qr_code_text) throw new Error('O PagBank não retornou o código PIX.');
      await vincularPixAoAtendimento(id, pix.order_id);
      setOrderId(pix.order_id);
      setPixCode(pix.qr_code_text);
      setValor(pix.valor);
      setStatus('Aguardando pagamento…');
    } catch (error) {
      setStatus('');
      Alert.alert('Não foi possível gerar o PIX', error instanceof Error ? error.message : 'Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }

  async function processarTokenCartao(payload: {
    paymentToken: string;
    cardMask?: string;
    holderName: string;
    holderDocument: string;
  }) {
    if (loading || cartaoPendente) return;
    if (!pacienteLogado.email || !/^\S+@\S+\.\S+$/.test(pacienteLogado.email)) {
      Alert.alert('E-mail necessário', 'Seu cadastro precisa ter um e-mail válido para pagamento no cartão.');
      setCartaoFormKey((v) => v + 1);
      return;
    }
    if (telefoneContato.length < 10 || telefoneContato.length > 11) {
      Alert.alert('Celular necessário', 'Seu cadastro precisa ter um celular válido com DDD.');
      setCartaoFormKey((v) => v + 1);
      return;
    }

    setLoading(true);
    setStatus('Processando cartão com a Efí…');
    try {
      const id = await garantirAtendimento();
      const resposta = await cobrarCartaoConsulta({
        atendimentoId: id,
        paymentToken: payload.paymentToken,
        pagadorNome: payload.holderName,
        pagadorCpf: digits(payload.holderDocument),
        pagadorEmail: pacienteLogado.email,
        telefone: telefoneContato,
        nascimento: pacienteNascimento,
        parcelas: 1,
        pacienteNome,
        pacienteCpf: digits(pacienteCpf),
        atendimentoParaTerceiro,
      });
      setCartaoMask(payload.cardMask || '');
      if (resposta.status === 'paid' || resposta.status === 'approved') {
        setStatus('Pagamento confirmado');
        onPagamentoConfirmado(id);
        return;
      }
      if (resposta.ok && resposta.status === 'waiting') {
        setCartaoPendente(true);
        setStatus('Cartão recebido · aguardando confirmação da Efí…');
        return;
      }
      throw new Error('O pagamento não foi aprovado.');
    } catch (error) {
      setStatus('');
      setCartaoPendente(false);
      setCartaoFormKey((v) => v + 1);
      Alert.alert('Pagamento não concluído', error instanceof Error ? error.message : 'Confira os dados do cartão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function copiarPix() {
    if (!pixCode) return;
    await Clipboard.setStringAsync(pixCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  }

  async function verificarAgora() {
    if (!atendimentoId) return;
    setStatus('Verificando pagamento…');
    try {
      if (orderId) {
        const pix = await consultarStatusPix(orderId);
        if (pix.pago) {
          setStatus('Pagamento confirmado');
          onPagamentoConfirmado(atendimentoId);
          return;
        }
      }
      const atendimento = await consultarStatusAtendimento(atendimentoId);
      if (atendimento.atendimento?.pagamento_status === 'confirmado') {
        setStatus('Pagamento confirmado');
        onPagamentoConfirmado(atendimentoId);
        return;
      }
      setStatus('Ainda aguardando confirmação…');
    } catch {
      setStatus('Não foi possível verificar agora. Tentaremos automaticamente.');
    }
  }

  const bloqueado = loading || cartaoPendente || !!pixCode;

  return (
    <View>
      <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>PAGAMENTO SEGURO</Text></View>
      <Text style={styles.title}>Finalize sua consulta</Text>
      <Text style={styles.lead}>Assim que o pagamento for confirmado, o app libera uma triagem rápida antes de entrar na fila médica.</Text>

      <View style={styles.patientCard}>
        <Text style={styles.patientLabel}>PACIENTE</Text>
        <Text style={styles.patientName}>{pacienteNome}</Text>
        {atendimentoParaTerceiro ? <Text style={styles.patientHint}>O titular do pagamento pode ser diferente do paciente.</Text> : null}
      </View>

      {!pixCode && !cartaoPendente ? (
        <>
          <View style={styles.tabs}>
            <Pressable onPress={() => setMetodo('pix')} style={[styles.tab, metodo === 'pix' && styles.tabActive]}>
              <Text style={[styles.tabText, metodo === 'pix' && styles.tabTextActive]}>PIX</Text>
              <Text style={styles.tabHint}>PagBank</Text>
            </Pressable>
            <Pressable onPress={() => setMetodo('cartao')} style={[styles.tab, metodo === 'cartao' && styles.tabActive]}>
              <Text style={[styles.tabText, metodo === 'cartao' && styles.tabTextActive]}>Cartão</Text>
              <Text style={styles.tabHint}>Efí</Text>
            </Pressable>
          </View>

          {metodo === 'pix' ? (
            <View style={styles.methodCard}>
              <View style={styles.methodHeader}>
                <View>
                  <Text style={styles.methodTitle}>PIX</Text>
                  <Text style={styles.methodSubtitle}>QR Code + copia e cola</Text>
                </View>
                <View style={styles.recommended}><Text style={styles.recommendedText}>RECOMENDADO</Text></View>
              </View>
              <Text style={styles.methodText}>Geração pelo PagBank e confirmação automática após o pagamento.</Text>
              <Pressable onPress={gerarPix} disabled={loading} style={[styles.primaryButton, loading && { opacity: .65 }]}>
                {loading ? <ActivityIndicator color="#07100f" /> : <Text style={styles.primaryButtonText}>Gerar PIX</Text>}
              </Pressable>
            </View>
          ) : (
            <View style={styles.methodCard}>
              <View style={styles.methodHeader}>
                <View>
                  <Text style={styles.methodTitle}>Cartão de crédito</Text>
                  <Text style={styles.methodSubtitle}>Processamento seguro pela Efí</Text>
                </View>
                <View style={styles.secureBadge}><Text style={styles.secureBadgeText}>TOKENIZADO</Text></View>
              </View>
              <Text style={styles.methodText}>Os dados sensíveis ficam dentro do ambiente de tokenização da Efí. O servidor recebe somente o token do cartão.</Text>
              <EfiCardForm
                key={cartaoFormKey}
                holderName={pacienteLogado.nome}
                holderDocument={pagadorCpf}
                disabled={bloqueado}
                onToken={processarTokenCartao}
                onError={(message) => Alert.alert('Cartão', message)}
              />
              {loading ? <View style={styles.inlineStatus}><ActivityIndicator color="#16c783" /><Text style={styles.statusText}>{status || 'Processando…'}</Text></View> : null}
            </View>
          )}

          <Pressable onPress={onVoltar} style={styles.backLink}><Text style={styles.backLinkText}>Voltar</Text></Pressable>
        </>
      ) : pixCode ? (
        <View style={styles.pixCard}>
          <Text style={styles.pixEyebrow}>PAGAMENTO VIA PIX</Text>
          <Text style={styles.pixValue}>{formatarValor(valor)}</Text>
          <Text style={styles.pixInstruction}>Abra o app do seu banco e escaneie o QR Code ou copie o código abaixo.</Text>
          <View style={styles.qrWrap}><QRCode value={pixCode} size={205} quietZone={10} /></View>
          <Pressable onPress={copiarPix} style={styles.copyButton}><Text style={styles.copyButtonText}>{copiado ? '✓ Código copiado' : 'Copiar código PIX'}</Text></Pressable>
          <View style={styles.codeBox}><Text numberOfLines={3} style={styles.codeText}>{pixCode}</Text></View>
          <View style={styles.statusRow}><ActivityIndicator size="small" color="#16c783" /><Text style={styles.statusText}>{status || 'Aguardando pagamento…'}</Text></View>
          <Pressable onPress={verificarAgora} style={styles.verifyButton}><Text style={styles.verifyText}>Já paguei · verificar agora</Text></Pressable>
          <Text style={styles.safeText}>Assim que o PagBank confirmar, a triagem será liberada automaticamente. Você não precisará pagar novamente.</Text>
        </View>
      ) : (
        <View style={styles.cardWaiting}>
          <View style={styles.waitingIcon}><Text style={styles.waitingIconText}>✓</Text></View>
          <Text style={styles.waitingTitle}>Cartão enviado para análise</Text>
          <Text style={styles.waitingText}>{cartaoMask ? `Cartão ${cartaoMask}. ` : ''}A Efí está concluindo a confirmação. Esta tela avança automaticamente quando o pagamento for aprovado.</Text>
          <View style={styles.statusRow}><ActivityIndicator size="small" color="#16c783" /><Text style={styles.statusText}>{status || 'Aguardando confirmação da Efí…'}</Text></View>
          <Pressable onPress={verificarAgora} style={styles.verifyButton}><Text style={styles.verifyText}>Verificar agora</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepBadge: { alignSelf: 'flex-start', backgroundColor: '#123027', borderWidth: 1, borderColor: '#285746', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, marginBottom: 14 },
  stepBadgeText: { color: '#78f25f', fontSize: 10, fontWeight: '900', letterSpacing: .7 },
  title: { color: '#fff', fontSize: 27, fontWeight: '800', letterSpacing: -.5, marginBottom: 9 },
  lead: { color: '#a9b5b0', lineHeight: 21, marginBottom: 18 },
  patientCard: { backgroundColor: '#f7fbf8', borderRadius: 17, padding: 16, marginBottom: 14 },
  patientLabel: { color: '#18724f', fontSize: 10, fontWeight: '900', letterSpacing: .8 },
  patientName: { color: '#14201d', fontSize: 17, fontWeight: '800', marginTop: 6 },
  patientHint: { color: '#66736e', fontSize: 12, lineHeight: 17, marginTop: 5 },
  tabs: { flexDirection: 'row', gap: 9, marginBottom: 10 },
  tab: { flex: 1, borderRadius: 15, borderWidth: 1, borderColor: '#1d342f', backgroundColor: '#0b1715', paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderColor: '#16c783', backgroundColor: '#0f211c' },
  tabText: { color: '#a9b5b0', fontWeight: '900', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  tabHint: { color: '#71807b', fontSize: 10.5, marginTop: 2 },
  methodCard: { backgroundColor: '#0b1715', borderWidth: 1, borderColor: '#285746', borderRadius: 19, padding: 17 },
  methodHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  methodTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  methodSubtitle: { color: '#8a97a6', fontSize: 12, marginTop: 3 },
  recommended: { backgroundColor: '#123027', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  recommendedText: { color: '#78f25f', fontSize: 9, fontWeight: '900', letterSpacing: .5 },
  secureBadge: { backgroundColor: '#10201d', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  secureBadgeText: { color: '#78f25f', fontSize: 9, fontWeight: '900', letterSpacing: .5 },
  methodText: { color: '#a9b5b0', fontSize: 12.5, lineHeight: 19, marginTop: 15, marginBottom: 10 },
  primaryButton: { minHeight: 54, backgroundColor: '#16c783', borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryButtonText: { color: '#07100f', fontSize: 16, fontWeight: '900' },
  backLink: { alignItems: 'center', paddingVertical: 17 },
  backLinkText: { color: '#71807b', fontSize: 13, fontWeight: '700' },
  pixCard: { backgroundColor: '#0b1715', borderWidth: 1, borderColor: '#285746', borderRadius: 21, padding: 18, alignItems: 'center' },
  pixEyebrow: { color: '#78f25f', fontSize: 10, fontWeight: '900', letterSpacing: .9 },
  pixValue: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 7 },
  pixInstruction: { color: '#a9b5b0', fontSize: 12.5, textAlign: 'center', lineHeight: 18, marginTop: 7, marginBottom: 16 },
  qrWrap: { backgroundColor: '#fff', padding: 8, borderRadius: 16 },
  copyButton: { alignSelf: 'stretch', minHeight: 50, borderRadius: 14, backgroundColor: '#16c783', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  copyButtonText: { color: '#07100f', fontWeight: '900', fontSize: 14 },
  codeBox: { alignSelf: 'stretch', backgroundColor: '#101d1a', borderRadius: 12, borderWidth: 1, borderColor: '#223a34', padding: 11, marginTop: 9 },
  codeText: { color: '#84908c', fontSize: 10.5, lineHeight: 15 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 17 },
  inlineStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  statusText: { color: '#d6dfdb', fontSize: 12.5, fontWeight: '700' },
  verifyButton: { paddingVertical: 13, paddingHorizontal: 8 },
  verifyText: { color: '#16c783', fontSize: 12.5, fontWeight: '800' },
  safeText: { color: '#71807b', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 1 },
  cardWaiting: { backgroundColor: '#0b1715', borderWidth: 1, borderColor: '#285746', borderRadius: 21, padding: 20, alignItems: 'center' },
  waitingIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#123027', alignItems: 'center', justifyContent: 'center' },
  waitingIconText: { color: '#78f25f', fontSize: 24, fontWeight: '900' },
  waitingTitle: { color: '#fff', fontSize: 19, fontWeight: '900', marginTop: 13 },
  waitingText: { color: '#a9b5b0', fontSize: 12.5, lineHeight: 19, textAlign: 'center', marginTop: 7 },
});