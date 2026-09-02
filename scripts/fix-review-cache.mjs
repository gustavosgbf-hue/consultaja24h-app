import fs from 'node:fs';

const path = 'src/api/client.ts';
let s = fs.readFileSync(path, 'utf8');

const oldAuth = `async function authenticatedFetch<T>(path: string): Promise<T> {
  const token = await getSessionToken();
  if (!token) throw new Error('Sessão não encontrada');

  const response = await fetch(\`${'${API_BASE_URL}${path}'}\`, {
    headers: { Authorization: \`Bearer ${'${token}'}\` },
  });

  if (response.status === 401) throw new Error('Sessão expirada');
  return parseJson<T>(response);
}`;
const newAuth = `async function authenticatedFetch<T>(path: string): Promise<T> {
  const token = await getSessionToken();
  if (!token) throw new Error('Sessão não encontrada');

  const separator = path.includes('?') ? '&' : '?';
  const url = \`${'${API_BASE_URL}${path}${separator}'}_ts=${'${Date.now()}'}\`;
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      Authorization: \`Bearer ${'${token}'}\`,
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
    },
  });

  if (response.status === 401) throw new Error('Sessão expirada');
  return parseJson<T>(response);
}`;
if (!s.includes(oldAuth)) throw new Error('authenticatedFetch snippet not found');
s = s.replace(oldAuth, newAuth);

const oldPix = `export async function consultarStatusPix(orderId: string) {
  const response = await fetch(\`${'${API_BASE_URL}'}/api/pagbank/order/${'${encodeURIComponent(orderId)}'}\`);
  return parseJson<StatusPagBankResponse>(response);
}`;
const newPix = `export async function consultarStatusPix(orderId: string) {
  const response = await fetch(\`${'${API_BASE_URL}'}/api/pagbank/order/${'${encodeURIComponent(orderId)}'}?_ts=${'${Date.now()}'}\`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache' },
  });
  return parseJson<StatusPagBankResponse>(response);
}`;
if (!s.includes(oldPix)) throw new Error('consultarStatusPix snippet not found');
s = s.replace(oldPix, newPix);

const oldStatus = `export async function consultarStatusAtendimento(atendimentoId: number) {
  const response = await fetch(\`${'${API_BASE_URL}'}/api/atendimento/status/${'${atendimentoId}'}\`);`;
const newStatus = `export async function consultarStatusAtendimento(atendimentoId: number) {
  const response = await fetch(\`${'${API_BASE_URL}'}/api/atendimento/status/${'${atendimentoId}'}?_ts=${'${Date.now()}'}\`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache' },
  });`;
if (!s.includes(oldStatus)) throw new Error('consultarStatusAtendimento snippet not found');
s = s.replace(oldStatus, newStatus);

fs.writeFileSync(path, s);
console.log('Review cache patch applied.');
