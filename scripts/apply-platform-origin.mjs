import fs from 'node:fs';

const path = 'src/api/client.ts';
let s = fs.readFileSync(path, 'utf8');

if (!s.includes("import { Platform } from 'react-native';")) {
  const marker = "import { getSessionToken } from '../auth/session';\n";
  if (!s.includes(marker)) throw new Error('client import marker not found');
  s = s.replace(marker, "import { Platform } from 'react-native';\n" + marker);
}

const headerLine = "  const headers: Record<string, string> = { 'Content-Type': 'application/json' };\n";
const platformLine = "  headers['X-ConsultaJa-Platform'] = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';\n";
if (!s.includes(platformLine)) {
  if (!s.includes(headerLine)) throw new Error('postJson headers marker not found');
  s = s.replace(headerLine, headerLine + platformLine);
}

s = s.replace("    origem: 'app_paciente',\n", "    origem: `app_${Platform.OS}`,\n");

fs.writeFileSync(path, s);
console.log('Platform origin tracking applied to app client.');
