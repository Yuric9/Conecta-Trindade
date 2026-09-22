import { createClient, type User } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import type { UserRole } from '@/lib/types';

export interface AuthContext {
  user: User;
  role: UserRole;
}

function getConfiguredClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_NOT_CONFIGURED');

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export async function getRequestAuth(req: NextRequest): Promise<AuthContext | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  const client = getConfiguredClient(token);
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return null;

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile?.role) return null;
  return { user, role: profile.role as UserRole };
}

export function hasStaffAccess(role: UserRole): boolean {
  return ['admin', 'servidor', 'fiscal', 'gestor', 'atendente'].includes(role);
}

export function hasAdminAccess(role: UserRole): boolean {
  return role === 'admin';
}
