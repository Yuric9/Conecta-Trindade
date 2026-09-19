'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { compressImage } from '@/lib/image-compress';
import {
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  Building2,
  MapPin,
  Camera,
  X,
  AlertCircle,
  ArrowRight,
  ClipboardList,
  MessageCircle,
  FileText,
  Locate,
  ShieldCheck,
} from 'lucide-react';

// =====================================================================
// 1. Esquema de Validação Client-Side com Zod
// =====================================================================

const chamadoFormSchema = z.object({
  nome: z
    .string()
    .min(3, { message: 'Informe seu nome completo (mínimo 3 caracteres).' })
    .max(100, { message: 'O nome não pode ultrapassar 100 caracteres.' }),
  cpf: z
    .string()
    .min(11, { message: 'Informe um CPF com 11 dígitos.' })
    .refine(
      (val) => val.replace(/\D/g, '').length === 11,
      { message: 'CPF inválido. Deve conter exatamente 11 dígitos numéricos.' }
    ),
  telefone: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.replace(/\D/g, '').length >= 10,
      { message: 'Telefone inválido. Inclua o DDD (ex: 62 99999-9999).' }
    ),
  categoria: z
    .string({ required_error: 'Selecione a categoria do serviço solicitado.' })
    .min(1, { message: 'Selecione a categoria do serviço.' }),
  descricao: z
    .string()
    .min(5, { message: 'Descreva a ocorrência com detalhes (mínimo 5 caracteres).' })
    .max(1000, { message: 'A descrição não pode exceder 1000 caracteres.' }),
  endereco: z
    .string()
    .min(5, { message: 'Informe o endereço completo com rua, setor e ponto de referência.' }),
  foto_url: z.string().optional(),
});

type ChamadoFormValues = z.infer<typeof chamadoFormSchema>;

// Categorias oficiais de serviços municipais de Trindade - GO
const CATEGORIAS_MUNICIPAIS = [
  { value: 'Iluminação Pública', label: '💡 Iluminação Pública (Postes, Lâmpadas, Braços)', prazo: '48 horas' },
  { value: 'Buracos e Pavimentação', label: '🕳️ Buracos e Pavimentação Asfáltica (Tapa-buraco)', prazo: '5 dias' },
  { value: 'Limpeza e Entulho', label: '🗑️ Limpeza Urbana, Entulho e Descarte Irregular', prazo: '72 horas' },
  { value: 'Roçagem e Capina', label: '🌾 Roçagem e Capina (Mato Alto, Lotes e Vias Públicas)', prazo: '5 dias' },
  { value: 'Poda e Arborização', label: '🌳 Poda de Árvores e Riscos de Queda', prazo: '7 dias' },
  { value: 'Vazamento de Água', label: '💧 Vazamento de Água ou Esgoto em Via Pública', prazo: '24 horas' },
  { value: 'Sinalização e Trânsito', label: '🚦 Sinalização de Trânsito, Semáforos e Placas', prazo: '72 horas' },
  { value: 'Outros Serviços', label: '⚠️ Outros Serviços Municipais', prazo: '5 dias' },
];

