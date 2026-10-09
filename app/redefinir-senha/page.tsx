'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KeyRound, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

/**
 * Criar senha nova. Serve para:
 *  - quem chegou pelo link do e-mail "Esqueci minha senha" (o Supabase abre
 *    uma sessão temporária a partir do link);
 *  - quem já está logado e quer trocar a senha (link no Perfil).
 */
export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<'verificando' | 'pronto' | 'sem-sessao' | 'concluido'>('verificando');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setEstado('sem-sessao');
      return;
    }
    let ativo = true;
    // O link do e-mail traz o acesso na URL; o Supabase o lê sozinho.
    const { data: inscricao } = supabase.auth.onAuthStateChange((evento: string, sessao: unknown) => {
      if (!ativo) return;
      if (sessao && (evento === 'PASSWORD_RECOVERY' || evento === 'SIGNED_IN' || evento === 'INITIAL_SESSION')) {
        setEstado('pronto');
      }
    });
    supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => {
      if (ativo && data.session) setEstado('pronto');
    });
    // Sem sessão depois de alguns segundos: link inválido ou expirado.
    const limite = setTimeout(() => {
      if (ativo) setEstado((atual) => (atual === 'verificando' ? 'sem-sessao' : atual));
    }, 4000);
    return () => {
      ativo = false;
      clearTimeout(limite);
      inscricao?.subscription?.unsubscribe();
    };
  }, []);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (senha.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (senha !== confirmacao) {
      setErro('As duas senhas não são iguais.');
      return;
    }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      if (/different|same/i.test(error.message)) setErro('A senha nova precisa ser diferente da anterior.');
      else if (/weak|password/i.test(error.message)) setErro('Senha fraca: use letras e números, com pelo menos 8 caracteres.');
      else setErro('Não foi possível salvar a senha. Peça um novo link e tente de novo.');
      return;
    }
    setEstado('concluido');
    setTimeout(() => router.push('/'), 2500);
  };

  return (
    <div className="min-h-[calc(100vh-200px)] bg-[#eef1ef] px-4 py-10">
      <div className="max-w-md mx-auto">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#004d3e] font-heading font-bold flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Criar senha nova
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Escolha uma senha com pelo menos 8 caracteres. Só você vai saber essa senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {estado === 'verificando' && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Conferindo o link...
              </p>
            )}

            {estado === 'sem-sessao' && (
              <div className="space-y-4">
                <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  O link é inválido ou já expirou. Peça um link novo.
                </p>
                <Link href="/esqueci-senha" className="block text-center text-sm font-semibold text-[#006653] hover:underline">
                  Pedir novo link
                </Link>
              </div>
            )}

            {estado === 'concluido' && (
              <p className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                Senha alterada! Já pode usar a senha nova.
              </p>
            )}

            {estado === 'pronto' && (
              <form onSubmit={salvar} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="senha" className="text-xs font-semibold text-gray-700">
                    Senha nova
                  </Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={mostrar ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="pr-10 h-10 text-sm"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setMostrar((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmacao" className="text-xs font-semibold text-gray-700">
                    Repita a senha nova
                  </Label>
                  <Input
                    id="confirmacao"
                    type={mostrar ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
                    className="h-10 text-sm"
                    minLength={8}
                    required
                  />
                </div>
                {erro && (
                  <p className="flex items-start gap-1.5 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {erro}
                  </p>
                )}
                <Button type="submit" disabled={salvando} className="w-full h-11 bg-[#006653] hover:bg-[#005847] text-white font-bold">
                  {salvando ? 'Salvando...' : 'Salvar senha nova'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
