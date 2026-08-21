import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

const EFI_PAYEE_CODE = 'b241c1c1aa59c7a663f8360ac1d05b52';

type TokenPayload = {
  paymentToken: string;
  cardMask?: string;
  holderName: string;
  holderDocument: string;
};

type Props = {
  holderName: string;
  holderDocument: string;
  disabled?: boolean;
  onToken: (payload: TokenPayload) => void;
  onError: (message: string) => void;
};

function safeJson(value: string) {
  return JSON.stringify(String(value || '')).replace(/</g, '\\u003c');
}

export default function EfiCardForm({ holderName, holderDocument, disabled, onToken, onError }: Props) {
  const html = useMemo(() => {
    const nome = safeJson(holderName);
    const cpf = safeJson(holderDocument.replace(/\D/g, ''));
    const payee = safeJson(EFI_PAYEE_CODE);

    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<script src="https://cdn.jsdelivr.net/gh/efipay/js-payment-token-efi/dist/payment-token-efi-umd.min.js"></script>
<style>
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#0b1715;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{padding:2px}.field{margin-bottom:11px}.label{display:block;color:#d6dfdb;font-size:12px;font-weight:700;margin-bottom:6px}.input{width:100%;height:48px;border:1px solid #223a34;border-radius:13px;background:#101d1a;color:#fff;padding:0 13px;font-size:16px;outline:none}.input:focus{border-color:#16c783}.row{display:flex;gap:9px}.row .field{flex:1}.button{width:100%;height:52px;border:0;border-radius:14px;background:#16c783;color:#07100f;font-size:16px;font-weight:800;margin-top:3px;display:flex;align-items:center;justify-content:center;line-height:20px;padding:0 16px}.button:disabled{opacity:.5}.hint{color:#71807b;font-size:11px;line-height:16px;text-align:center;margin:10px 8px 0}.error{display:none;color:#ff9ca5;font-size:12px;line-height:17px;margin:0 2px 10px}.error.show{display:block}
</style>
</head>
<body>
<div id="error" class="error"></div>
<div class="field"><label class="label">Nome impresso no cartão</label><input id="name" class="input" autocomplete="cc-name" /></div>
<div class="field"><label class="label">CPF do titular do cartão</label><input id="cpf" class="input" inputmode="numeric" maxlength="14" /></div>
<div class="field"><label class="label">Número do cartão</label><input id="number" class="input" inputmode="numeric" autocomplete="cc-number" maxlength="23" placeholder="0000 0000 0000 0000" /></div>
<div class="row">
  <div class="field"><label class="label">Validade</label><input id="expiry" class="input" inputmode="numeric" autocomplete="cc-exp" maxlength="7" placeholder="MM/AAAA" /></div>
  <div class="field"><label class="label">CVV</label><input id="cvv" class="input" inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="123" /></div>
</div>
<button id="pay" class="button">Pagar com cartão</button>
<div class="hint">Os dados do cartão são tokenizados pela Efí nesta tela e não são enviados ao servidor do ConsultaJá24h.</div>
<script>
const PAYEE=${payee};
const initialName=${nome};
const initialCpf=${cpf};
const $=id=>document.getElementById(id);
$('name').value=initialName;
$('cpf').value=initialCpf;
function digits(v){return String(v||'').replace(/\\D/g,'')}
function post(obj){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(obj))}
function showError(msg){const el=$('error');el.textContent=msg;el.className='error show'}
function clearError(){const el=$('error');el.textContent='';el.className='error'}
function brand(n){
  if(/^4/.test(n))return 'visa';
  if(/^(5[1-5]|2[2-7])/.test(n))return 'mastercard';
  if(/^3[47]/.test(n))return 'amex';
  if(/^(301|305|36|38)/.test(n))return 'diners';
  if(/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(n))return 'elo';
  return '';
}
$('number').addEventListener('input',e=>{const d=digits(e.target.value).slice(0,19);e.target.value=d.replace(/(.{4})/g,'$1 ').trim()});
$('cpf').addEventListener('input',e=>{const d=digits(e.target.value).slice(0,11);e.target.value=d.length>9?d.replace(/(\\d{3})(\\d{3})(\\d{3})(\\d{1,2})/,'$1.$2.$3-$4'):d});
$('expiry').addEventListener('input',e=>{const d=digits(e.target.value).slice(0,6);e.target.value=d.length>2?d.slice(0,2)+'/'+d.slice(2):d});
$('pay').addEventListener('click',async()=>{
  clearError();
  const button=$('pay');
  const holderName=$('name').value.trim();
  const holderDocument=digits($('cpf').value);
  const number=digits($('number').value);
  const cvv=digits($('cvv').value);
  const exp=digits($('expiry').value);
  const expirationMonth=exp.slice(0,2);
  const expirationYear=exp.slice(2);
  const detected=brand(number);
  if(holderName.length<3)return showError('Informe o nome do titular do cartão.');
  if(holderDocument.length!==11)return showError('Informe um CPF válido do titular.');
  if(number.length<13||!detected)return showError('Confira o número e a bandeira do cartão.');
  if(expirationMonth.length!==2||expirationYear.length!==4)return showError('Informe a validade no formato MM/AAAA.');
  if(cvv.length<3)return showError('Confira o CVV.');
  if(typeof EfiPay==='undefined'){const m='Não foi possível carregar a segurança da Efí. Confira sua conexão.';showError(m);post({type:'error',message:m});return}
  button.disabled=true;button.textContent='Protegendo dados…';
  try{
    const result=await EfiPay.CreditCard.setAccount(PAYEE).setEnvironment('production').setCreditCardData({
      brand:detected,number,cvv,expirationMonth,expirationYear,holderName,holderDocument,reuse:false
    }).getPaymentToken();
    if(!result||!result.payment_token)throw new Error('A Efí não retornou o token do cartão.');
    $('number').value='';$('cvv').value='';$('expiry').value='';
    post({type:'token',paymentToken:result.payment_token,cardMask:result.card_mask||'',holderName,holderDocument});
    button.textContent='Processando pagamento…';
  }catch(err){
    const message=err&&err.error_description?err.error_description:(err&&err.message?err.message:'Não foi possível validar o cartão.');
    showError(message);post({type:'error',message});button.disabled=false;button.textContent='Pagar com cartão';
  }
});
window.addEventListener('message',e=>{if(e.data==='reset'){const b=$('pay');b.disabled=false;b.textContent='Pagar com cartão'}});
</script>
</body></html>`;
  }, [holderName, holderDocument]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data || '{}');
      if (data.type === 'token' && data.paymentToken) {
        onToken({
          paymentToken: String(data.paymentToken),
          cardMask: data.cardMask ? String(data.cardMask) : undefined,
          holderName: String(data.holderName || '').trim(),
          holderDocument: String(data.holderDocument || '').replace(/\D/g, ''),
        });
      } else if (data.type === 'error') {
        onError(String(data.message || 'Não foi possível validar o cartão.'));
      }
    } catch {
      onError('Não foi possível ler a resposta segura do cartão.');
    }
  }

  return (
    <View style={[styles.wrap, disabled && styles.disabled]} pointerEvents={disabled ? 'none' : 'auto'}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://consultaja24h.com.br' }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled={false}
        setSupportMultipleWindows={false}
        mixedContentMode="never"
        style={styles.webview}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 410, overflow: 'hidden', borderRadius: 14, backgroundColor: '#0b1715' },
  webview: { flex: 1, backgroundColor: '#0b1715' },
  disabled: { opacity: 0.6 },
});
