import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

type Props = {
  publishableKey: string;
  clientSecret: string;
  email: string;
  onCheck: () => void;
  onError: (message: string) => void;
};

function safeJson(value: string) {
  return JSON.stringify(String(value || '')).replace(/</g, '\\u003c');
}

export default function StripeCardForm({ publishableKey, clientSecret, email, onCheck, onError }: Props) {
  const html = useMemo(() => `<!doctype html><html lang="pt-BR"><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
<script src="https://js.stripe.com/endive/stripe.js"></script>
<style>html,body{margin:0;padding:0;background:#0b1715;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}label{display:block;font-size:12px;color:#d6dfdb;font-weight:700;margin:13px 0 6px}input{width:100%;min-height:46px;border:1px solid #285746;border-radius:12px;background:#101d1a;color:white;font-size:16px;padding:0 12px}button{width:100%;height:52px;background:#16c783;color:#07100f;border:0;border-radius:14px;font-size:16px;font-weight:800;margin-top:17px}button:disabled{opacity:.5}#error{color:#ff9da5;font-size:12px;line-height:18px;margin-top:10px}#message{font-size:12px;color:#afc5ba;margin:8px 0 12px}</style></head><body>
<label for="email">E-mail para confirmação do pagamento</label><input id="email" type="email" autocomplete="email" inputmode="email" placeholder="seu@email.com" required />
<div id="message">Carregando pagamento seguro…</div><div id="payment-element"></div><div id="error"></div><button id="pay" disabled>Confirmar pagamento</button>
<script>
const KEY=${safeJson(publishableKey)},SECRET=${safeJson(clientSecret)},EMAIL=${safeJson(email)};
const input=document.getElementById('email'),button=document.getElementById('pay'),error=document.getElementById('error'),message=document.getElementById('message');
input.value=EMAIL;
function post(obj){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(obj))}
function showError(text){error.textContent=text||'Não foi possível confirmar. Tente novamente.'}
(async()=>{try{
 const checkout=Stripe(KEY).initCheckoutElementsSdk({clientSecret:Promise.resolve(SECRET),elementsOptions:{appearance:{theme:'night',variables:{colorPrimary:'#16c783',colorBackground:'#0b1715',colorText:'#ffffff',colorDanger:'#ff8484',borderRadius:'10px'}}}});
 checkout.createPaymentElement().mount('#payment-element');
 const loaded=await checkout.loadActions();if(!loaded||!loaded.actions)throw new Error('Formulário de pagamento indisponível.');
 const actions=loaded.actions;message.textContent='Dados do cartão protegidos pela Stripe.';button.disabled=false;
 button.addEventListener('click',async()=>{if(button.disabled)return;error.textContent='';const email=input.value.trim();if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)){showError('Informe um e-mail válido.');input.focus();return}
 button.disabled=true;button.textContent='Processando pagamento…';
 try{const result=await actions.confirm({email});if(result&&result.type==='error'){showError(result.error&&result.error.message);post({type:'error',message:result.error&&result.error.message||'Cartão não aprovado.'})}else{message.textContent='Aguardando confirmação do pagamento…';post({type:'check'})}}
 catch(e){showError(e.message);post({type:'error',message:e.message})}
 finally{button.disabled=false;button.textContent='Confirmar pagamento'}
 });
 }catch(e){showError(e.message);message.textContent='Não foi possível carregar o cartão.';post({type:'error',message:e.message})}})();
</script></body></html>`, [publishableKey, clientSecret, email]);

  function onMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'check') onCheck();
      if (data.type === 'error') onError(String(data.message || 'Pagamento não concluído.'));
    } catch { /* Mensagem não reconhecida. */ }
  }

  return <View style={styles.container}><WebView source={{ html, baseUrl: 'https://consultaja24h.com.br' }} originWhitelist={['https://*']} javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false} onMessage={onMessage} onShouldStartLoadWithRequest={(request) => {
    if (request.url.includes('stripe_return=1') && request.url.includes('session_id=')) { onCheck(); return false; }
    return true;
  }} onError={() => onError('Não foi possível carregar o formulário seguro da Stripe.')} style={styles.webview} nestedScrollEnabled scrollEnabled /></View>;
}

const styles = StyleSheet.create({ container: { minHeight: 430, overflow: 'hidden' }, webview: { flex: 1, minHeight: 430, backgroundColor: '#0b1715' } });
