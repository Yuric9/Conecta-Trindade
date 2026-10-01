'use client';

import Link from 'next/link';
import { Lightbulb, Construction, Trash2, Droplet, FileText, ArrowRight, Truck, Search, Scissors, TreePine, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

const CATEGORIAS = [
  { icon: Lightbulb, label: 'Iluminação pública', cat: 'Iluminação Pública' },
  { icon: Construction, label: 'Buracos e pavimentação', cat: 'Buracos e Pavimentação' },
  { icon: Trash2, label: 'Limpeza e entulho', cat: 'Limpeza e Entulho' },
  { icon: Scissors, label: 'Roçagem e capina', cat: 'Roçagem e Capina' },
  { icon: TreePine, label: 'Poda de árvores', cat: 'Poda e Arborização' },
  { icon: Droplet, label: 'Vazamento de água', cat: 'Vazamento de Água' },
  { icon: MoreHorizontal, label: 'Outros serviços', cat: 'Outros Serviços' },
];

const PASSOS = [
  { titulo: 'Registre o problema', texto: 'Escolha a categoria, descreva o que aconteceu e informe o endereço. Se puder, envie uma foto.' },
  { titulo: 'Guarde o protocolo', texto: 'Ao enviar, você recebe um número de protocolo da sua solicitação.' },
  { titulo: 'Acompanhe', texto: 'Consulte o andamento pelo protocolo ou pelo seu CPF sempre que quiser.' },
];

export default function HomePage() {
  const { profile } = useAuth();

  return (
    <div className="bg-[#eef1ef]">
      {/* Abertura */}
      <section className="bg-[#006653] text-white">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-bold font-heading leading-tight mb-4">
              Conecta Trindade
            </h1>
            <p className="text-emerald-50 text-base md:text-lg leading-relaxed mb-8">
              Registre problemas de iluminação, buracos, limpeza, vazamentos e outros serviços
              urbanos em Trindade, e acompanhe cada solicitação pelo número de protocolo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/solicitar">
                <Button size="lg" className="w-full sm:w-auto bg-[#FFC20E] text-[#173b32] hover:bg-yellow-300 font-semibold text-base h-12 px-7">
                  <FileText className="w-5 h-5 mr-2" />
                  Nova solicitação
                </Button>
              </Link>
              <Link href="/acompanhar">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white h-12 px-6 text-base"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Acompanhar protocolo
                </Button>
              </Link>
              {profile && (
                <Link href="/meus-chamados">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white h-12 px-6 text-base"
                  >
                    Meus chamados
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-bold font-heading text-gray-900 mb-2">O que você precisa registrar?</h2>
        <p className="text-gray-600 mb-8">Escolha uma categoria para abrir a solicitação.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CATEGORIAS.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.cat}
                href={`/solicitar?categoria=${encodeURIComponent(cat.cat)}`}
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-white hover:border-[#006653] transition-colors"
              >
                <Icon className="w-5 h-5 text-[#006653] flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800 leading-snug">{cat.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Coleta de lixo */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-[#006653] flex items-center justify-center flex-shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading text-gray-900">Coleta de lixo por bairro</h2>
              <p className="text-sm text-gray-600 mt-1 max-w-xl leading-relaxed">
                Veja os dias e o turno em que a coleta domiciliar passa no seu bairro.
              </p>
            </div>
          </div>
          <Link href="/cronograma-rsu" className="w-full md:w-auto">
            <Button className="w-full md:w-auto bg-[#006653] hover:bg-[#005242] text-white font-semibold h-11 px-6">
              Consultar meu bairro
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Como funciona */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-bold font-heading text-gray-900 mb-8">Como funciona</h2>
        <ol className="grid md:grid-cols-3 gap-8">
          {PASSOS.map((passo, i) => (
            <li key={passo.titulo} className="border-t-2 border-[#006653] pt-4">
              <span className="text-sm font-semibold text-[#006653]">Passo {i + 1}</span>
              <h3 className="font-semibold text-lg text-gray-900 mt-1 mb-2">{passo.titulo}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{passo.texto}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
