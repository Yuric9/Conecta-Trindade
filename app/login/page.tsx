'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { validarCPF, formatarCPF, formatarTelefone } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  User,
  Phone,
  ShieldCheck,
  Building2,
  Eye,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';

type UserPortalType = 'cidadao' | 'servidor';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Portal type: Cidadão ou Servidor Municipal
  const [portal, setPortal] = useState<UserPortalType>('cidadao');
  // Citizen can toggle between login and signup; Servidores only log in
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Cadastro de Cidadão
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [securityNotice, setSecurityNotice] = useState('');

  useEffect(() => {
    if (searchParams.get('unauthorized') === 'admin') {
      setPortal('servidor');
      setSecurityNotice('Acesso restrito: é necessária autenticação de servidor municipal autorizado.');
    }
  }, [searchParams]);

  const handlePortalSwitch = (target: UserPortalType) => {
    setPortal(target);
    setError('');
    setSecurityNotice('');
    if (target === 'servidor') {
      setMode('login'); // Servidores do not self-register publicly
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSecurityNotice('');

    if (portal === 'cidadao' && mode === 'signup') {
      if (!nome.trim() || nome.trim().split(' ').length < 2) {
        setError('Por favor, informe seu nome e sobrenome completo.');
        return;
      }
      if (!validarCPF(cpf)) {
        setError('O CPF informado é inválido. Por favor, confira os números digitados.');
        return;
      }
      if (telefone.replace(/\D/g, '').length < 10) {
        setError('O telefone informado deve conter DDD e número válido.');
        return;
      }
      if (password.length < 6) {
        setError('A senha deve conter no mínimo 6 caracteres.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) {
          throw new Error('Credenciais inválidas. Verifique seu e-mail e senha.');
        }

        const userId = authData?.user?.id;

        // Buscar perfil e role no banco de dados com segurança
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        const isAuthorizedStaff = ['admin', 'servidor', 'fiscal', 'gestor', 'atendente'].includes(profileData?.role);

        // Validação de Regra de Segurança:
        // Se tentou entrar pelo portal do Servidor Municipal, exige permissão de admin
        if (portal === 'servidor') {
          if (!isAuthorizedStaff) {
            // Desconecta sessão não autorizada para o painel de servidor
            await supabase.auth.signOut();
            throw new Error(
              'Acesso restrito: esta conta não possui privilégios de gestor ou servidor municipal. Utilize a Área do Cidadão.'
            );
          }
          router.push('/admin');
          return;
        }

        // Se entrou pelo portal do cidadão mas é admin, direciona para meus chamados ou admin
        if (profileData?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/meus-chamados');
        }
      } else {
        // Cadastro exclusivo de Munícipe / Cidadão
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              nome: nome.trim(),
              cpf: formatarCPF(cpf),
              telefone: formatarTelefone(telefone),
            },
          },
        });

        if (signUpError) throw signUpError;
        if (data.user) {
          router.push('/meus-chamados');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-10 bg-gradient-to-b from-emerald-50/40 via-white to-gray-50">
      <div className="w-full max-w-md">
        {/* Cabeçalho de Identidade */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <img
              src="/images/logo-trindade.png"
              alt="Prefeitura de Trindade"
              className="h-14 w-auto object-contain drop-shadow-sm"
            />
          </div>
          <h1 className="text-xl font-bold text-[#004d3e] font-heading">
            Conecta Trindade · Zelo Urbano
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Plataforma Digital de Atendimento e Gestão dos Serviços Municipais
          </p>
        </div>

        {/* Seletor de Perfil / Portal com Segregação Estrita */}
        <div className="grid grid-cols-2 p-1 bg-gray-100/90 rounded-xl mb-4 border border-gray-200">
          <button
            type="button"
            onClick={() => handlePortalSwitch('cidadao')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
              portal === 'cidadao'
                ? 'bg-white text-[#005847] shadow-sm ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Área do Cidadão
          </button>
          <button
            type="button"
            onClick={() => handlePortalSwitch('servidor')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
              portal === 'servidor'
                ? 'bg-[#004d3e] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Servidor / Gestão
          </button>
        </div>

        <Card className="shadow-lg border-gray-200/90 overflow-hidden">
          {/* Tarja de Segurança para Servidores */}
          {portal === 'servidor' && (
            <div className="bg-gradient-to-r from-emerald-900 via-[#005847] to-emerald-900 px-4 py-2.5 text-white flex items-center gap-2.5 text-xs font-medium border-b border-emerald-800">
              <ShieldAlert className="w-4 h-4 text-[#FFC20E] shrink-0" />
              <span>Acesso restrito e monitorado para servidores públicos municipais.</span>
            </div>
          )}

          <CardHeader className="space-y-2 pt-6">
            {/* Alternador Entrar / Cadastrar (apenas para Cidadão) */}
            {portal === 'cidadao' ? (
              <div className="flex gap-2 p-1 bg-gray-50 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    mode === 'login'
                      ? 'bg-[#006653] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    mode === 'signup'
                      ? 'bg-[#006653] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Cadastrar Munícipe
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>Secretarias e Equipes Operacionais</span>
              </div>
            )}

            <CardTitle className="text-lg text-[#004d3e] font-heading font-bold pt-1">
              {portal === 'servidor'
                ? 'Painel Administrativo Municipal'
                : mode === 'login'
                ? 'Acesse seus protocolos'
                : 'Novo Cadastro de Cidadão'}
            </CardTitle>

            <CardDescription className="text-xs text-gray-500">
              {portal === 'servidor'
                ? 'Digite suas credenciais autorizadas para gerenciar chamados e despachos.'
                : mode === 'login'
                ? 'Acompanhe o andamento das solicitações de zelo urbano do seu bairro.'
                : 'Cadastre-se para solicitar reparos, iluminação e limpeza pública.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {securityNotice && (
              <Alert className="bg-amber-50 border-amber-300 text-amber-900 py-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs font-medium">
                  {securityNotice}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Campos adicionais para cadastro de Cidadão */}
              {portal === 'cidadao' && mode === 'signup' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="nome" className="text-xs font-semibold text-gray-700">
                      Nome completo
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="nome"
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="pl-9 text-sm h-10"
                        placeholder="Ex: Maria da Silva"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="cpf" className="text-xs font-semibold text-gray-700">
                        CPF
                      </Label>
                      <Input
                        id="cpf"
                        type="text"
                        value={cpf}
                        onChange={(e) => setCpf(formatarCPF(e.target.value))}
                        className="text-sm h-10"
                        placeholder="000.000.000-00"
                        maxLength={14}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="telefone" className="text-xs font-semibold text-gray-700">
                        Telefone (WhatsApp)
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <Input
                          id="telefone"
                          type="tel"
                          value={telefone}
                          onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                          className="pl-8 text-sm h-10"
                          placeholder="(62) 99999-9999"
                          maxLength={15}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Campo E-mail */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-gray-700">
                  {portal === 'servidor' ? 'E-mail funcional / corporativo' : 'E-mail'}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-sm h-10"
                    placeholder={
                      portal === 'servidor'
                        ? 'servidor@trindade.go.gov.br'
                        : 'seuemail@exemplo.com'
                    }
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-gray-700">
                    Senha
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 text-sm h-10"
                    placeholder="••••••••"
                    minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botão de Envio Principal */}
              <Button
                type="submit"
                disabled={loading}
                className={`w-full text-white font-bold h-11 text-sm shadow-md transition-all ${
                  portal === 'servidor'
                    ? 'bg-[#004d3e] hover:bg-[#00382d]'
                    : 'bg-[#006653] hover:bg-[#005847]'
                }`}
              >
                {loading ? (
                  'Verificando credenciais...'
                ) : portal === 'servidor' ? (
                  <span className="flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Acessar Painel de Gestão
                  </span>
                ) : mode === 'login' ? (
                  <span className="flex items-center justify-center gap-2">
                    Entrar no Conecta Trindade
                    <ArrowRight className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Concluir Cadastro
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Rodapé Informativo de Segurança */}
            <div className="pt-3 border-t border-gray-100 text-center">
              <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Ambiente criptografado e seguro · Lei Geral de Proteção de Dados (LGPD)
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-5">
          <Link
            href="/"
            className="text-xs font-semibold text-[#006653] hover:text-[#004d3e] hover:underline transition-colors"
          >
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
