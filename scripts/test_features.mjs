import { readFileSync } from 'fs';
import { formatBytes } from '../src/utils/storage.js';
import { translateActivityText } from '../src/utils/activityI18n.js';

const pt = JSON.parse(readFileSync('./src/locales/pt.json', 'utf8'));
const es = JSON.parse(readFileSync('./src/locales/es.json', 'utf8'));

console.log('=== TESTE 1: Paridade das traduções PT e ES ===');
function compareKeys(obj1, obj2, prefix = '') {
  let missing = [];
  for (const k of Object.keys(obj1)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (!(k in obj2)) {
      missing.push(fullKey);
    } else if (typeof obj1[k] === 'object' && obj1[k] !== null) {
      missing = missing.concat(compareKeys(obj1[k], obj2[k], fullKey));
    }
  }
  return missing;
}

const missingInEs = compareKeys(pt, es);
const missingInPt = compareKeys(es, pt);

if (missingInEs.length === 0 && missingInPt.length === 0) {
  console.log('✔ Paridade de chaves 100% perfeita entre pt.json e es.json');
} else {
  console.error('❌ Chaves faltando em ES:', missingInEs);
  console.error('❌ Chaves faltando em PT:', missingInPt);
  process.exit(1);
}

console.log('\n=== TESTE 2: Vocabulário Sul-Americano exigido ===');
const termsToCheck = [
  { path: 'editor.saveAs', expected: 'Guardar como' },
  { path: 'dashboard.newProject', expected: 'Nuevo Proyecto' },
  { path: 'dashboard.newFolder', expected: 'Nueva Carpeta' },
  { path: 'sidebar.fontSize', expected: 'Tamaño de fuente' },
  { path: 'sidebar.textAlignment', expected: 'Alineación' },
  { path: 'sidebar.bordersAndShapes', expected: 'ESQUINAS Y BORDES' },
  { path: 'settings.title', expected: 'Configuraciones' },
  { path: 'common.back', expected: 'Volver' },
  { path: 'activity.title', expected: 'Historial reciente' }
];

for (const { path, expected } of termsToCheck) {
  const parts = path.split('.');
  let val = es;
  for (const p of parts) val = val?.[p];
  if (val === expected) {
    console.log(`✔ [${path}]: "${val}" confere com o vocabulário especificado.`);
  } else {
    console.error(`❌ [${path}]: Esperado "${expected}", obtido "${val}"`);
    process.exit(1);
  }
}

console.log('\n=== TESTE 3: Utilitários de Storage e Formatação ===');
console.log('formatBytes(0) ->', formatBytes(0), 'Expected: 0.0 KB');
console.log('formatBytes(145920) ->', formatBytes(145920), 'Expected: 142.5 KB');
console.log('formatBytes(2411724) ->', formatBytes(2411724), 'Expected: 2.3 MB');

if (
  formatBytes(0) === '0.0 KB' &&
  formatBytes(145920) === '142.5 KB' &&
  formatBytes(2411724) === '2.3 MB'
) {
  console.log('✔ Formatação de bytes opera com precisão exata.');
} else {
  console.error('❌ Falha na formatação de bytes');
  process.exit(1);
}

console.log('\n=== TESTE 4: Tradução dinâmica de atividades ===');
const samplePt = "Criou a pasta 'Design System'";
const sampleEs = translateActivityText(samplePt, 'es');
console.log(`PT: "${samplePt}" -> ES: "${sampleEs}"`);
if (sampleEs === "Creó la carpeta 'Design System'") {
  console.log('✔ Tradução dinâmica de atividade PT -> ES confirmada');
} else {
  console.error('❌ Falha na tradução de atividade');
  process.exit(1);
}

console.log('\n=== TESTE 5: Perfil do Usuário e Chaves ===');
import('../src/utils/storage.js').then(({ FOUX_STORAGE_KEYS }) => {
  if (FOUX_STORAGE_KEYS.includes('foux_user_profile')) {
    console.log('✔ Chave foux_user_profile registrada em FOUX_STORAGE_KEYS');
  } else {
    console.error('❌ Chave foux_user_profile AUSENTE em FOUX_STORAGE_KEYS');
    process.exit(1);
  }

  if (pt.profile?.title && es.profile?.title && es.profile?.foldersCount && pt.profile?.foldersCount) {
    console.log('✔ Estruturas i18n de perfil presentes em pt.json e es.json');
  } else {
    console.error('❌ Estruturas i18n de perfil ausentes');
    process.exit(1);
  }

  console.log('\nTODOS OS TESTES AUTOMATIZADOS PASSARAM COM SUCESSO! 🚀');
});

