export function requiredFields(body, fields) {
  return fields.filter((field) => !String(body[field] || "").trim());
}

export function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
