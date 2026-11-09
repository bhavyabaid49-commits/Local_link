const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function isValidGstin(gstin) {
  if (!gstinPattern.test(gstin)) return false;
  const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const values = gstin
    .slice(0, 14)
    .split("")
    .map((character) => characters.indexOf(character));
  const checksum = values.reduce((total, value, index) => {
    const position = index + 1;
    const product = value * (position % 2 === 0 ? 2 : 1);
    return total + Math.floor(product / 36) + (product % 36);
  }, 0);
  const expected = (36 - (checksum % 36)) % 36;
  return gstin[14] === characters[expected];
}

export function normalizeGstin(gstin) {
  return String(gstin || "")
    .trim()
    .toUpperCase();
}
