import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Sayfa Bulunamadı</h2>
      <p className="text-sm text-muted-foreground">Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
      >
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
