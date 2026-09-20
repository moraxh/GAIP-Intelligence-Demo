// Normalización de texto compartida entre scripts/build-mock-data.mjs (build-time, datos
// reales de GAIP) y lib/matching-engine.ts (runtime, motor de cruce fuzzy). Una sola fuente
// de verdad: titleCase/normalizeProcedureName se portaron aquí desde build-mock-data.mjs sin
// cambiar su comportamiento — build-mock-data.mjs las importa de este archivo.

export function titleCase(str: string | null | undefined): string | null | undefined {
  if (!str) return str;
  // Respeta separadores "/" y "-" como límites de palabra (p. ej. "JAVIER/BRENDA" -> "Javier/Brenda")
  return str
    .toLowerCase()
    .split(/(\s|\/|-)/)
    .map((w) => (/[a-záéíóúñ]/i.test(w) ? w[0].toUpperCase() + w.slice(1) : w))
    .join('');
}

export function normalizeProcedureName(sourceName: string | null | undefined): string | null | undefined {
  if (!sourceName) return sourceName;
  let name = sourceName.replace(/\s+/g, ' ').trim();
  const hasOpeningQuote = /^[“"]/.test(name);
  const hasMatchingClosingQuote = (name.startsWith('“') && name.endsWith('”')) || (name.startsWith('"') && name.endsWith('"'));
  const sourceFragment = hasOpeningQuote && !hasMatchingClosingQuote;
  if (hasMatchingClosingQuote) name = name.slice(1, -1).trim();
  else if (sourceFragment) name = name.slice(1).trimStart();

  // Preserve Roman numerals and dotted initialisms through title casing. These
  // are presentation-only; the literal source remains available in nombreFuente.
  const preservedTokens: string[] = [];
  const preserve = (token: string) => `${preservedTokens.push(token) - 1}`;
  name = name.replace(/\bTRAMO\s*(IV|III|II|V|I)\b/gi, (_match, numeral) => `TRAMO ${preserve(numeral.toUpperCase())}`);
  name = name.replace(/\b(?:[A-Z]\.){2,}/g, (match) => preserve(match));
  const displayName = (titleCase(name) ?? '').replace(/(\d+)/g, (_match, index) => preservedTokens[Number(index)]);
  return `${displayName}${sourceFragment ? '…' : ''}`;
}

// Nueva: normaliza un número de procedimiento para comparación exacta entre fuentes
// (quita espacios, guiones y diferencias de mayúsculas/minúsculas). Usada solo por el
// motor de cruce — build-mock-data.mjs no la necesita porque nunca compara `numero` entre
// fuentes distintas, solo deduplica por `cod_expediente` dentro de la misma fuente.
export function normalizeNumero(numero: string | null | undefined): string {
  if (!numero) return '';
  return numero.replace(/[\s-]/g, '').toUpperCase();
}

// Extrae un numeral romano o "Etapa N" preservado por normalizeProcedureName, para que
// el motor de cruce pueda detectar cuándo dos nombres casi idénticos en realidad
// describen tramos/etapas DISTINTOS del mismo macroproyecto (ver caso "Tramo II" vs
// "Tramo III" en docs/ejemplo-ilustrativo-cruce.md).
export function extractRomanOrOrdinal(text: string | null | undefined): string | null {
  if (!text) return null;
  const roman = text.match(/\bTRAMO\s*(IV|III|II|V|I)\b/i);
  if (roman) return roman[1].toUpperCase();
  const etapa = text.match(/\bETAPA\s*(\d+)\b/i);
  if (etapa) return `ETAPA-${etapa[1]}`;
  return null;
}
