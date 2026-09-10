// Açık modal/dialog sayacı.
//
// Tuval bileşenleri (Canvas, Canvas3D) pencere düzeyinde klavye dinleyicisi kurar.
// Bir dialog açıkken Delete/Backspace veya Ctrl+Z gibi kısayolların arka plandaki
// nesneleri sessizce değiştirmemesi için bu sayaç kullanılır.
//
// Modal bileşeni açılışta open(), kapanışta close() çağırır; tuvaller
// isAnyModalOpen() ile kontrol edip erken döner.

let openCount = 0;

export function registerModalOpen(): void {
  openCount += 1;
}

export function registerModalClose(): void {
  openCount = Math.max(0, openCount - 1);
}

export function isAnyModalOpen(): boolean {
  return openCount > 0;
}

/** Yalnızca testler ve hata ayıklama için */
export function resetModalCount(): void {
  openCount = 0;
}
