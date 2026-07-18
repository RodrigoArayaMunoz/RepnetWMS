import { withSupabase } from 'npm:@supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const QR_PATTERN = /^repnet:v1:([0-9a-f]{64})$/;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { headers: corsHeaders, status });
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createSessionToken() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const binary = String.fromCharCode(...randomBytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
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
    const qrValue = typeof body?.qrValue === 'string' ? body.qrValue.trim() : '';
    const scanSource = body?.scanSource === 'pda_imager' ? 'pda_imager' : 'camera';
    const qrMatch = QR_PATTERN.exec(qrValue);

    if (!qrMatch) {
      await ctx.supabaseAdmin.from('auth_events').insert({
        event_type: 'login_rejected',
        success: false,
        reason_code: 'invalid_qr_format',
        scan_source: scanSource,
      });
      return json({ message: 'La credencial QR no es válida.' }, 401);
    }

    const tokenHash = await sha256(qrMatch[1]);
    const { data: credential, error: credentialError } = await ctx.supabaseAdmin
      .from('operator_credentials')
      .select(
        'id, operator_id, status, valid_from, expires_at, operator:operators!inner(id, employee_code, display_name, status, warehouse_id)'
      )
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (credentialError || !credential) {
      await ctx.supabaseAdmin.from('auth_events').insert({
        event_type: 'login_rejected',
        success: false,
        reason_code: 'credential_not_found',
        scan_source: scanSource,
      });
      return json({ message: 'La credencial no está autorizada.' }, 401);
    }

    const operator = credential.operator;
    const now = new Date();
    const credentialExpired = credential.expires_at && new Date(credential.expires_at) <= now;
    const credentialNotStarted = new Date(credential.valid_from) > now;

    if (
      credential.status !== 'active' ||
      credentialExpired ||
      credentialNotStarted ||
      !operator ||
      operator.status !== 'active'
    ) {
      await ctx.supabaseAdmin.from('auth_events').insert({
        event_type: 'login_rejected',
        success: false,
        operator_id: credential.operator_id,
        credential_id: credential.id,
        reason_code: 'credential_or_operator_inactive',
        scan_source: scanSource,
      });
      return json({ message: 'El colaborador no está habilitado para ingresar.' }, 401);
    }

    const { data: roles, error: rolesError } = await ctx.supabaseAdmin
      .from('operator_roles')
      .select('role_code')
      .eq('operator_id', credential.operator_id)
      .eq('warehouse_id', operator.warehouse_id);

    if (rolesError || !roles?.length) {
      await ctx.supabaseAdmin.from('auth_events').insert({
        event_type: 'login_rejected',
        success: false,
        operator_id: credential.operator_id,
        credential_id: credential.id,
        reason_code: 'missing_role',
        scan_source: scanSource,
      });
      return json({ message: 'El colaborador no tiene permisos asignados.' }, 403);
    }

    const { error: closeSessionError } = await ctx.supabaseAdmin
      .from('work_sessions')
      .update({ ended_at: now.toISOString(), end_reason: 'replaced_by_new_login', status: 'closed' })
      .eq('operator_id', credential.operator_id)
      .eq('status', 'active');

    if (closeSessionError) {
      return json({ message: 'No fue posible preparar la sesión.' }, 500);
    }

    const sessionToken = createSessionToken();
    const sessionTokenHash = await sha256(sessionToken);
    const { data: session, error: sessionError } = await ctx.supabaseAdmin
      .from('work_sessions')
      .insert({
        credential_id: credential.id,
        operator_id: credential.operator_id,
        scan_source: scanSource,
        session_token_hash: sessionTokenHash,
      })
      .select('id')
      .single();

    if (sessionError || !session) {
      return json({ message: 'No fue posible iniciar la sesión.' }, 500);
    }

    await Promise.all([
      ctx.supabaseAdmin
        .from('operator_credentials')
        .update({ last_used_at: now.toISOString() })
        .eq('id', credential.id),
      ctx.supabaseAdmin.from('auth_events').insert({
        event_type: 'login_succeeded',
        success: true,
        operator_id: credential.operator_id,
        credential_id: credential.id,
        session_id: session.id,
        scan_source: scanSource,
      }),
    ]);

    return json({
      operator: {
        displayName: operator.display_name,
        employeeCode: operator.employee_code,
        id: operator.id,
        roles: roles.map((role) => role.role_code),
        warehouseId: operator.warehouse_id,
      },
      sessionId: session.id,
      sessionToken,
    });
  }),
};
