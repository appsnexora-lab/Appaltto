import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
      <h2 className="text-2xl font-bold text-stone-900 mb-2">Página não encontrada</h2>
      <p className="text-stone-600 mb-6">A página que você está procurando não existe ou foi movida.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition"
      >
        Voltar para o Início
      </Link>
    </div>
  );
}
