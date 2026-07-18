import { withSupabase } from 'npm:@supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { headers: corsHeaders, status });
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default {
  fetch: withSupabase({ auth: ['publishable', 'none'] }, async (request, ctx) => {
    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (request.method !== 'POST' || ctx.authMode !== 'publishable') {
      return json({ message: 'Solicitud no autorizada.' }, 401);
    }

    const body = await request.json().catch(() => null);
    const sessionToken = typeof body?.sessionToken === 'string' ? body.sessionToken : '';
    if (!sessionToken) {
      return json({ message: 'Sesión no válida.' }, 400);
    }

    const sessionTokenHash = await sha256(sessionToken);
    const { data: session, error } = await ctx.supabaseAdmin
      .from('work_sessions')
      .select('id, operator_id, credential_id')
      .eq('session_token_hash', sessionTokenHash)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !session) {
      return json({ message: 'La sesión ya no está disponible.' }, 401);
    }

    const endedAt = new Date().toISOString();
    const { error: closeError } = await ctx.supabaseAdmin
      .from('work_sessions')
      .update({ ended_at: endedAt, end_reason: 'user_logout', status: 'closed' })
      .eq('id', session.id)
      .eq('status', 'active');

    if (closeError) {
      return json({ message: 'No fue posible cerrar la sesión.' }, 500);
    }

    await ctx.supabaseAdmin.from('auth_events').insert({
      event_type: 'logout',
      success: true,
      operator_id: session.operator_id,
      credential_id: session.credential_id,
      session_id: session.id,
    });

    return json({ ok: true });
  }),
};
