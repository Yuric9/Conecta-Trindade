'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * "Esqueci minha senha": o Supabase envia um link para o e-mail; o link abre
 * /redefinir-senha, onde a pessoa cria a senha nova. Ninguém (nem o admin)
 * vê senhas: elas ficam guardadas só como hash.
 */
export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    const endereco = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(endereco)) {
      setErro('Digite um e-mail válido.');
      return;
    }
    setEnviando(true);
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(endereco, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      // Limite de envio do Supabase: avisa para tentar mais tarde.
      if (error && /rate|limit|security purposes/i.test(error.message)) {
        setEnviando(false);
        setErro('Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.');
        return;
      }
      if (error) console.error('Erro ao pedir redefinição de senha:', error);
    }
    // A mesma mensagem com ou sem conta: não revela quais e-mails estão cadastrados.
    setEnviando(false);
    setEnviado(true);
  };

  return (
    <div className="min-h-[calc(100vh-200px)] bg-[#eef1ef] px-4 py-10">
      <div className="max-w-md mx-auto">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#004d3e] font-heading font-bold flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Esqueci minha senha
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Digite o e-mail da sua conta. Vamos enviar um link para você criar uma senha nova.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enviado ? (
              <div className="space-y-4">
                <p className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>
                    Se existir uma conta com <strong>{email.trim()}</strong>, o link chega em alguns minutos. Confira
                    também a caixa de spam.
                  </span>
                </p>
                <Link href="/login" className="block text-center text-sm font-semibold text-[#006653] hover:underline">
                  Voltar para o login
                </Link>
              </div>
            ) : (
              <form onSubmit={enviar} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-gray-700">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-10 text-sm"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>
                {erro && (
                  <p className="flex items-start gap-1.5 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {erro}
                  </p>
                )}
                <Button type="submit" disabled={enviando} className="w-full h-11 bg-[#006653] hover:bg-[#005847] text-white font-bold">
                  {enviando ? 'Enviando...' : 'Enviar link'}
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Servidor da prefeitura sem acesso ao e-mail? Peça ao administrador uma senha nova.
                </p>
                <Link href="/login" className="block text-center text-sm font-semibold text-[#006653] hover:underline">
                  Voltar para o login
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
