'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import type { UseFormReturn } from 'react-hook-form';
import { ArrowLeft, Camera, ImagePlus, Loader2, Locate, X, Check, AlertCircle } from 'lucide-react';
import { CategoriaIcone } from '@/components/categoria-icone';
import { LocalNoMapa } from '@/components/local-no-mapa';

/**
 * Nova solicitação no celular: uma pergunta por tela, no estilo de aplicativo.
 * Usa o mesmo formulário (react-hook-form + zod) e o mesmo envio da versão de
 * computador, que ficam em app/solicitar/page.tsx.
 */

type Campo = 'categoria' | 'foto_url' | 'endereco' | 'descricao' | 'nome' | 'cpf' | 'telefone';

const PASSOS: { titulo: string; campos: Campo[] }[] = [
  { titulo: 'O que aconteceu?', campos: ['categoria'] },
  { titulo: 'Tire uma foto', campos: [] },
  { titulo: 'Onde é o problema?', campos: ['endereco'] },
  { titulo: 'Conte o que viu', campos: ['descricao'] },
  { titulo: 'Seus dados', campos: ['nome', 'cpf', 'telefone'] },
];

interface Props {
  form: UseFormReturn<any>;
  categorias: { value: string; label: string }[];
  fotoPreview: string | null;
  compressing: boolean;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoverFoto: () => void;
  localizando: boolean;
  onLocalizar: () => void;
  formatarCpf: (v: string) => string;
  formatarTelefone: (v: string) => string;
  apiError: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
}

function Erro({ mensagem }: { mensagem?: unknown }) {
  if (!mensagem) return null;
  return (
    <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {String(mensagem)}
    </p>
  );
}

