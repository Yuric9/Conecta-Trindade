'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Lock, ArrowRight, AlertCircle, User, Phone } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/meus-chamados');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nome, cpf, telefone, role: 'cidadao' },
          },
        });
        if (error) throw error;
        if (data.user) {
          router.push('/meus-chamados');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-[#F4F6F8] to-blue-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-full bg-[#0A3A7A] items-center justify-center mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl font-heading">T</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-[#0A3A7A]">Conecta Trindade</h1>
          <p className="text-gray-500 text-sm mt-1">Zelo Urbano · Prefeitura de Trindade</p>
        </div>

        <Card className="shadow-lg border-gray-200">
          <CardHeader className="space-y-1">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'login'
                    ? 'bg-[#1E5BC6] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'signup'
                    ? 'bg-[#1E5BC6] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Cadastrar
              </button>
            </div>
            <CardTitle className="text-xl text-[#0A3A7A] font-heading">
              {mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}
            </CardTitle>
            <CardDescription className="text-gray-500">
              {mode === 'login'
                ? 'Entre para registrar e acompanhar solicitações'
                : 'Cadastre-se para contribuir com o zelo urbano de Trindade'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nome" className="text-sm font-medium text-gray-700">Nome completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="nome"
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="pl-10"
                        placeholder="Seu nome completo"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="cpf" className="text-sm font-medium text-gray-700">CPF</Label>
                      <Input
                        id="cpf"
                        type="text"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone" className="text-sm font-medium text-gray-700">Telefone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="telefone"
                          type="tel"
                          value={telefone}
                          onChange={(e) => setTelefone(e.target.value)}
                          className="pl-10"
                          placeholder="(62) 99999-9999"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#1E5BC6] hover:bg-[#0A3A7A] text-white font-semibold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Aguarde...
                  </span>
                ) : (
                  <>
                    {mode === 'login' ? 'Entrar' : 'Criar conta'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-4">
              Ao continuar, você concorda com os termos de uso da plataforma municipal.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/" className="text-[#1E5BC6] hover:underline">
            Voltar para o início
          </Link>
        </p>
      </div>
    </div>
  );
}
