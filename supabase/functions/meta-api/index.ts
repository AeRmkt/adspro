// AdsPro — Edge Function que substitui a API (Railway) sem custo.
// Lê o token Meta (por usuário via OAuth, ou o token compartilhado de config) e chama a Graph API.
// Roteia os caminhos /api/* que o frontend consome, incluindo OAuth e escrita de status.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const META = "https://graph.facebook.com/v19.0";
const FB_DIALOG = "https://www.facebook.com/v19.0/dialog/oauth";

const APP_ID = Deno.env.get("META_APP_ID") ?? "1230523169225608";
const WEB_URL = Deno.env.get("ADSPRO_WEB_URL") ?? "https://adspro-web.vercel.app";
// App secret: env (se setado como secret) ou tabela adspro_config (key='meta_app_secret').
async function getAppSecret(): Promise<string> {
  return Deno.env.get("META_APP_SECRET") ?? (await getConfig("meta_app_secret")) ?? "";
}
// Redirect precisa bater EXATAMENTE com o cadastrado no app Meta.
const REDIRECT_URI =
  Deno.env.get("META_REDIRECT_URI") ??
  `${Deno.env.get("SUPABASE_URL")}/functions/v1/meta-api/api/auth/meta/callback`;
const OAUTH_SCOPE = "ads_read,ads_management,business_management,read_insights,pages_show_list";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// ─── Auth do usuário logado (JWT do Supabase) ───────────────────────────────
async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  try {
    const { data } = await admin().auth.getUser(jwt);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function getConfig(key: string): Promise<string | null> {
  const { data } = await admin().from("adspro_config").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

// Token do usuário (OAuth) se existir; senão o token compartilhado (config/env).
async function getSharedToken(): Promise<string | null> {
  const envTok = Deno.env.get("META_ACCESS_TOKEN");
  if (envTok) return envTok;
  return await getConfig("meta_access_token");
}

async function getUserToken(userId: string | null): Promise<string | null> {
  if (userId) {
    const { data } = await admin()
      .from("adspro_user_meta")
      .select("access_token")
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.access_token) return data.access_token;
  }
  return await getSharedToken();
}

// Mapa conta→token (config meta_account_tokens, JSON). Algumas contas só são
// acessíveis por um token específico (ex.: system user). Cai no fallback se não houver.
async function getAccountTokens(): Promise<Record<string, string>> {
  const raw = await getConfig("meta_account_tokens");
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, string>; } catch { return {}; }
}

async function tokenForAccount(accountId: string, fallback: string): Promise<string> {
  const id = accountId.replace(/^act_/, "");
  if (!id) return fallback;
  const map = await getAccountTokens();
  return map[id] || fallback;
}

