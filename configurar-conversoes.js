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

async function api(method, endpoint, params, token) {
  const url = new URL(`${BASE}/${endpoint}`);
  url.searchParams.set('access_token', token);
  if (method === 'GET') {
    for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.error) throw new Error(`[${endpoint}] ${data.error.message}`);
    return data;
  } else {
    const body = new URLSearchParams({ access_token: token, ...params });
    const res = await fetch(`${BASE}/${endpoint}`, { method, body });
    const data = await res.json();
    if (data.error) throw new Error(`[${endpoint}] ${data.error.message}`);
    return data;
  }
}

function log(emoji, msg) { console.log(`${emoji}  ${msg}`); }
function sep() { console.log('─'.repeat(60)); }

(async () => {
  const client = new Client({ connectionString: decodeURIComponent(DATABASE_URL) });
  await client.connect();
  const { rows } = await client.query(`SELECT "metaAccountId", "metaAccessToken" FROM "AdAccount" WHERE "isActive" = true LIMIT 1`);
  await client.end();

  const TOKEN = decrypt(rows[0].metaAccessToken);
  const ACT   = rows[0].metaAccountId;

  console.log('\n' + '═'.repeat(60));
  console.log('  CONFIGURANDO CONVERSÕES — KLINGO & KUALIZ');
  console.log('═'.repeat(60) + '\n');

  const PIXELS = {
    KLINGO: '965454936453009',
    KUALIZ: '911842981435638',
  };

  const CAMPAIGNS = {
    KLINGO: '120248755405690370',
    KUALIZ: '120248692561970370',
  };

  const customConversionIds = {};

  // ── STEP 1: Verificar se já existe custom conversion ─────────────────
  console.log('PASSO 1 — Verificando custom conversions existentes...');
  sep();

  const existing = await api('GET', `act_${ACT}/customconversions`, {
    fields: 'id,name,pixel,rule'
  }, TOKEN);

  const existingNames = (existing.data || []).map(c => c.name);
  log('ℹ', `${existingNames.length} custom conversion(s) existente(s)`);

  // ── STEP 2: Criar custom conversions para all_ends ───────────────────
  console.log('\nPASSO 2 — Criando custom conversions para evento all_ends...');
  sep();

  for (const [product, pixelId] of Object.entries(PIXELS)) {
    const name = `Lead ${product} - Formulário Completo`;

    // Check if already exists
    const exists = (existing.data || []).find(c => c.name === name);
    if (exists) {
      log('✅', `Já existe: ${name} (ID: ${exists.id})`);
      customConversionIds[product] = exists.id;
      continue;
    }

    try {
      const result = await api('POST', `act_${ACT}/customconversions`, {
        name,
        event_source_type: 'PIXEL',
        event_source_id: pixelId,
        rule: JSON.stringify({ event: { eq: 'all_ends' } }),
        custom_event_type: 'LEAD',
        retention_days: 90,
      }, TOKEN);

      customConversionIds[product] = result.id;
      log('✅', `Criada: ${name} → ID: ${result.id}`);
    } catch (e) {
      log('❌', `${product}: ${e.message}`);
    }
  }

  // ── STEP 3: Buscar ad sets das campanhas ─────────────────────────────
  console.log('\nPASSO 3 — Atualizando ad sets para otimizar pela nova conversão...');
  sep();

  for (const [product, campId] of Object.entries(CAMPAIGNS)) {
    const convId = customConversionIds[product];
    if (!convId) {
      log('⚠', `${product}: sem custom conversion ID, pulando`);
      continue;
    }

    // Get adsets
    const adsets = await api('GET', `${campId}/adsets`, {
      fields: 'id,name,optimization_goal,promoted_object,status'
    }, TOKEN);

    for (const adset of (adsets.data || [])) {
      try {
        await api('POST', adset.id, {
          optimization_goal: 'OFFSITE_CONVERSIONS',
          promoted_object: JSON.stringify({
            custom_conversion_id: convId,
            custom_event_type: 'LEAD',
          }),
        }, TOKEN);
        log('✅', `${product} | ${adset.name} → otimizando para Lead (all_ends)`);
      } catch (e) {
        log('❌', `${product} | ${adset.name}: ${e.message}`);
      }
    }
  }

  // ── STEP 4: Confirmar ─────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('  RESUMO');
  console.log('═'.repeat(60));
  for (const [product, id] of Object.entries(customConversionIds)) {
    log('📌', `${product} → Custom Conversion ID: ${id}`);
  }
  console.log('\n  O que foi feito:');
  console.log('  • Custom Conversion criada rastreando o evento all_ends');
  console.log('  • Ad sets atualizados para otimizar por Lead (formulário completo)');
  console.log('  • Meta agora vai receber dados de quem completa o formulário');
  console.log('  • O algoritmo vai começar a aprender nos próximos 3-7 dias');
  console.log('\n  Próximo passo: aguardar ~50 eventos para sair da fase de aprendizado');
  console.log('═'.repeat(60) + '\n');
})();
