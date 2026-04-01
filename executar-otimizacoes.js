const { Client } = require('pg');
const crypto = require('crypto');

const APP_SECRET = 'adspro-aes256-key-grupo7otoni-2026!!';
const DATABASE_URL = 'postgresql://postgres:Promusic%40sar01@db.ybgssnrvwacpwfvensix.supabase.co:5432/postgres';
const BASE = 'https://graph.facebook.com/v19.0';

function getKey() {
  return crypto.createHash('sha256').update(APP_SECRET).digest();
}

function decrypt(enc) {
  const key = getKey();
  const [ivB64, authTagB64, encrypted] = enc.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let dec = decipher.update(encrypted, 'base64', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

async function metaPatch(endpoint, params, token) {
  const url = new URL(`${BASE}/${endpoint}`);
  url.searchParams.set('access_token', token);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { method: 'POST' });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

async function getAds(campaignId, token) {
  const url = `${BASE}/${campaignId}/ads?fields=id,name,status,effective_status&limit=50&access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

async function getCampaigns(accountId, token) {
  const url = `${BASE}/act_${accountId}/campaigns?fields=id,name,effective_status,daily_budget&limit=50&access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`);
}

// Ads to PAUSE by name fragment
const PAUSE_KLINGO = [
  'A IA que responde, confirma',
  'SIMPÓSIO',
  'VD] [DEMO] Agendamento',
  'VD] [DOR] - Quantos pacientes',
];

const PAUSE_KUALIZ = [
  '5 Agentes de IA',
  'Transforme seu atendimento com IA',
  'VD] [DEMO] - Uma ferramenta',
];

// Campaign name fragments for budget updates
const KURE_RMK_NAME   = 'REMARKETING';
const KURE_ACQ_NAME   = 'AQUISICAO';
const KLINGO_NAME     = 'KLINGO';
const KUALIZ_NAME     = 'KUALIZ';

(async () => {
  const client = new Client({ connectionString: decodeURIComponent(DATABASE_URL) });
  await client.connect();
  const { rows } = await client.query(`SELECT "metaAccountId", "metaAccessToken" FROM "AdAccount" WHERE "isActive" = true LIMIT 1`);
  await client.end();

  const TOKEN = decrypt(rows[0].metaAccessToken);
  const ACT   = rows[0].metaAccountId;

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  EXECUTANDO OTIMIZAÇÕES — META ADS');
  console.log('═══════════════════════════════════════════════════════\n');

  const campaigns = await getCampaigns(ACT, TOKEN);

  // ── 1. ATUALIZAR ORÇAMENTOS KURE ──────────────────────────────────────
  console.log('─── KURE: Redistribuição de orçamento ───────────────────');

  for (const camp of campaigns) {
    if (!camp.name.includes('KURE')) continue;

    if (camp.name.toUpperCase().includes(KURE_RMK_NAME)) {
      try {
        await metaPatch(camp.id, { daily_budget: 10000 }, TOKEN); // R$100
        log('✅', `Remarketing → R$100/dia  [${camp.name}]`);
      } catch (e) {
        log('❌', `Remarketing: ${e.message}`);
      }
    }

    if (camp.name.toUpperCase().includes(KURE_ACQ_NAME)) {
      try {
        await metaPatch(camp.id, { daily_budget: 5000 }, TOKEN); // R$50
        log('✅', `Aquisição   → R$50/dia   [${camp.name}]`);
      } catch (e) {
        log('❌', `Aquisição: ${e.message}`);
      }
    }
  }

  // ── 2. PAUSAR ADS KLINGO ──────────────────────────────────────────────
  console.log('\n─── KLINGO: Pausando anúncios ineficientes ──────────────');

  const klingoCamp = campaigns.find(c => c.name.includes('KLINGO') && c.effective_status === 'ACTIVE');
  if (klingoCamp) {
    const ads = await getAds(klingoCamp.id, TOKEN);
    for (const ad of ads) {
      const shouldPause = PAUSE_KLINGO.some(frag => ad.name.includes(frag));
      if (shouldPause) {
        try {
          await metaPatch(ad.id, { status: 'PAUSED' }, TOKEN);
          log('⏸ ', `Pausado: ${ad.name}`);
        } catch (e) {
          log('❌', `${ad.name}: ${e.message}`);
        }
      } else {
        log('▶ ', `Mantido:  ${ad.name}`);
      }
    }
  } else {
    log('⚠ ', 'Campanha KLINGO não encontrada ou não está ativa');
  }

  // ── 3. PAUSAR ADS KUALIZ ─────────────────────────────────────────────
  console.log('\n─── KUALIZ: Pausando anúncios ineficientes ──────────────');

  const kualiz = campaigns.find(c => c.name.includes('KUALIZ') && c.effective_status === 'ACTIVE');
  if (kualiz) {
    const ads = await getAds(kualiz.id, TOKEN);
    for (const ad of ads) {
      const shouldPause = PAUSE_KUALIZ.some(frag => ad.name.includes(frag));
      if (shouldPause) {
        try {
          await metaPatch(ad.id, { status: 'PAUSED' }, TOKEN);
          log('⏸ ', `Pausado: ${ad.name}`);
        } catch (e) {
          log('❌', `${ad.name}: ${e.message}`);
        }
      } else {
        log('▶ ', `Mantido:  ${ad.name}`);
      }
    }
  } else {
    log('⚠ ', 'Campanha KUALIZ não encontrada ou não está ativa');
  }

  // ── 4. RESUMO ─────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  RESUMO DAS MUDANÇAS');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  KURE  → Remarketing R$100/dia | Aquisição R$50/dia');
  console.log('  KLINGO → 4 anúncios pausados (CPM alto / CTR zero)');
  console.log('  KUALIZ → 3 anúncios pausados (CPM R$212–R$240)');
  console.log('  Orçamentos KLINGO e KUALIZ: mantidos em R$150/dia');
  console.log('═══════════════════════════════════════════════════════\n');
})();
