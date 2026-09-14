/**
 * Sağ tık / uzun basma ile nesne menüsü açılırken seçimin ne olacağı.
 * Tıklanan nesne zaten ÇOKLU seçimin parçasıysa seçim olduğu gibi (aynı dizi, aynı sıra) korunur:
 * "Seçili N noktayı birleştir" ve "Kopyala" bu seçime bakar, birleştirme sırası da seçim sırasıdır.
 * Aksi hâlde seçim tıklanan nesneye indirilir.
 */
export function contextMenuSelection(selectedIds: string[], clickedId: string): string[] {
  return selectedIds.length > 1 && selectedIds.includes(clickedId) ? selectedIds : [clickedId];
}