const campoClasse =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006653] focus:border-[#006653]';

export function SolicitarWizard(props: Props) {
  const { form, categorias, fotoPreview, compressing, localizando, apiError, isSubmitting } = props;
  const [passo, setPasso] = useState(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const { register, watch, setValue, formState } = form;
  const erros = formState.errors as Record<string, { message?: string } | undefined>;

  const categoria = watch('categoria');
  const descricao: string = watch('descricao') || '';
  const ultimo = passo === PASSOS.length - 1;

  const avancar = async () => {
    const ok = PASSOS[passo].campos.length === 0 || (await form.trigger(PASSOS[passo].campos));
    if (!ok) return;
    if (ultimo) {
      props.onSubmit();
    } else {
      setPasso((p) => p + 1);
      window.scrollTo({ top: 0 });
    }
  };

  const voltar = () => {
    setPasso((p) => Math.max(0, p - 1));
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] flex flex-col bg-white">
      {/* Topo do fluxo: voltar/fechar e progresso */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-40 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 px-2 h-12">
          {passo === 0 ? (
            <Link href="/" aria-label="Fechar" className="w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100">
              <X className="w-5 h-5 text-gray-700" />
            </Link>
          ) : (
            <button type="button" onClick={voltar} aria-label="Voltar" className="w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}
          <span className="text-sm text-gray-500">
            Passo {passo + 1} de {PASSOS.length}
          </span>
        </div>
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-[#006653] transition-[width] duration-300"
            style={{ width: `${((passo + 1) / PASSOS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Conteúdo do passo */}
      <div key={passo} className="ct-surgir flex-1 px-4 pt-6 pb-32">
        <h1 className="text-2xl font-bold font-heading text-gray-900 mb-5">{PASSOS[passo].titulo}</h1>

        {passo === 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {categorias.map((cat) => {
                const selecionada = categoria === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      setValue('categoria', cat.value, { shouldValidate: true });
                      setTimeout(() => setPasso(1), 180);
                    }}
                    className={`flex flex-col items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.97] ${
                      selecionada ? 'border-[#006653] bg-emerald-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span className="w-11 h-11 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                      <CategoriaIcone categoria={cat.value} className="w-6 h-6" />
                    </span>
                    <span className="text-sm font-medium text-gray-900 leading-snug">{cat.value}</span>
                  </button>
                );
              })}
            </div>
            <Erro mensagem={erros.categoria?.message} />
          </>
        )}

        {passo === 1 && (
          <div>
            <p className="text-gray-600 mb-5">Uma foto ajuda a equipe a entender e encontrar o problema. É opcional.</p>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={props.onPhotoSelect} />
            <input ref={galeriaRef} type="file" accept="image/*" className="hidden" onChange={props.onPhotoSelect} />

            {fotoPreview ? (
              <div className="relative rounded-2xl overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fotoPreview} alt="Foto do problema" className="w-full max-h-[50vh] object-cover" />
                <button
                  type="button"
                  onClick={props.onRemoverFoto}
                  className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center"
                  aria-label="Remover foto"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  disabled={compressing}
                  className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-[#006653]/40 bg-emerald-50/50 flex flex-col items-center justify-center gap-3 active:bg-emerald-50"
                >
                  {compressing ? (
                    <Loader2 className="w-10 h-10 text-[#006653] animate-spin" />
                  ) : (
                    <span className="w-16 h-16 rounded-full bg-[#006653] text-white flex items-center justify-center">
                      <Camera className="w-8 h-8" />
                    </span>
                  )}
                  <span className="text-base font-semibold text-[#006653]">{compressing ? 'Preparando foto...' : 'Abrir câmera'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => galeriaRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-medium active:bg-gray-50"
                >
                  <ImagePlus className="w-5 h-5" />
                  Escolher da galeria
                </button>
              </div>
            )}
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={props.onLocalizar}
              disabled={localizando}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-50 text-[#006653] font-semibold border border-emerald-200 active:bg-emerald-100"
            >
              {localizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Locate className="w-5 h-5" />}
              {localizando ? 'Buscando sua localização...' : 'Usar minha localização atual'}
            </button>
            <div>
              <label htmlFor="wiz-endereco" className="block text-sm font-medium text-gray-700 mb-2">
                Endereço com ponto de referência
              </label>
              <textarea
                id="wiz-endereco"
                rows={3}
                placeholder="Ex.: Rua das Acácias, Qd. 12, Setor Central, perto do colégio"
                className={campoClasse}
                {...register('endereco')}
              />
              <Erro mensagem={erros.endereco?.message} />
            </div>
            <LocalNoMapa form={form} altura="240px" />
          </div>
        )}

        {passo === 3 && (
          <div>
            <textarea
              rows={6}
              autoFocus
              maxLength={1000}
              placeholder="Ex.: poste apagado há 3 noites em frente à padaria"
              className={campoClasse}
              {...register('descricao')}
            />
            <div className="mt-2 flex justify-between text-sm">
              <Erro mensagem={erros.descricao?.message} />
              <span className="ml-auto text-gray-400">{descricao.length}/1000</span>
            </div>
          </div>
        )}

        {passo === 4 && (
          <div className="space-y-4">
            <p className="text-gray-600 -mt-2">Usados só para identificar e acompanhar a sua solicitação.</p>
            <div>
              <label htmlFor="wiz-nome" className="block text-sm font-medium text-gray-700 mb-2">Nome completo</label>
              <input id="wiz-nome" autoComplete="name" className={campoClasse} {...register('nome')} />
              <Erro mensagem={erros.nome?.message} />
            </div>
            <div>
              <label htmlFor="wiz-cpf" className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
              <input
                id="wiz-cpf"
                inputMode="numeric"
                placeholder="000.000.000-00"
                className={campoClasse}
                {...register('cpf', { onChange: (e) => setValue('cpf', props.formatarCpf(e.target.value)) })}
              />
              <Erro mensagem={erros.cpf?.message} />
            </div>
            <div>
              <label htmlFor="wiz-tel" className="block text-sm font-medium text-gray-700 mb-2">
                Telefone / WhatsApp <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                id="wiz-tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(62) 99999-9999"
                className={campoClasse}
                {...register('telefone', { onChange: (e) => setValue('telefone', props.formatarTelefone(e.target.value)) })}
              />
              <Erro mensagem={erros.telefone?.message} />
            </div>
            {apiError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{apiError}</div>
            )}
          </div>
        )}
      </div>

      {/* Botão principal fixo no rodapé (polegar) */}
      {passo !== 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={avancar}
            disabled={isSubmitting || compressing}
            className="w-full h-14 rounded-xl bg-[#006653] text-white text-base font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Enviando...
              </>
            ) : ultimo ? (
              <>
                <Check className="w-5 h-5" /> Enviar solicitação
              </>
            ) : passo === 1 && !fotoPreview ? (
              'Pular foto'
            ) : (
              'Continuar'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