// ─── Graph helpers ──────────────────────────────────────────────────────────
async function graph<T>(endpoint: string, params: Record<string, string>, token: string): Promise<T> {
  const url = new URL(`${META}/${endpoint}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const j = await res.json();
  if (j.error) throw new Error(`Meta ${j.error.code}: ${j.error.message}`);
  return j as T;
}

async function graphPost(endpoint: string, params: Record<string, string>, token: string): Promise<unknown> {
  const body = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`${META}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const j = await res.json();
  if (j.error) throw new Error(`Meta ${j.error.code}: ${j.error.message}`);
  return j;
}

async function graphAll<T>(endpoint: string, params: Record<string, string>, token: string): Promise<T[]> {
  const out: T[] = [];
  let after: string | undefined;
  do {
    const p = { ...params };
    if (after) p["after"] = after;
    const page = await graph<{ data: T[]; paging?: { cursors?: { after?: string } } }>(endpoint, p, token);
    out.push(...(page.data ?? []));
    after = page.paging?.cursors?.after;
  } while (after);
  return out;
}

// ─── Datas ───────────────────────────────────────────────────────────────────
// As contas reportam no fuso delas; usar UTC desloca o dia e faz o número
// divergir do Gerenciador de Anúncios.
const ACCOUNT_TZ = Deno.env.get("ADSPRO_ACCOUNT_TZ") ?? "America/Sao_Paulo";

/** "YYYY-MM-DD" de hoje no fuso da conta. */
function todayInTz(timeZone = ACCOUNT_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Soma dias a uma data "YYYY-MM-DD" (aritmética de calendário, sem fuso). */
function shiftDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Dias inteiros entre duas datas "YYYY-MM-DD". */
function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

// ─── parseInsights (portado de metaApi.ts) ───────────────────────────────────
type Action = { action_type: string; value: string };
const num = (v: unknown) => parseFloat(String(v ?? "0")) || 0;
const act = (arr: Action[] | undefined, t: string) => num(arr?.find((a) => a.action_type === t)?.value);

function parseInsights(d: Record<string, unknown> | undefined) {
  const data = d ?? {};
  const actions = data.actions as Action[] | undefined;
  const actionValues = data.action_values as Action[] | undefined;
  const outbound = data.outbound_clicks as Action[] | undefined;
  const outboundCtr = data.outbound_clicks_ctr as Action[] | undefined;

  const spend = num(data.spend);
  const purchases = act(actions, "purchase");
  const purchaseValue = act(actionValues, "purchase");
  const leads = act(actions, "lead");
  const conversations = act(actions, "onsite_conversion.messaging_conversation_started_7d");
  const linkClicks = act(outbound, "outbound_click") || act(actions, "link_click");
  const roas = purchaseValue > 0 && spend > 0 ? purchaseValue / spend : 0;
  const results = purchases || leads || 0;

  return {
    spend,
    impressions: num(data.impressions),
    clicks: num(data.clicks),
    reach: num(data.reach),
    frequency: num(data.frequency),
    ctr: num(data.ctr),
    cpm: num(data.cpm),
    cpp: num(data.cpp),
    cpc: num(data.cpc),
    purchases,
    purchaseValue,
    roas,
    addToCart: act(actions, "add_to_cart"),
    leads,
    costPerLead: leads > 0 ? spend / leads : null,
    costPerPurchase: purchases > 0 ? spend / purchases : null,
    linkClicks,
    ctrLink: num(outboundCtr?.find((a) => a.action_type === "outbound_click")?.value),
    cpcLink: linkClicks > 0 ? spend / linkClicks : 0,
    websiteViews: act(actions, "landing_page_view"),
    videoViews: act(actions, "video_view"),
    pageEngagements: act(actions, "page_engagement"),
    conversations,
    costPerConversation: conversations > 0 ? spend / conversations : null,
    results,
    costPerResult: results > 0 ? spend / results : null,
    revenueByUtm: purchaseValue,
    roardByUtm: roas,
    resultsByUtm: results,
    ticketAverage: purchases > 0 ? purchaseValue / purchases : null,
  };
}

const INSIGHT_FIELDS =
  "spend,impressions,clicks,reach,frequency,ctr,cpm,cpp,cpc,actions,action_values,cost_per_action_type,outbound_clicks,outbound_clicks_ctr";

const ACCOUNT_FIELDS = "id,name,account_status,currency,timezone_name,balance,amount_spent,spend_cap";

function mapAccount(a: Record<string, unknown>) {
  const metaId = String(a.id).replace(/^act_/, "");
  const now = new Date().toISOString();
  const cents = (v: unknown) => (v == null ? null : num(v) / 100);
  return {
    id: metaId,
    userId: "self",
    metaAccountId: metaId,
    accountName: (a.name as string) || metaId,
    currency: (a.currency as string) || "BRL",
    timezone: (a.timezone_name as string) || "America/Sao_Paulo",
    accountStatus: (a.account_status as number) ?? 1,
    balance: cents(a.balance),
    amountSpent: cents(a.amount_spent),
    spendCap: a.spend_cap != null && num(a.spend_cap) > 0 ? num(a.spend_cap) / 100 : null,
    isActive: true,
    isPrincipal: false,
    source: "oauth",
    connectedAt: now,
    lastSyncAt: now,
  };
}

// Adiciona contas fixadas em config (meta_extra_accounts) que devem SEMPRE aparecer,
// buscando cada uma diretamente. Se o token não tiver acesso, ignora silenciosamente.
async function appendExtraAccounts(token: string, out: ReturnType<typeof mapAccount>[], seen: Set<string>) {
  const extras = (await getConfig("meta_extra_accounts")) || "";
  for (const raw of extras.split(",").map((x) => x.trim().replace(/^act_/, "")).filter(Boolean)) {
    if (seen.has(raw)) continue;
    try {
      const t = await tokenForAccount(raw, token);
      const a = await graph<Record<string, unknown>>(`act_${raw}`, { fields: ACCOUNT_FIELDS }, t);
      const acc = mapAccount(a);
      seen.add(acc.id);
      out.push(acc);
    } catch (_e) { /* sem acesso a essa conta → ignora */ }
  }
}

// Lista contas: tenta me/adaccounts (token de usuário → traz TODAS); se falhar
// (token de página), agrega owned_ad_accounts + client_ad_accounts dos businesses configurados.
// Em ambos os casos, mescla as contas extras fixadas (meta_extra_accounts).
async function listAccounts(token: string) {
  const seen = new Set<string>();
  const out: ReturnType<typeof mapAccount>[] = [];

  try {
    const raw = await graphAll<Record<string, unknown>>("me/adaccounts", { fields: ACCOUNT_FIELDS, limit: "500" }, token);
    for (const a of raw) {
      const acc = mapAccount(a);
      if (!seen.has(acc.id)) { seen.add(acc.id); out.push(acc); }
    }
  } catch (_e) { /* token de página: cai no fallback abaixo */ }

  if (out.length === 0) {
    const bizCsv = (await getConfig("meta_business_ids")) || "660046657198021";
    for (const biz of bizCsv.split(",").map((b) => b.trim()).filter(Boolean)) {
      for (const edge of ["owned_ad_accounts", "client_ad_accounts"]) {
        try {
          const raw = await graphAll<Record<string, unknown>>(`${biz}/${edge}`, { fields: ACCOUNT_FIELDS, limit: "500" }, token);
          for (const a of raw) {
            const acc = mapAccount(a);
            if (!seen.has(acc.id)) { seen.add(acc.id); out.push(acc); }
          }
        } catch (_e) { /* ignora business sem acesso */ }
      }
    }
  }

  await appendExtraAccounts(token, out, seen);
  return out;
}

// ─── OAuth ───────────────────────────────────────────────────────────────────
async function buildOAuthUrl(userId: string): Promise<string> {
  const { data } = await admin().from("adspro_oauth_state").insert({ user_id: userId }).select("state").single();
  const state = data!.state as string;
  const u = new URL(FB_DIALOG);
  u.searchParams.set("client_id", APP_ID);
  u.searchParams.set("redirect_uri", REDIRECT_URI);
  u.searchParams.set("state", state);
  u.searchParams.set("scope", OAUTH_SCOPE);
  u.searchParams.set("response_type", "code");
  return u.toString();
}

function redirectWeb(qs: string): Response {
  return new Response(null, { status: 302, headers: { ...cors, Location: `${WEB_URL}/auth/meta/callback?${qs}` } });
}

async function handleCallback(code: string, state: string): Promise<Response> {
  const sb = admin();
  // Consome o state (identifica o usuário) e limpa states antigos.
  const { data: st } = await sb.from("adspro_oauth_state").select("user_id").eq("state", state).maybeSingle();
  if (!st) return redirectWeb(`error=${encodeURIComponent("Sessão de conexão expirada. Tente novamente.")}`);
  const userId = st.user_id as string;
  await sb.from("adspro_oauth_state").delete().eq("state", state);
  await sb.from("adspro_oauth_state").delete().lt("created_at", new Date(Date.now() - 3600_000).toISOString());

  try {
    const APP_SECRET = await getAppSecret();
    // code → token curto (chamada direta; não passa access_token, usa client_secret)
    const shortUrl = new URL(`${META}/oauth/access_token`);
    shortUrl.searchParams.set("client_id", APP_ID);
    shortUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    shortUrl.searchParams.set("client_secret", APP_SECRET);
    shortUrl.searchParams.set("code", code);
    const shortRes = await fetch(shortUrl.toString());
    const short = await shortRes.json();
    if (short.error) throw new Error(short.error.message);

    // token curto → token longo (60 dias)
    const longUrl = new URL(`${META}/oauth/access_token`);
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", APP_ID);
    longUrl.searchParams.set("client_secret", APP_SECRET);
    longUrl.searchParams.set("fb_exchange_token", short.access_token);
    const longRes = await fetch(longUrl.toString());
    const longJson = await longRes.json();
    const token: string = longJson.access_token ?? short.access_token;
    const expiresIn: number = longJson.expires_in ?? 60 * 86400;

    const me = await graph<{ id: string; name: string }>("me", { fields: "id,name" }, token);

    await sb.from("adspro_user_meta").upsert({
      user_id: userId,
      fb_user_id: me.id,
      fb_user_name: me.name,
      access_token: token,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    return redirectWeb(`success=true&name=${encodeURIComponent(me.name)}`);
  } catch (err) {
    return redirectWeb(`error=${encodeURIComponent((err as Error).message)}`);
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const i = url.pathname.indexOf("/api/");
  const route = i >= 0 ? url.pathname.slice(i) : url.pathname;
  const q = url.searchParams;
  const accountId = (q.get("accountId") || "").replace(/^act_/, "");
  const from = q.get("from") || q.get("from1") || "";
  const to = q.get("to") || q.get("to1") || "";
  const tr = () => JSON.stringify({ since: from, until: to });

  // ── OAuth callback (público, vem do Facebook, sem JWT) ──
  if (route.includes("/auth/meta/callback")) {
    const code = q.get("code");
    const state = q.get("state") || "";
    const oauthErr = q.get("error_description") || q.get("error");
    if (oauthErr) return redirectWeb(`error=${encodeURIComponent(oauthErr)}`);
    if (!code) return redirectWeb(`error=${encodeURIComponent("Código de autorização ausente.")}`);
    return await handleCallback(code, state);
  }

  const userId = await getUserId(req);

  try {
    // ── Gerar URL de OAuth (precisa do usuário logado) ──
    if (route.includes("/auth/meta/url")) {
      if (!userId) return json({ error: "Não autenticado" }, 401);
      if (!(await getAppSecret())) return json({ error: "OAuth não configurado (falta META_APP_SECRET)." }, 500);
      return json({ url: await buildOAuthUrl(userId) });
    }

    // ── Desconectar ──
    if (route.includes("/auth/meta") && req.method === "DELETE") {
      if (userId) await admin().from("adspro_user_meta").delete().eq("user_id", userId);
      return json({ success: true });
    }

    const token = await getUserToken(userId);
    if (!token) {
      if (route.includes("/auth/meta/status")) return json({ connected: false, connection: null });
      return json({ data: [] });
    }
    // Token específico da conta selecionada (system user etc.), se houver.
    const acctToken = accountId ? await tokenForAccount(accountId, token) : token;

    // ── Status da conexão ──
    if (route.includes("/auth/meta/status")) {
      try {
        const me = await graph<{ id: string; name: string }>("me", { fields: "id,name" }, token);
        return json({
          connected: true,
          connection: {
            id: "1", userId: userId ?? "self", fbUserId: me.id, fbUserName: me.name,
            fbUserEmail: null, tokenExpiresAt: new Date(Date.now() + 60 * 864e5).toISOString(),
            tokenInvalid: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          },
        });
      } catch {
        return json({ connected: false, connection: null });
      }
    }

    // ── Escrita: ativar/pausar campanha, conjunto ou anúncio ──
    if (route.includes("/api/entity/status")) {
      const bodyText = await req.text();
      let id = q.get("id") || "";
      let status = (q.get("status") || "").toUpperCase();
      let acct = accountId;
      if (bodyText) {
        try {
          const b = JSON.parse(bodyText);
          id = b.id ?? id;
          status = String(b.status ?? status).toUpperCase();
          if (b.accountId) acct = String(b.accountId).replace(/^act_/, "");
        } catch { /* ignora */ }
      }
      if (!id || (status !== "ACTIVE" && status !== "PAUSED")) {
        return json({ error: "Parâmetros inválidos (id, status ACTIVE|PAUSED)." }, 400);
      }
      const writeToken = acct ? await tokenForAccount(acct, token) : token;
      await graphPost(id, { status }, writeToken);
      return json({ success: true, id, status });
    }

    // ── Contas ──
    if (route.startsWith("/api/accounts") || route.startsWith("/api/meta/ad-accounts")) {
      return json({ data: await listAccounts(token) });
    }

    // ── Última veiculação ──
    // Detecta conta/campanha que parou de entregar (saldo zerado, rejeição, pausa
    // esquecida). Varre o histórico diário e pega o último dia com impressão.
    if (route.startsWith("/api/insights/last-delivery")) {
      const lookback = Math.min(Math.max(parseInt(q.get("lookback") || "90", 10) || 90, 7), 180);
      const until = todayInTz();
      const since = shiftDays(until, -lookback);
      const ids = (q.get("accountIds") || accountId)
        .split(",").map((s) => s.trim().replace(/^act_/, "")).filter(Boolean);

      const results = await Promise.all(ids.map(async (id) => {
        try {
          const t = await tokenForAccount(id, token);
          const rows = await graphAll<Record<string, unknown>>(
            `act_${id}/insights`,
            {
              fields: "campaign_id,campaign_name,impressions,spend",
              level: "campaign",
              time_increment: "1",
              time_range: JSON.stringify({ since, until }),
              limit: "500",
            },
            t,
          );

          const byCampaign = new Map<string, { id: string; name: string; lastDate: string; spend: number }>();
          let accountLast = "";
          for (const r of rows) {
            if (num(r.impressions) <= 0) continue;
            const date = String(r.date_start ?? "");
            if (!date) continue;
            if (date > accountLast) accountLast = date;
            const cid = String(r.campaign_id ?? "");
            const prev = byCampaign.get(cid);
            const spend = num(r.spend);
            if (!prev) {
              byCampaign.set(cid, { id: cid, name: String(r.campaign_name ?? cid), lastDate: date, spend });
            } else {
              prev.spend += spend;
              if (date > prev.lastDate) prev.lastDate = date;
            }
          }

          return {
            accountId: id,
            lastDelivery: accountLast || null,
            daysSince: accountLast ? daysBetween(accountLast, until) : null,
            lookbackDays: lookback,
            campaigns: [...byCampaign.values()]
              .map((c) => ({
                id: c.id,
                name: c.name,
                lastDelivery: c.lastDate,
                daysSince: daysBetween(c.lastDate, until),
                spend: c.spend,
              }))
              .sort((a, b) => b.daysSince - a.daysSince),
          };
        } catch (err) {
          return { accountId: id, error: (err as Error).message, lastDelivery: null, daysSince: null, campaigns: [] };
        }
      }));

      return json({ data: results });
    }

    // ── Métricas agregadas ──
    if (route.startsWith("/api/insights/metrics")) {
      const r = await graph<{ data: Record<string, unknown>[] }>(
        `act_${accountId}/insights`,
        { fields: INSIGHT_FIELDS + ",website_ctr", time_range: tr() },
        acctToken,
      );
      return json({ data: parseInsights(r.data?.[0]) });
    }

    // ── Demografia (breakdowns) ──
    if (route.startsWith("/api/insights/demographics")) {
      const bd = (q.get("breakdown") || "age").toLowerCase();
      const breakdowns = bd === "age_gender" ? "age,gender" : bd; // age | gender | age,gender | region | country
      const rows = await graphAll<Record<string, unknown>>(
        `act_${accountId}/insights`,
        { fields: "spend,impressions,clicks,reach,actions,action_values", breakdowns, time_range: tr(), limit: "500" },
        acctToken,
      );
      const data = rows.map((d) => {
        const actions = d.actions as Action[] | undefined;
        const spend = num(d.spend);
        const purchases = act(actions, "purchase");
        const leads = act(actions, "lead");
        const age = d.age as string | undefined;
        const gender = d.gender as string | undefined;
        const region = d.region as string | undefined;
        const country = d.country as string | undefined;
        const label = [age, gender].filter(Boolean).join(" · ") || region || country || "—";
        return {
          key: label,
          age: age ?? null,
          gender: gender ?? null,
          spend,
          impressions: num(d.impressions),
          clicks: num(d.clicks),
          reach: num(d.reach),
          leads,
          purchases,
          results: purchases || leads || 0,
        };
      });
      return json({ data });
    }

    // ── Comparação de períodos ──
    if (route.startsWith("/api/insights/compare")) {
      const from2 = q.get("from2") || "";
      const to2 = q.get("to2") || "";
      const fetchAgg = async (s: string, u: string) => {
        const r = await graph<{ data: Record<string, unknown>[] }>(
          `act_${accountId}/insights`,
          { fields: INSIGHT_FIELDS, time_range: JSON.stringify({ since: s, until: u }) },
          acctToken,
        );
        return parseInsights(r.data?.[0]);
      };
      return json({ data: { current: await fetchAgg(from, to), previous: await fetchAgg(from2, to2) } });
    }

    // ── Série diária ──
    if (route.startsWith("/api/insights/daily")) {
      const rows = await graphAll<Record<string, unknown>>(
        `act_${accountId}/insights`,
        { fields: "spend,impressions,clicks,reach,actions,action_values,outbound_clicks", time_increment: "1", time_range: tr(), limit: "90" },
        acctToken,
      );
      return json({
        data: rows.map((d) => {
          const spend = num(d.spend);
          const pv = act(d.action_values as Action[], "purchase");
          return {
            date: d.date_start,
            spend,
            impressions: num(d.impressions),
            clicks: num(d.clicks),
            reach: num(d.reach),
            purchases: act(d.actions as Action[], "purchase"),
            purchaseValue: pv,
            revenueByUtm: pv,
            roas: pv > 0 && spend > 0 ? pv / spend : 0,
            leads: act(d.actions as Action[], "lead"),
            conversations: act(d.actions as Action[], "onsite_conversion.messaging_conversation_started_7d"),
          };
        }),
      });
    }

    // ── Campanhas ──
    if (route.startsWith("/api/campaigns")) {
      const raw = await graphAll<Record<string, unknown>>(
        `act_${accountId}/campaigns`,
        {
          fields: `id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,insights.time_range(${tr()}){${INSIGHT_FIELDS}}`,
          limit: "200",
        },
        acctToken,
      );
      return json({
        data: raw.map((c) => {
          const ins = (c.insights as { data?: Record<string, unknown>[] } | undefined)?.data?.[0];
          return {
            id: c.id,
            name: c.name,
            status: c.status,
            effectiveStatus: c.effective_status ?? c.status,
            objective: c.objective,
            dailyBudget: c.daily_budget ? parseFloat(String(c.daily_budget)) / 100 : null,
            lifetimeBudget: c.lifetime_budget ? parseFloat(String(c.lifetime_budget)) / 100 : null,
            startTime: c.start_time ?? null,
            stopTime: c.stop_time ?? null,
            insights: ins ? parseInsights(ins) : null,
          };
        }),
      });
    }

    // ── Conjuntos ──
    if (route.startsWith("/api/adsets")) {
      const campaignId = q.get("campaignId");
      const ep = campaignId ? `${campaignId}/adsets` : `act_${accountId}/adsets`;
      const raw = await graphAll<Record<string, unknown>>(
        ep,
        { fields: `id,campaign_id,name,status,effective_status,daily_budget,lifetime_budget,insights.time_range(${tr()}){${INSIGHT_FIELDS}}`, limit: "200" },
        acctToken,
      );
      return json({
        data: raw.map((s) => {
          const ins = (s.insights as { data?: Record<string, unknown>[] } | undefined)?.data?.[0];
          return {
            id: s.id, campaignId: s.campaign_id, name: s.name, status: s.status,
            effectiveStatus: s.effective_status ?? s.status,
            dailyBudget: s.daily_budget ? parseFloat(String(s.daily_budget)) / 100 : null,
            lifetimeBudget: s.lifetime_budget ? parseFloat(String(s.lifetime_budget)) / 100 : null,
            targeting: null,
            insights: ins ? parseInsights(ins) : null,
          };
        }),
      });
    }

    // ── Anúncios ──
    if (route.startsWith("/api/ads")) {
      const adsetId = q.get("adsetId");
      const ep = adsetId ? `${adsetId}/ads` : `act_${accountId}/ads`;
      const raw = await graphAll<Record<string, unknown>>(
        ep,
        { fields: `id,adset_id,name,status,effective_status,creative{thumbnail_url,title,body,call_to_action_type},insights.time_range(${tr()}){${INSIGHT_FIELDS}}`, limit: "200" },
        acctToken,
      );
      return json({
        data: raw.map((a) => {
          const ins = (a.insights as { data?: Record<string, unknown>[] } | undefined)?.data?.[0];
          const cr = a.creative as Record<string, unknown> | undefined;
          return {
            id: a.id, adsetId: a.adset_id, name: a.name, status: a.status,
            effectiveStatus: a.effective_status ?? a.status,
            creative: cr ? { thumbnailUrl: cr.thumbnail_url ?? null, title: cr.title ?? null, body: cr.body ?? null, callToAction: cr.call_to_action_type ?? null } : null,
            insights: ins ? parseInsights(ins) : null,
          };
        }),
      });
    }

    // Não implementados ainda → vazio (não quebra o app)
    if (route.startsWith("/api/business-managers") || route.startsWith("/api/instagram")) return json([]);
    if (route.startsWith("/api/reports")) return json({ data: [] });

    return json({ data: [] });
  } catch (err) {
    console.error("meta-api erro:", (err as Error).message);
    if (route.includes("/auth/meta/status")) return json({ connected: false, connection: null });
    return json({ data: [], error: (err as Error).message }, route.includes("/api/entity/status") ? 400 : 200);
  }
});
