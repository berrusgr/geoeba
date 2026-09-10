// Benzersiz nesne kimliği üretici (sayaç + zaman damgası + rastgele ek)
// Aynı olay içinde art arda oluşturulan nesnelerin kimlikleri çakışmaz.

let idCounter = 0;

export function createId(prefix: string): string {
  idCounter = (idCounter + 1) % 1_000_000;
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${time}-${idCounter.toString(36)}-${random}`;
}