export default function SolicitarPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoNome, setFotoNome] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Estados do Modal de Sucesso
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [protocoloGerado, setProtocoloGerado] = useState<string>('');
  const [chamadoIdCriado, setChamadoIdCriado] = useState<string>('');
  const [dadosCriados, setDadosCriados] = useState<any>(null);
  const [copiado, setCopiado] = useState(false);
  const [localizando, setLocalizando] = useState(false);

  // 2. Inicialização do React Hook Form com Zod
  const form = useForm<ChamadoFormValues>({
    resolver: zodResolver(chamadoFormSchema),
    defaultValues: {
      nome: '',
      cpf: '',
      telefone: '',
      categoria: '',
      descricao: '',
      endereco: '',
      foto_url: '',
    },
    mode: 'onBlur',
  });

  // Preenchimento automático caso o cidadão esteja autenticado
  useEffect(() => {
    if (user) {
      if (user.user_metadata?.nome && !form.getValues('nome')) {
        form.setValue('nome', user.user_metadata.nome);
      }
      if (user.user_metadata?.cpf && !form.getValues('cpf')) {
        form.setValue('cpf', user.user_metadata.cpf);
      }
      if (user.user_metadata?.telefone && !form.getValues('telefone')) {
        form.setValue('telefone', user.user_metadata.telefone);
      }
    }
  }, [user, form]);

  // Capturar categoria vinda via query param (ex: /solicitar?categoria=Roçagem e Capina)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get('categoria');
      if (catParam) {
        const found = CATEGORIAS_MUNICIPAIS.find(
          (c) =>
            c.value.toLowerCase() === catParam.toLowerCase() ||
            (catParam.toLowerCase().includes('roç') && c.value.includes('Roçagem')) ||
            (catParam.toLowerCase().includes('roc') && c.value.includes('Roçagem')) ||
            (catParam.toUpperCase() === 'ROCAGEM' && c.value.includes('Roçagem')) ||
            (catParam.toLowerCase().includes('ilum') && c.value.includes('Iluminação')) ||
            (catParam.toLowerCase().includes('bura') && c.value.includes('Buracos')) ||
            (catParam.toLowerCase().includes('lixo') && c.value.includes('Limpeza')) ||
            (catParam.toLowerCase().includes('poda') && c.value.includes('Poda')) ||
            (catParam.toLowerCase().includes('vaza') && c.value.includes('Vazamento'))
        );
        if (found) {
          form.setValue('categoria', found.value);
        }
      }
    }
  }, [form]);

  // Formatação de máscara do CPF
  const formatarCpf = (valor: string) => {
    const nums = valor.replace(/\D/g, '').slice(0, 11);
    return nums
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  // Formatação de máscara do Telefone
  const formatarTelefone = (valor: string) => {
    const nums = valor.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 10) {
      return nums.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return nums.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  // Upload e compressão de foto
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    try {
      setCompressing(true);
      const compressed = await compressImage(file, 1280, 1280, 0.75);
      setFotoPreview(compressed.dataUrl);
      setFotoNome(file.name);
      form.setValue('foto_url', compressed.dataUrl);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
    } finally {
      setCompressing(false);
    }
  };

  const handleRemoverFoto = () => {
    setFotoPreview(null);
    setFotoNome(null);
    form.setValue('foto_url', '');
  };

  // Geolocalização no navegador
  const handleObterLocalizacaoAtual = () => {
    if (!navigator.geolocation) {
      alert('Seu navegador não suporta geolocalização.');
      return;
    }

    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            if (data.address) {
              form.setValue('endereco', `${data.address}, Trindade - GO`);
              setLocalizando(false);
              return;
            }
          }
        } catch {
          // Ignora erro de geocoding reverso e usa coordenadas
        }
        form.setValue('endereco', `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Trindade - GO)`);
        setLocalizando(false);
      },
      (err) => {
        console.warn('Erro ao obter coordenadas:', err);
        setLocalizando(false);
        alert('Não foi possível obter sua localização automaticamente. Por favor, digite o endereço.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Copiar protocolo para área de transferência
  const handleCopiarProtocolo = async () => {
    if (!protocoloGerado) return;
    try {
      await navigator.clipboard.writeText(protocoloGerado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback simples
      const textArea = document.createElement('textarea');
      textArea.value = protocoloGerado;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  // 3. Envio do Formulário para a API Next.js POST /api/chamados
  const onSubmit = async (values: ChamadoFormValues) => {
    setApiError(null);

    try {
      const payload = {
        nome: values.nome.trim(),
        cpf: values.cpf.trim(),
        telefone: values.telefone?.trim() || '(62) Não informado',
        categoria: values.categoria,
        descricao: values.descricao.trim(),
        endereco: values.endereco.trim(),
        foto_url: values.foto_url || null,
      };

      const response = await fetch('/api/chamados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const msg = data.error || (data.detalhes ? data.detalhes.join('; ') : 'Erro ao registrar solicitação.');
        setApiError(msg);
        return;
      }

      // 4. Sucesso: armazena os dados de retorno e abre o Dialog com destaque ao protocolo
      setProtocoloGerado(data.protocolo);
      setChamadoIdCriado(data.id);
      setDadosCriados(data.dados || payload);
      setSuccessDialogOpen(true);

      // Reseta o formulário
      form.reset({
        nome: user?.user_metadata?.nome || '',
        cpf: user?.user_metadata?.cpf || '',
        telefone: user?.user_metadata?.telefone || '',
        categoria: '',
        descricao: '',
        endereco: '',
        foto_url: '',
      });
      setFotoPreview(null);
      setFotoNome(null);
    } catch (err: any) {
      console.error('Erro ao chamar /api/chamados:', err);
      setApiError('Não foi possível conectar ao servidor da Prefeitura. Verifique sua conexão e tente novamente.');
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-gray-50 to-white pb-16">
      {/* Barra de Título Superior */}
      <div className="bg-[#006653] text-white py-8 px-4 shadow-sm border-b border-emerald-800/30">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold mb-2 uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-emerald-300" />
            <span>Prefeitura Municipal de Trindade - GO • Zeladoria Urbana</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-white tracking-tight">
            Abertura de Solicitação de Serviço
          </h1>
          <p className="text-emerald-100/90 text-sm mt-1 max-w-2xl">
            Registre demandas de iluminação pública, reparos asfálticos, limpeza urbana e outros serviços municipais. Você receberá um protocolo oficial para acompanhamento em tempo real.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6">
        <Card className="border-gray-200/80 shadow-md bg-white">
          <CardHeader className="border-b border-gray-100 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900 font-heading">
                  Dados do Cidadão e da Demanda
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Preencha os campos abaixo. Todos os dados marcados com (*) são de preenchimento obrigatório.
                </CardDescription>
              </div>
              <span className="text-[11px] font-semibold bg-emerald-50 text-[#006653] border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Canal Oficial
              </span>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Mensagem de Erro da API */}
            {apiError && (
              <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Atenção: </span>
                  <span>{apiError}</span>
                </div>
              </div>
            )}

            {/* Formulário Conectado via shadcn/ui Form + React Hook Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Seção 1: Identificação do Solicitante */}
                <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/70 space-y-4">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#006653]" />
                    1. Identificação do Solicitante
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nome Completo */}
                    <FormField
                      control={form.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel className="text-xs font-semibold text-gray-700">
                            Nome Completo *
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Maria das Graças Silva"
                              {...field}
                              className="h-10 text-sm bg-white"
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage className="text-xs text-red-600" />
                        </FormItem>
                      )}
                    />

                    {/* CPF */}
                    <FormField
                      control={form.control}
                      name="cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-gray-700">
                            CPF do Solicitante *
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="000.000.000-00"
                              {...field}
                              onChange={(e) => field.onChange(formatarCpf(e.target.value))}
                              className="h-10 text-sm bg-white font-mono"
                              maxLength={14}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormDescription className="text-[11px] text-gray-400">
                            Usado para consultar suas solicitações pelo portal.
                          </FormDescription>
                          <FormMessage className="text-xs text-red-600" />
                        </FormItem>
                      )}
                    />

                    {/* Telefone / WhatsApp */}
                    <FormField
                      control={form.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-gray-700">
                            Telefone / WhatsApp (Opcional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(62) 99999-9999"
                              {...field}
                              onChange={(e) => field.onChange(formatarTelefone(e.target.value))}
                              className="h-10 text-sm bg-white font-mono"
                              maxLength={15}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormDescription className="text-[11px] text-gray-400">
                            Para envio de atualizações sobre o andamento.
                          </FormDescription>
                          <FormMessage className="text-xs text-red-600" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Seção 2: Categoria e Detalhes da Ocorrência */}
                <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/70 space-y-4">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#006653]" />
                    2. Detalhes da Solicitação
                  </h3>

                  {/* Categoria do Serviço */}
                  <FormField
                    control={form.control}
                    name="categoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-gray-700">
                          Categoria do Serviço *
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10 text-sm bg-white">
                              <SelectValue placeholder="Selecione o tipo de serviço que você precisa" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white">
                            {CATEGORIAS_MUNICIPAIS.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value} className="text-xs sm:text-sm py-2">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-1">
                                  <span>{cat.label}</span>
                                  <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 w-fit">
                                    SLA: {cat.prazo}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs text-red-600" />
                      </FormItem>
                    )}
                  />

                  {/* Descrição Detalhada */}
                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-gray-700">
                          Descrição da Ocorrência *
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva o problema com o máximo de detalhes possível. Ex: poste apagado há 3 noites em frente à padaria, buraco profundo próximo ao meio-fio causando risco aos motoristas..."
                            {...field}
                            rows={4}
                            className="text-sm bg-white resize-none"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription className="text-[11px] text-gray-400">
                          Mínimo de 5 caracteres. Seja específico para ajudar a equipe técnica a localizar a demanda.
                        </FormDescription>
                        <FormMessage className="text-xs text-red-600" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Seção 3: Endereço e Localização em Trindade */}
                <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/70 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#006653]" />
                      3. Localização do Problema
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleObterLocalizacaoAtual}
                      disabled={localizando || isSubmitting}
                      className="h-7 text-[11px] gap-1 text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                    >
                      {localizando ? (
                        <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                      ) : (
                        <Locate className="w-3 h-3 text-emerald-600" />
                      )}
                      <span>Usar Minha Localização Atual</span>
                    </Button>
                  </div>

                  {/* Endereço Completo */}
                  <FormField
                    control={form.control}
                    name="endereco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-gray-700">
                          Endereço Completo com Ponto de Referência *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Rua das Acácias, Qd. 12, Lt. 05, Setor Central, próximo ao Colégio Estadual"
                            {...field}
                            className="h-10 text-sm bg-white"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription className="text-[11px] text-gray-400">
                          Informe a rua, número ou lote/quadra, bairro e pontos de referência conhecidos em Trindade.
                        </FormDescription>
                        <FormMessage className="text-xs text-red-600" />
                      </FormItem>
                    )}
                  />

                  {/* Foto Opcional da Ocorrência */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      Foto da Ocorrência (Opcional, porém recomendada)
                    </label>

                    {fotoPreview ? (
                      <div className="relative inline-block border-2 border-emerald-500 rounded-lg overflow-hidden bg-gray-100 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={fotoPreview}
                          alt="Foto anexada da ocorrência"
                          className="w-48 h-32 object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoverFoto}
                          disabled={isSubmitting}
                          className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition-colors"
                          title="Remover foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="bg-emerald-800 text-white text-[10px] px-2 py-0.5 truncate max-w-[12rem] text-center font-medium">
                          {fotoNome || 'Foto anexada'}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3.5 py-2.5 rounded-lg shadow-2xs transition-all hover:border-emerald-500">
                          {compressing ? (
                            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                          ) : (
                            <Camera className="w-4 h-4 text-emerald-700" />
                          )}
                          <span>{compressing ? 'Processando imagem...' : 'Tirar Foto ou Escolher Arquivo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoSelect}
                            disabled={compressing || isSubmitting}
                            className="hidden"
                          />
                        </label>
                        <span className="text-[11px] text-gray-400">JPG, PNG ou WebP (Máx. 5MB)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão de Envio com Estado de Carregamento e Desabilitação */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting || compressing}
                    className="w-full bg-[#006653] hover:bg-[#004d3e] text-white font-bold h-12 text-sm shadow-md transition-all hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                        <span>Enviando Solicitação ao Município...</span>
                      </>
                    ) : (
                      <>
                        <span>Enviar Solicitação</span>
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                  <p className="text-center text-[11px] text-gray-400 mt-2">
                    Ao enviar, você receberá um protocolo único oficial registrado na Prefeitura de Trindade.
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* =====================================================================
          4. Modal (Dialog) de Confirmação de Sucesso com Protocolo em Destaque
          ===================================================================== */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="max-w-md bg-white p-6 sm:p-7 text-center rounded-2xl border-gray-200 shadow-2xl">
          <DialogHeader className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#006653] flex items-center justify-center mb-3 shadow-inner">
              <CheckCircle2 className="w-9 h-9 text-[#006653]" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 font-heading">
              Solicitação Aberta com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Sua demanda foi registrada no sistema da Prefeitura de Trindade e encaminhada para a secretaria competente.
            </DialogDescription>
          </DialogHeader>

          {/* Destaque do Número do Protocolo */}
          <div className="my-5 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-500/40 text-center">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
              Número Oficial do Protocolo
            </span>
            <div className="font-mono text-2xl sm:text-3xl font-black text-[#006653] tracking-wider selection:bg-emerald-200">
              {protocoloGerado}
            </div>

            <div className="mt-3 flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopiarProtocolo}
                className="bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold text-xs h-8 gap-1.5 shadow-2xs"
              >
                {copiado ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Protocolo Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Copiar Código</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Resumo da solicitação */}
          {dadosCriados && (
            <div className="text-left bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-700 space-y-1 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Serviço:</span>
                <span className="font-semibold text-gray-800">{dadosCriados.categoria_servico || dadosCriados.categoria}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status Inicial:</span>
                <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                  Pendente
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Solicitante:</span>
                <span className="font-medium text-gray-800 truncate max-w-[180px]">{dadosCriados.nome_cidadao || dadosCriados.nome}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-col gap-2 sm:space-x-0">
            <Button
              type="button"
              onClick={() => {
                setSuccessDialogOpen(false);
                router.push(`/acompanhar?protocolo=${encodeURIComponent(protocoloGerado)}`);
              }}
              className="w-full bg-[#006653] hover:bg-[#004d3e] text-white font-semibold text-xs h-10 gap-2 shadow-sm"
            >
              <FileText className="w-4 h-4" />
              <span>Acompanhar Andamento da Demanda</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSuccessDialogOpen(false);
                router.push(`/meus-chamados?protocolo=${encodeURIComponent(protocoloGerado)}`);
              }}
              className="w-full border-gray-300 text-gray-700 hover:bg-emerald-50 text-xs h-9 gap-2"
            >
              <ClipboardList className="w-4 h-4 text-emerald-700" />
              <span>Ver em Meus Chamados</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSuccessDialogOpen(false);
              }}
              className="w-full text-gray-500 hover:bg-gray-100 text-xs h-8"
            >
              Abrir Outra Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
