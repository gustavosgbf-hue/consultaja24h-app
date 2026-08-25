import fs from 'fs';

const path = 'App.tsx';
let src = fs.readFileSync(path, 'utf8');

const replacements = [
  [
    "  formCard: { backgroundColor: themeColor('#e9f0ec', '#0b1715'), borderRadius: 18, padding: 16, marginBottom: 22 },",
    "  formCard: { backgroundColor: themeColor('#e9f0ec', '#0b1715'), borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 18 },"
  ],
  [
    "  inputLabelDark: { color: '#d6dfdb', fontSize: 12.5, fontWeight: '700', marginBottom: 7 },",
    "  inputLabelDark: { color: themeColor('#34413d', '#d6dfdb'), fontSize: 12.5, fontWeight: '700', marginBottom: 6 },"
  ],
  [
    "  darkInput: { backgroundColor: themeColor('#dfe8e3', '#101d1a'), borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 13, color: themeColor('#14201d', '#fff'), fontSize: 15 },",
    "  darkInput: { backgroundColor: themeColor('#dfe8e3', '#101d1a'), borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 11, color: themeColor('#14201d', '#fff'), fontSize: 15 },"
  ],
  [
    "  identityMeta: { color: '#66736e', fontSize: 12.5, marginTop: 4 },",
    "  identityMeta: { color: themeColor('#52615c', '#81908a'), fontSize: 12.5, fontWeight: '500', marginTop: 5 },"
  ],
];

for (const [before, after] of replacements) {
  if (src.includes(before)) src = src.replace(before, after);
  else if (!src.includes(after)) throw new Error(`Trecho não encontrado: ${before}`);
}

fs.writeFileSync(path, src);
console.log('Personal data visual polish applied.');
