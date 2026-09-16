'use client';

import React, { useState } from 'react';
import type { CityConfig } from '@/lib/city-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Phone,
  MessageSquare,
  Building,
  Bell,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';

interface AdminConfigTabProps {
  config: CityConfig;
  onSaveConfig: (nextConfig: CityConfig) => void;
}

export default function AdminConfigTab({ config, onSaveConfig }: AdminConfigTabProps) {
  const [ouvidoriaWhatsapp, setOuvidoriaWhatsapp] = useState(config.ouvidoriaWhatsapp);
  const [disqueLimpezaTelefone, setDisqueLimpezaTelefone] = useState(config.disqueLimpezaTelefone);
  const [horarioAtendimento, setHorarioAtendimento] = useState(config.horarioAtendimento);
  const [palacioEndereco, setPalacioEndereco] = useState(config.palacioEndereco);
  const [avisoAtivo, setAvisoAtivo] = useState(config.avisoCidadao.ativo);
  const [avisoTipo, setAvisoTipo] = useState<'info' | 'alerta' | 'urgente'>(config.avisoCidadao.tipo);
  const [avisoMensagem, setAvisoMensagem] = useState(config.avisoCidadao.mensagem);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextConfig: CityConfig = {
      ouvidoriaWhatsapp: ouvidoriaWhatsapp.trim(),
      disqueLimpezaTelefone: disqueLimpezaTelefone.trim(),
      horarioAtendimento: horarioAtendimento.trim(),
      palacioEndereco: palacioEndereco.trim(),
      avisoCidadao: {
        ativo: avisoAtivo,
        tipo: avisoTipo,
        mensagem: avisoMensagem.trim(),
      },
    };
    onSaveConfig(nextConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-[#006653] font-bold text-lg">
            <Settings className="w-6 h-6" />
            <h2>Parâmetros e Configurações Municipais</h2>
          </div>
          <p className="text-gray-500 text-xs mt-1">
            Gerencie canais de contato da Ouvidoria, Disque Limpeza Urbana e mensagens oficiais aos cidadãos de Trindade.
          </p>
        </div>
        <Button
          type="submit"
          className="bg-[#006653] hover:bg-[#004d3e] text-white font-semibold text-xs h-10 px-5 flex items-center gap-2 shadow-sm"
        >
          {savedSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'Parâmetros Salvos!' : 'Salvar Alterações'}</span>
        </Button>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Configurações municipais salvas com sucesso no banco de dados local.</span>
        </div>
      )}

      {/* Canais de Atendimento ao Cidadão */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#006653]" />
            <span>Canais de Atendimento e Ouvidoria</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-gray-700">WhatsApp Oficial da Ouvidoria</Label>
              <Input
                type="text"
                value={ouvidoriaWhatsapp}
                onChange={(e) => setOuvidoriaWhatsapp(e.target.value)}
                placeholder="Ex: 556235067000"
                className="h-9 text-xs mt-1"
              />
              <p className="text-[10.5px] text-gray-400 mt-1">Utilizado nos links rápidos de compartilhamento e SAC municipal.</p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Telefone do Disque Limpeza Urbana (RSU)</Label>
              <Input
                type="text"
                value={disqueLimpezaTelefone}
                onChange={(e) => setDisqueLimpezaTelefone(e.target.value)}
                placeholder="Ex: (62) 3506-7028"
                className="h-9 text-xs mt-1"
              />
              <p className="text-[10.5px] text-gray-400 mt-1">Exibido na página pública do cronograma de coleta de lixo.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Horário Oficial de Expediente</Label>
              <Input
                type="text"
                value={horarioAtendimento}
                onChange={(e) => setHorarioAtendimento(e.target.value)}
                placeholder="Ex: Segunda a Sexta das 07:30 às 17:30"
                className="h-9 text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Endereço do Paço Municipal</Label>
              <Input
                type="text"
                value={palacioEndereco}
                onChange={(e) => setPalacioEndereco(e.target.value)}
                placeholder="Praça Constantino Xavier, nº 330, Centro"
                className="h-9 text-xs mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Banner de Aviso Geral para o Cidadão */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#006653]" />
            <span>Alerta & Comunicado Institucional para os Cidadãos</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-xs font-semibold text-gray-800">Exibir Comunicado Oficial na Tela Inicial</p>
              <p className="text-[11px] text-gray-500">Mostra uma barra de aviso em destaque para todos os munícipes ao abrirem o app.</p>
            </div>
            <button
              type="button"
              onClick={() => setAvisoAtivo(!avisoAtivo)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                avisoAtivo ? 'bg-[#006653]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  avisoAtivo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Tipo de Alerta</Label>
              <Select value={avisoTipo} onValueChange={(v) => setAvisoTipo(v as any)}>
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">ℹ️ Informativo (Azul/Verde)</SelectItem>
                  <SelectItem value="alerta">⚠️ Alerta Operacional (Amarelo)</SelectItem>
                  <SelectItem value="urgente">🚨 Emergencial / Chuvas (Vermelho)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold text-gray-700">Texto do Comunicado</Label>
              <Textarea
                rows={2}
                value={avisoMensagem}
                onChange={(e) => setAvisoMensagem(e.target.value)}
                placeholder="Digite o texto que será lido pelos moradores..."
                className="text-xs mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
