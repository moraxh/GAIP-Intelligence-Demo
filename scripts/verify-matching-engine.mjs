// Verifica el motor de cruce fuzzy (lib/matching-engine.ts) contra dos casos de prueba
// obligatorios: un positivo real (el caso "Tramo III" ya presente en lib/mock-data.ts,
// reportado por dos fuentes con IDs distintos) y un negativo inventado a propósito para
// este script ("Tramo II" trampa: nombre casi idéntico a Tramo III, misma dependencia,
// fecha cercana, pero SIN número de procedimiento) — prueba que el motor no cruza por
// error dos tramos distintos del mismo macroproyecto solo por parecido de texto.
//
// El proyecto trampa vive únicamente aquí, no en lib/mock-data-finanzas-obra.ts, para no
// ensuciar los datos ilustrativos del demo con un caso sintético de prueba.
//
// Uso: node scripts/verify-matching-engine.mjs

import { licitaciones } from '../lib/mock-data.ts';
import { scoreMatch, MATCH_THRESHOLD } from '../lib/matching-engine.ts';

let failed = false;

function assert(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`❌ FALLÓ: ${message}`);
  } else {
    console.log(`✅ ${message}`);
  }
}

// --- Caso positivo: Tramo III real, dos fuentes distintas del mismo expediente ---
const tramoIIIFuenteXLS = licitaciones.find((l) => l.id === 'XLS-LO09JZO009JZO001N342026');
const tramoIIIFuenteComprasMX = licitaciones.find((l) => l.id === 'E-2026-00080086');

if (!tramoIIIFuenteXLS || !tramoIIIFuenteComprasMX) {
  console.error('❌ No se encontraron los registros reales de Tramo III en lib/mock-data.ts — el caso de prueba ya no aplica, revisar datos.');
  process.exit(1);
}

const proyectoTramoIIIReal = {
  id: 'test-tramo-iii-real',
  name: tramoIIIFuenteComprasMX.nombre,
  client: tramoIIIFuenteComprasMX.dependencia,
  numeroProcedimiento: tramoIIIFuenteComprasMX.numero,
  contractStart: '20 oct 2026', // hipotético: ~20 días después del fallo real (30 sep 2026)
};

const resultadoPositivo = scoreMatch(tramoIIIFuenteXLS, proyectoTramoIIIReal);
console.log('\n--- Caso positivo: Tramo III (dos fuentes reales, mismo expediente) ---');
console.log(`Score: ${resultadoPositivo.score.toFixed(4)}`);
resultadoPositivo.signals.forEach((s) => console.log(`  ${s.name}: ${s.score.toFixed(2)} (peso ${s.weight}) — ${s.detail}`));
assert(resultadoPositivo.score >= MATCH_THRESHOLD, `Tramo III debe cruzar (score ${resultadoPositivo.score.toFixed(4)} >= ${MATCH_THRESHOLD})`);

// --- Caso negativo: "Tramo II" trampa, sin numero, parecido a Tramo III ---
const proyectoTramoIITrampa = {
  id: 'test-tramo-ii-trampa',
  name: 'Supervisión, Control Y Seguimiento De La Construcción Y Diseño De 93 Km Tramo II',
  client: 'ATTRAPI', // misma dependencia que Tramo III, deliberadamente
  numeroProcedimiento: undefined, // sin número capturado — caso realista de dato faltante
  contractStart: '05 oct 2026', // fecha cercana al fallo real de Tramo III (30 sep 2026), deliberadamente
};

const resultadoNegativo = scoreMatch(tramoIIIFuenteComprasMX, proyectoTramoIITrampa);
console.log('\n--- Caso negativo: "Tramo II" trampa (parecido a Tramo III, sin numero) ---');
console.log(`Score: ${resultadoNegativo.score.toFixed(4)}`);
resultadoNegativo.signals.forEach((s) => console.log(`  ${s.name}: ${s.score.toFixed(2)} (peso ${s.weight}) — ${s.detail}`));
assert(resultadoNegativo.score < MATCH_THRESHOLD, `"Tramo II" trampa NO debe cruzar con Tramo III (score ${resultadoNegativo.score.toFixed(4)} < ${MATCH_THRESHOLD})`);

console.log('');
if (failed) {
  console.error('❌ Verificación del motor de cruce FALLÓ.');
  process.exit(1);
} else {
  console.log('✅ Verificación del motor de cruce OK — ambos casos de prueba pasaron.');
}
