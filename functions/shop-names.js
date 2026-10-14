// How the shop app (maison-loyalty `products`) names things: "BRANDCODE perfume [concentration] size",
// e.g. "MARLY Delina edp 75ml", "NISHANE Hacivat 50ml", "BDK Creme de Cuir EDP 2ml Samples".
// Shared by the stock sync and the linker so both read names the same way.

const SIZE = /\(?\b\d+([.,]\d+)?\s*[x*]\s*\d+([.,]\d+)?\s*(ml|gr|g)\b\)?|\(?\b\d+([.,]\d+)?\s*(ml|gr|g|oz)\b\)?/gi;

/** The product name without its size: every size of a perfume shares it ("MARLY Delina edp"). */
export function baseName(name) {
  return (name ?? '').replace(SIZE, ' ').replace(/\s+/g, ' ').trim();
}

/** Lowercase, no accents or punctuation: "L’Eau Papier" and "L'Eau Papier" compare equal. */
export function normalize(s) {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function sizeMl(name) {
  const m = (name ?? '').match(/(\d+(?:[.,]\d+)?)\s*ml\b/i);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

export function isTesterOrSample(product) {
  return (
    product.type === 'tester' ||
    product.type === 'sample' ||
    /\b(tester|tst|sample|samples|vial)\b/i.test(product.name ?? '')
  );
}

/** What a customer can buy as "the perfume": not a tester or sample, and bigger than a 10ml travel spray. */
export function isFullBottle(product) {
  if (isTesterOrSample(product)) return false;
  const ml = sizeMl(product.name);
  return ml === null || ml > 10;
}
