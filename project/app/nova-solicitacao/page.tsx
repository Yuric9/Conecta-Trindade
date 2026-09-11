'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { compressImage, formatFileSize } from '@/lib/image-compress';
import { isWithinTrindade, distanceMeters } from '@/lib/geo';
import { CATEGORIAS, type ChamadoCategoria } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

const MapPicker = dynamic(() => import('@/components/map-picker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[350px] rounded-lg border-2 border-gray-200 flex items-center justify-center bg-gray-50">
      <div className="text-gray-400 text-sm">Carregando mapa...</div>
    </div>
  ),
});
import {
  Camera,
  X,
  MapPin,
  Send,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  Construction,
  Trash2,
  Droplet,
  TreePine,
  AlertTriangle,
  Loader2,
  Locate,
} from 'lucide-react';

const ICONS: Record<string, any> = {
  Lightbulb,
  Construction,
  Trash2,
  Droplet,
  TreePine,
  AlertCircle: AlertTriangle,
};

const STEPS = ['Fotos', 'Categoria', 'Localização', 'Descrição'];

export default function NovaSolicitacaoPage() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoBlobs, setPhotoBlobs] = useState<Blob[]>([]);
  const [photoSizes, setPhotoSizes] = useState<number[]>([]);
  const [categoria, setCategoria] = useState<ChamadoCategoria | null>(null);
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [endereco, setEndereco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ protocolo: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = 3 - photos.length;
    const toProcess = Array.from(files).slice(0, remaining);

    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressed = await compressImage(file);
        setPhotos((prev) => [...prev, compressed.dataUrl]);
        setPhotoBlobs((prev) => [...prev, compressed.blob]);
        setPhotoSizes((prev) => [...prev, compressed.size]);
      } catch {
        setError('Erro ao processar imagem');
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [photos.length]);

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoBlobs((prev) => prev.filter((_, i) => i !== index));
    setPhotoSizes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      if (res.ok) {
        const data = await res.json();
        setEndereco(data.display_name || '');
      }
    } catch {
      // silently fail
    }
  };

  const handleMapChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    handleReverseGeocode(lat, lng);
  };

  const handleLocateMe = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (isWithinTrindade(lat, lng)) {
          setLatitude(lat);
          setLongitude(lng);
          handleReverseGeocode(lat, lng);
        } else {
          setError('Sua localização está fora dos limites de Trindade-GO.');
        }
      },
      () => setError('Não foi possível obter sua localização.'),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const canProceed = () => {
    if (step === 0) return photos.length > 0;
    if (step === 1) return categoria !== null;
    if (step === 2) return latitude !== 0 && longitude !== 0 && isWithinTrindade(latitude, longitude);
    if (step === 3) return descricao.trim().length >= 10;
    return false;
  };

  const handleSubmit = async () => {
    if (!session) {
      router.push('/login');
      return;
    }

    setError('');
    setLoading(true);
    setUploadProgress(0);

    try {
      // Check for duplicates
      const { data: existing } = await supabase
        .from('chamados')
        .select('latitude, longitude, created_at')
        .eq('cidadao_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (existing) {
        for (const c of existing) {
          const dist = distanceMeters(latitude, longitude, c.latitude, c.longitude);
          const age = Date.now() - new Date(c.created_at).getTime();
          if (dist < 100 && age < 24 * 60 * 60 * 1000) {
            setError('Você já abriu um chamado similar há menos de 24h. Aguarde para abrir um novo.');
            setLoading(false);
            return;
          }
        }
      }

      // Upload photos
      const photoUrls: string[] = [];
      for (let i = 0; i < photoBlobs.length; i++) {
        const blob = photoBlobs[i];
        const fileName = `${session.user.id}/${Date.now()}-${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(fileName, blob, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(fileName);
        photoUrls.push(urlData.publicUrl);
        setUploadProgress(Math.round(((i + 1) / photoBlobs.length) * 80));
      }

      // Insert chamado
      const { data, error: insertError } = await supabase
        .from('chamados')
        .insert({
          cidadao_id: session.user.id,
          categoria,
          descricao,
          latitude,
          longitude,
          endereco_texto: endereco,
          fotos: photoUrls,
          status: 'ABERTO',
        })
        .select('protocolo')
        .single();

      if (insertError) throw insertError;

      setUploadProgress(100);
      setSuccess({ protocolo: data.protocolo });
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-[#F4F6F8] to-green-50">
        <div className="max-w-lg w-full text-center">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 animate-fade-in">
            <CheckCircle2 className="w-14 h-14 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-[#0A3A7A] mb-3">
            Solicitação Enviada!
          </h1>
          <p className="text-gray-600 mb-6">
            Sua solicitação foi registrada com sucesso e encaminhada à prefeitura.
            Use o número de protocolo abaixo para acompanhar.
          </p>
          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200 mb-8">
            <p className="text-sm text-gray-500 mb-2">Número de Protocolo</p>
            <p className="text-3xl font-bold font-heading text-[#1E5BC6] tracking-wider">
              {success.protocolo}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => router.push('/meus-chamados')}
              className="bg-[#1E5BC6] hover:bg-[#0A3A7A] text-white font-semibold h-11 px-6"
            >
              Ver Meus Chamados
            </Button>
            <Button
              onClick={() => {
                setSuccess(null);
                setStep(0);
                setPhotos([]);
                setPhotoBlobs([]);
                setPhotoSizes([]);
                setCategoria(null);
                setLatitude(0);
                setLongitude(0);
                setEndereco('');
                setDescricao('');
              }}
              variant="outline"
              className="border-[#1E5BC6] text-[#1E5BC6] hover:bg-blue-50 h-11 px-6"
            >
              Nova Solicitação
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-[#0A3A7A]">Nova Solicitação</h1>
        <p className="text-gray-500 text-sm mt-1">Registre um problema de zelo urbano em 4 passos</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div
              className={`flex items-center gap-2 ${i <= step ? 'text-[#1E5BC6]' : 'text-gray-400'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < step
                    ? 'bg-green-500 text-white'
                    : i === step
                    ? 'bg-[#1E5BC6] text-white ring-4 ring-blue-100'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {i < step ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
              </div>
              <span className="text-xs font-semibold hidden sm:inline">{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card className="shadow-lg border-gray-200">
        <CardContent className="p-6 md:p-8">
          {/* Step 0: Photos */}
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-[#0A3A7A] mb-1 font-heading">Tire a foto do problema</h2>
                <p className="text-sm text-gray-500 mb-4">Máximo de 3 fotos. As imagens são comprimidas automaticamente.</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {photos.length === 0 ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-3 border-dashed border-[#1E5BC6] rounded-2xl p-12 flex flex-col items-center gap-4 hover:bg-blue-50 transition-all group"
                >
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-10 h-10 text-[#1E5BC6]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1E5BC6] text-lg">TIRAR FOTO DO PROBLEMA</p>
                    <p className="text-sm text-gray-500 mt-1">Toque para tirar foto ou selecionar da galeria</p>
                  </div>
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-gray-200">
                      <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1">
                        {formatFileSize(photoSizes[i])}
                      </div>
                    </div>
                  ))}
                  {photos.length < 3 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#1E5BC6] hover:bg-blue-50 transition-all"
                    >
                      <Camera className="w-8 h-8 text-gray-400" />
                      <span className="text-xs text-gray-500">Adicionar</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Category */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-[#0A3A7A] mb-1 font-heading">Escolha a categoria</h2>
                <p className="text-sm text-gray-500 mb-4">Selecione o tipo de problema que você está reportando</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CATEGORIAS.map((cat) => {
                  const Icon = ICONS[cat.icon] || AlertTriangle;
                  const selected = categoria === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoria(cat.id)}
                      className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                        selected
                          ? 'border-[#1E5BC6] bg-blue-50 shadow-md scale-105'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      <div className="text-4xl">{cat.emoji}</div>
                      <Icon className={`w-7 h-7 ${selected ? 'text-[#1E5BC6]' : 'text-gray-400'}`} />
                      <span className={`text-sm font-semibold ${selected ? 'text-[#1E5BC6]' : 'text-gray-700'}`}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#0A3A7A] mb-1 font-heading">Marque a localização</h2>
                  <p className="text-sm text-gray-500">Arraste o pin ou toque no mapa para ajustar</p>
                </div>
                <Button
                  onClick={handleLocateMe}
                  variant="outline"
                  size="sm"
                  className="border-[#1E5BC6] text-[#1E5BC6] hover:bg-blue-50"
                >
                  <Locate className="w-4 h-4 mr-1" />
                  Minha localização
                </Button>
              </div>

              <MapPicker
                latitude={latitude}
                longitude={longitude}
                onChange={handleMapChange}
                height="350px"
              />

              {endereco && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <MapPin className="w-5 h-5 text-[#1E5BC6] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{endereco}</p>
                </div>
              )}

              {latitude !== 0 && !isWithinTrindade(latitude, longitude) && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    A localização selecionada está fora dos limites do município de Trindade-GO.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 3: Description */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-[#0A3A7A] mb-1 font-heading">Descreva o problema</h2>
                <p className="text-sm text-gray-500 mb-4">Forneça detalhes para ajudar a equipe municipal</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao" className="text-sm font-medium text-gray-700">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Poste de iluminação queimado na esquina da Rua das Flores com Av. Goiás. Há 3 dias que está apagado..."
                  className="min-h-[120px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-400 text-right">{descricao.length}/500 caracteres</p>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumo da Solicitação</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Categoria:</span>
                    <span className="font-medium text-gray-800">
                      {CATEGORIAS.find((c) => c.id === categoria)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fotos:</span>
                    <span className="font-medium text-gray-800">{photos.length} foto(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Localização:</span>
                    <span className="font-medium text-gray-800 text-right max-w-[200px] truncate">
                      {endereco || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {loading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-[#1E5BC6]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando solicitação...
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
            <Button
              variant="ghost"
              onClick={() => (step === 0 ? router.push('/') : setStep(step - 1))}
              className="text-gray-600 hover:bg-gray-100"
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {step === 0 ? 'Cancelar' : 'Voltar'}
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="bg-[#1E5BC6] hover:bg-[#0A3A7A] text-white font-semibold h-11 px-6"
              >
                Avançar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold h-11 px-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar para Prefeitura
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
