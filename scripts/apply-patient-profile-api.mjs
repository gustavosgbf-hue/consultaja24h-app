import fs from 'node:fs';

const typesPath = 'src/types.ts';
const clientPath = 'src/api/client.ts';
let types = fs.readFileSync(typesPath, 'utf8');
let client = fs.readFileSync(clientPath, 'utf8');

if (!types.includes('data_nascimento?: string | null;')) {
  types = types.replace('  tel?: string | null;\n};', '  tel?: string | null;\n  data_nascimento?: string | null;\n};');
}

if (!client.includes('export async function completarPerfilPaciente(')) {
  client = client.replace(
    "export async function carregarPaciente() {\n  return authenticatedFetch<{ ok: boolean; paciente: Paciente }>('/api/paciente/me');\n}\n",
    "export async function carregarPaciente() {\n  return authenticatedFetch<{ ok: boolean; paciente: Paciente }>('/api/paciente/me');\n}\n\nexport async function completarPerfilPaciente(nome: string, dataNascimento: string) {\n  return postJson<{ ok: boolean; paciente: Paciente }>(\n    '/api/paciente/perfil-completar',\n    { nome, data_nascimento: dataNascimento },\n    true,\n  );\n}\n"
  );
}

fs.writeFileSync(typesPath, types);
fs.writeFileSync(clientPath, client);
console.log('Patient profile API patch applied.');
