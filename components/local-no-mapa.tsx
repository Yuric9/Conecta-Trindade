'use client';

import dynamic from 'next/dynamic';
import type { UseFormReturn } from 'react-hook-form';
import { Check, MapPin } from 'lucide-react';

// Leaflet só funciona no navegador
const MapPicker = dynamic(() => import('@/components/map-picker'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse rounded-xl" />,
});

/**
 * Marca o ponto exato do problema no mapa (opcional). Grava latitude e
 * longitude no formulário; o endereço digitado continua sendo obrigatório.
 */
export function LocalNoMapa({ form, altura = '260px' }: { form: UseFormReturn<any>; altura?: string }) {
  const latitude: number | undefined = form.watch('latitude');
  const longitude: number | undefined = form.watch('longitude');
  const marcado = Number.isFinite(latitude) && Number.isFinite(longitude);

  return (
    <div>
      <div style={{ height: altura }}>
        <MapPicker
          latitude={latitude ?? 0}
          longitude={longitude ?? 0}
          height={altura}
          onChange={(lat, lng) => {
            form.setValue('latitude', lat);
            form.setValue('longitude', lng);
          }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-sm">
        {marcado ? (
          <>
            <span className="flex items-center gap-1.5 text-[#006653] font-medium">
              <Check className="w-4 h-4" /> Local marcado no mapa
            </span>
            <button
              type="button"
              onClick={() => {
                form.setValue('latitude', undefined);
                form.setValue('longitude', undefined);
              }}
              className="text-gray-500 underline"
            >
              Remover
            </button>
          </>
        ) : (
          <span className="flex items-center gap-1.5 text-gray-500">
            <MapPin className="w-4 h-4" /> Toque no mapa para marcar o local exato (opcional)
          </span>
        )}
      </div>
    </div>
  );
}
