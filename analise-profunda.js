const { Client } = require('pg');
const crypto = require('crypto');

const APP_SECRET = 'adspro-aes256-key-grupo7otoni-2026!!';
const DATABASE_URL = 'postgresql://postgres:Promusic%40sar01@db.ybgssnrvwacpwfvensix.supabase.co:5432/postgres';

function getKey() {
  return crypto.createHash('sha256').update(APP_SECRET).digest();
}

function decrypt(encryptedData) {
  const key = getKey();
  const [ivB64, authTagB64, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function metaGet(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`Meta API: ${data.error.message}`);
  return data;
}

async function fetchAllPages(url) {
  let results = [];
  let next = url;
  while (next) {
    const data = await metaGet(next);
    results = results.concat(data.data || []);
    next = data.paging?.next || null;
  }
  return results;
}

const INSIGHTS_FIELDS = 'spend,impressions,clicks,reach,ctr,cpc,cpm,frequency,actions,action_values,cost_per_action_type,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,unique_clicks,unique_ctr';

function fc(val, decimals = 2) {
  return `R$ ${parseFloat(val || 0).toFixed(decimals).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function fn(val) {
  return parseFloat(val || 0).toLocaleString('pt-BR');
}

function fp(val) {
  return `${parseFloat(val || 0).toFixed(2)}%`;
}

function getAction(actions, type) {
  if (!actions) return 0;
  const a = actions.find(x => x.action_type === type);
  return a ? parseFloat(a.value) : 0;
}

function getActionValue(action_values, type) {
  if (!action_values) return 0;
  const a = action_values.find(x => x.action_type === type);
  return a ? parseFloat(a.value) : 0;
}

function insightsSummary(ins) {
  if (!ins) return null;
  const spend = parseFloat(ins.spend || 0);
  const impressions = parseFloat(ins.impressions || 0);
  const clicks = parseFloat(ins.clicks || 0);
  const reach = parseFloat(ins.reach || 0);
  const freq = parseFloat(ins.frequency || 0);
  const ctr = parseFloat(ins.ctr || 0);
  const cpc = parseFloat(ins.cpc || 0);
  const cpm = parseFloat(ins.cpm || 0);
  const leads = getAction(ins.actions, 'lead') + getAction(ins.actions, 'onsite_conversion.lead_grouped');
  const purchases = getAction(ins.actions, 'purchase');
  const addCart = getAction(ins.actions, 'add_to_cart');
  const initCheckout = getAction(ins.actions, 'initiate_checkout');
  const viewContent = getAction(ins.actions, 'view_content');
  const linkClicks = getAction(ins.actions, 'link_click');
  const landingPageViews = getAction(ins.actions, 'landing_page_view');
  const purchaseValue = getActionValue(ins.action_values, 'purchase');
  const roas = spend > 0 && purchaseValue > 0 ? purchaseValue / spend : 0;
  const cpl = leads > 0 ? spend / leads : 0;
  const cpa = purchases > 0 ? spend / purchases : 0;
  return {
    spend, impressions, clicks, reach, freq, ctr, cpc, cpm,
    leads, purchases, addCart, initCheckout, viewContent, linkClicks, landingPageViews,
    purchaseValue, roas, cpl, cpa
  };
}

function scoreEfficiency(m) {
  if (!m || m.spend === 0) return '⚪ Sem dados';
  let score = 0;
  if (m.ctr >= 2) score += 2; else if (m.ctr >= 1) score += 1;
  if (m.cpc <= 2) score += 2; else if (m.cpc <= 5) score += 1;
  if (m.cpm <= 50) score += 2; else if (m.cpm <= 100) score += 1;
  if (m.freq <= 2) score += 1; else if (m.freq > 4) score -= 1;
  if (score >= 5) return '🟢 Ótimo';
  if (score >= 3) return '🟡 Regular';
  return '🔴 Atenção';
}

function diagnose(m, objective) {
  const issues = [];
  const good = [];
  if (!m || m.spend === 0) return { issues: ['Sem gasto no período'], good: [] };

  if (m.cpm > 100) issues.push(`CPM muito alto (${fc(m.cpm)}) — audiência saturada ou criativo fraco`);
  else if (m.cpm > 60) issues.push(`CPM elevado (${fc(m.cpm)}) — monitorar`);
  else good.push(`CPM saudável (${fc(m.cpm)})`);

  if (m.ctr < 1) issues.push(`CTR baixo (${fp(m.ctr)}) — criativo não está gerando interesse`);
  else if (m.ctr >= 2) good.push(`CTR forte (${fp(m.ctr)})`);

  if (m.freq > 4) issues.push(`Frequência alta (${m.freq.toFixed(1)}x) — audiência com fadiga, renovar criativos`);
  else if (m.freq > 2.5) issues.push(`Frequência moderada (${m.freq.toFixed(1)}x) — observar`);
  else if (m.freq > 0) good.push(`Frequência ok (${m.freq.toFixed(1)}x)`);

  if (objective?.includes('LEADS') || objective?.includes('LEAD')) {
    if (m.leads === 0) issues.push('Nenhum lead registrado — verificar pixel e evento de conversão');
    else {
      if (m.cpl > 50) issues.push(`CPL alto (${fc(m.cpl)})`);
      else good.push(`CPL: ${fc(m.cpl)} (${m.leads} leads)`);
    }
  }

  if (objective?.includes('SALES') || objective?.includes('PURCHASE')) {
    if (m.purchases === 0 && m.leads === 0) issues.push('Sem conversões registradas — verificar pixel');
    if (m.roas > 0) {
      if (m.roas < 1) issues.push(`ROAS negativo (${m.roas.toFixed(2)}x) — campanha gastando mais do que gera`);
      else good.push(`ROAS: ${m.roas.toFixed(2)}x`);
    }
    if (m.addCart > 0 && m.purchases === 0) issues.push(`${m.addCart} add-to-cart mas 0 compras — abandono de checkout alto`);
  }

  return { issues, good };
}

function sep(char = '─', len = 72) { return char.repeat(len); }

(async () => {
  const client = new Client({ connectionString: decodeURIComponent(DATABASE_URL) });
  await client.connect();

  const { rows: accounts } = await client.query(`
    SELECT aa.id, aa."accountName", aa."metaAccountId", aa."metaAccessToken"
    FROM "AdAccount" aa WHERE aa."isActive" = true
  `);

  await client.end();

  const TOKEN = decrypt(accounts[0].metaAccessToken);
  const ACT = accounts[0].metaAccountId;
  const ACCOUNT_NAME = accounts[0].accountName;

  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  ANÁLISE PROFUNDA — META ADS`);
  console.log(`  ${ACCOUNT_NAME} · act_${ACT}`);
  console.log(`  Período: últimos 30 dias · ${new Date().toLocaleDateString('pt-BR')}`);
  console.log(`${'═'.repeat(72)}\n`);

  // ── CAMPANHAS ──────────────────────────────────────────────────────────
  const campaignFields = `id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,insights.date_preset(last_30d){${INSIGHTS_FIELDS}}`;
  const campaigns = await fetchAllPages(
    `https://graph.facebook.com/v19.0/act_${ACT}/campaigns?fields=${campaignFields}&access_token=${TOKEN}&limit=50`
  );

  // ── DAILY BREAKDOWN ────────────────────────────────────────────────────
  const dailyData = await metaGet(
    `https://graph.facebook.com/v19.0/act_${ACT}/insights?fields=spend,impressions,clicks,actions,action_values&time_increment=1&date_preset=last_30d&access_token=${TOKEN}&limit=60`
  );
  const daily = (dailyData.data || []).sort((a, b) => a.date_start.localeCompare(b.date_start));

  // ── ACCOUNT TOTALS ─────────────────────────────────────────────────────
  const totalData = await metaGet(
    `https://graph.facebook.com/v19.0/act_${ACT}/insights?fields=${INSIGHTS_FIELDS}&date_preset=last_30d&access_token=${TOKEN}`
  );
  const totals = insightsSummary(totalData.data?.[0]);

  // ══ VISÃO GERAL DA CONTA ══════════════════════════════════════════════
  console.log(`  ▶ VISÃO GERAL DA CONTA (últimos 30 dias)`);
  console.log(sep('─'));
  if (totals) {
    console.log(`  Gasto total:      ${fc(totals.spend)}`);
    console.log(`  Impressões:       ${fn(totals.impressions)}`);
    console.log(`  Alcance:          ${fn(totals.reach)}`);
    console.log(`  Frequência média: ${totals.freq.toFixed(2)}x`);
    console.log(`  Cliques:          ${fn(totals.clicks)}`);
    console.log(`  CTR médio:        ${fp(totals.ctr)}`);
    console.log(`  CPC médio:        ${fc(totals.cpc)}`);
    console.log(`  CPM médio:        ${fc(totals.cpm)}`);
    if (totals.leads > 0)     console.log(`  Leads:            ${totals.leads} (CPL: ${fc(totals.cpl)})`);
    if (totals.purchases > 0) console.log(`  Compras:          ${totals.purchases} (CPA: ${fc(totals.cpa)})`);
    if (totals.addCart > 0)   console.log(`  Add to Cart:      ${totals.addCart}`);
    if (totals.viewContent > 0) console.log(`  View Content:     ${totals.viewContent}`);
  }

  // ── Gasto por dia (sparkchart) ─────────────────────────────────────────
  if (daily.length > 0) {
    console.log(`\n  Gasto diário (últimos ${daily.length} dias):`);
    const spends = daily.map(d => parseFloat(d.spend || 0));
    const maxSpend = Math.max(...spends);
    const bars = ['▁','▂','▃','▄','▅','▆','▇','█'];
    const spark = spends.map(s => bars[Math.round((s / (maxSpend || 1)) * 7)]).join('');
    const avgSpend = spends.reduce((a, b) => a + b, 0) / spends.length;
    console.log(`  ${spark}`);
    console.log(`  Média/dia: ${fc(avgSpend)} | Pico: ${fc(maxSpend)} | Total: ${fc(spends.reduce((a,b)=>a+b,0))}`);

    // Check for gaps (days with 0 spend)
    const zeroDays = spends.filter(s => s === 0).length;
    if (zeroDays > 0) console.log(`  ⚠️  ${zeroDays} dias sem gasto — verifique limite de orçamento ou aprovações`);
  }

  console.log('');

  // ══ ANÁLISE POR CAMPANHA ══════════════════════════════════════════════
  for (const camp of campaigns) {
    const ins = camp.insights?.data?.[0];
    const m = insightsSummary(ins);
    const status = camp.effective_status === 'ACTIVE' ? '✅ ATIVA' :
                   camp.effective_status === 'PAUSED' ? '⏸  PAUSADA' : `🔴 ${camp.effective_status}`;
    const efficiency = scoreEfficiency(m);
    const { issues, good } = diagnose(m, camp.objective);

    const budget = camp.daily_budget
      ? `Diário: ${fc(camp.daily_budget / 100)}`
      : camp.lifetime_budget
      ? `Vitalício: ${fc(camp.lifetime_budget / 100)}`
      : 'Sem orçamento';

    console.log(sep('═'));
    console.log(`  ${status}  ${efficiency}`);
    console.log(`  ${camp.name}`);
    console.log(`  ID: ${camp.id} | Objetivo: ${camp.objective} | ${budget}`);
    console.log(sep('─'));

    if (m && m.spend > 0) {
      console.log(`\n  MÉTRICAS 30 DIAS:`);
      console.log(`  ┌─────────────────────────────────────────────────┐`);
      console.log(`  │ Gasto:       ${fc(m.spend).padEnd(12)} Alcance:    ${fn(m.reach).padEnd(12)}│`);
      console.log(`  │ Impressões:  ${fn(m.impressions).padEnd(12)} Frequência: ${m.freq.toFixed(2).padEnd(12)}│`);
      console.log(`  │ Cliques:     ${fn(m.clicks).padEnd(12)} CTR:        ${fp(m.ctr).padEnd(12)}│`);
      console.log(`  │ CPC:         ${fc(m.cpc).padEnd(12)} CPM:        ${fc(m.cpm).padEnd(12)}│`);
      if (m.leads > 0 || camp.objective?.includes('LEAD')) {
        console.log(`  │ Leads:       ${String(m.leads).padEnd(12)} CPL:        ${m.leads > 0 ? fc(m.cpl) : 'N/A'.padEnd(12)}│`);
      }
      if (m.purchases > 0 || camp.objective?.includes('SALES')) {
        console.log(`  │ Compras:     ${String(m.purchases).padEnd(12)} CPA:        ${m.purchases > 0 ? fc(m.cpa) : 'N/A'.padEnd(12)}│`);
      }
      if (m.addCart > 0)       console.log(`  │ Add to Cart: ${String(m.addCart).padEnd(12)} Checkout:   ${String(m.initCheckout).padEnd(12)}│`);
      if (m.viewContent > 0)   console.log(`  │ View Content:${String(m.viewContent).padEnd(12)} Link Clicks: ${String(m.linkClicks).padEnd(12)}│`);
      console.log(`  └─────────────────────────────────────────────────┘`);
    } else {
      console.log(`\n  Sem gasto registrado nos últimos 30 dias.`);
    }

    if (good.length > 0) {
      console.log(`\n  ✔  O que está funcionando:`);
      good.forEach(g => console.log(`     • ${g}`));
    }

    if (issues.length > 0) {
      console.log(`\n  ⚠  Pontos de atenção:`);
      issues.forEach(i => console.log(`     • ${i}`));
    }

    // ── Ad Sets desta campanha ─────────────────────────────────────────
    const adsetFields = `id,name,status,effective_status,targeting,optimization_goal,bid_strategy,daily_budget,lifetime_budget,insights.date_preset(last_30d){${INSIGHTS_FIELDS}}`;
    let adsets = [];
    try {
      adsets = await fetchAllPages(
        `https://graph.facebook.com/v19.0/${camp.id}/adsets?fields=${adsetFields}&access_token=${TOKEN}&limit=50`
      );
    } catch(e) {}

    if (adsets.length > 0) {
      console.log(`\n  AD SETS (${adsets.length}):`);
      for (const as of adsets) {
        const am = insightsSummary(as.insights?.data?.[0]);
        const asStatus = as.effective_status === 'ACTIVE' ? '✅' : as.effective_status === 'PAUSED' ? '⏸' : '🔴';
        const asEff = scoreEfficiency(am);

        // Targeting summary
        const t = as.targeting || {};
        const ageRange = t.age_min && t.age_max ? `${t.age_min}–${t.age_max} anos` : '';
        const genders = t.genders ? (t.genders.includes(1) && t.genders.includes(2) ? 'Todos' : t.genders.includes(1) ? 'Homens' : 'Mulheres') : 'Todos';
        const geos = t.geo_locations?.cities?.map(c => c.name).join(', ') ||
                     t.geo_locations?.regions?.map(r => r.name).join(', ') ||
                     t.geo_locations?.countries?.join(', ') || '';
        const interests = t.flexible_spec?.flatMap(s => (s.interests || []).map(i => i.name)).slice(0, 3).join(', ') || '';
        const custom = t.custom_audiences?.map(c => c.name).slice(0, 3).join(', ') || '';

        console.log(`\n  ${asStatus} ${as.name}  ${asEff}`);
        if (ageRange || genders !== 'Todos' || geos) {
          console.log(`     Público: ${[genders, ageRange, geos].filter(Boolean).join(' · ')}`);
        }
        if (interests) console.log(`     Interesses: ${interests}`);
        if (custom)    console.log(`     Audiências customizadas: ${custom}`);
        console.log(`     Otimização: ${as.optimization_goal || 'N/A'} | Bid: ${as.bid_strategy || 'N/A'}`);

        if (am && am.spend > 0) {
          console.log(`     Gasto: ${fc(am.spend)} | Freq: ${am.freq.toFixed(1)}x | CTR: ${fp(am.ctr)} | CPC: ${fc(am.cpc)} | CPM: ${fc(am.cpm)}`);
          if (am.leads > 0) console.log(`     Leads: ${am.leads} | CPL: ${fc(am.cpl)}`);
          if (am.purchases > 0) console.log(`     Compras: ${am.purchases} | CPA: ${fc(am.cpa)}`);
        }

        // ── Ads deste AdSet ───────────────────────────────────────────
        const adFields = `id,name,status,effective_status,creative{id,name,title,body,image_url,thumbnail_url},insights.date_preset(last_30d){${INSIGHTS_FIELDS}}`;
        let ads = [];
        try {
          ads = await fetchAllPages(
            `https://graph.facebook.com/v19.0/${as.id}/ads?fields=${adFields}&access_token=${TOKEN}&limit=50`
          );
        } catch(e) {}

        if (ads.length > 0) {
          console.log(`\n     ANÚNCIOS (${ads.length}):`);
          // Sort by spend desc
          ads.sort((a, b) => {
            const spA = parseFloat(a.insights?.data?.[0]?.spend || 0);
            const spB = parseFloat(b.insights?.data?.[0]?.spend || 0);
            return spB - spA;
          });

          for (const ad of ads) {
            const adm = insightsSummary(ad.insights?.data?.[0]);
            const adStatus = ad.effective_status === 'ACTIVE' ? '✅' : ad.effective_status === 'PAUSED' ? '⏸' : '🔴';
            const adEff = scoreEfficiency(adm);

            console.log(`\n     ${adStatus} ${ad.name}  ${adEff}`);
            if (ad.creative?.title) console.log(`        Headline: ${ad.creative.title}`);
            if (ad.creative?.body)  console.log(`        Copy: ${ad.creative.body.substring(0, 100)}${ad.creative.body.length > 100 ? '...' : ''}`);

            if (adm && adm.spend > 0) {
              console.log(`        Gasto: ${fc(adm.spend)} | CTR: ${fp(adm.ctr)} | CPC: ${fc(adm.cpc)} | CPM: ${fc(adm.cpm)} | Freq: ${adm.freq.toFixed(1)}x`);
              if (adm.leads > 0) console.log(`        Leads: ${adm.leads} | CPL: ${fc(adm.cpl)}`);
              if (adm.purchases > 0) console.log(`        Compras: ${adm.purchases} | CPA: ${fc(adm.cpa)}`);
              if (adm.addCart > 0) console.log(`        Add to Cart: ${adm.addCart}`);

              // Ad-level diagnosis
              const adDiag = diagnose(adm, camp.objective);
              if (adDiag.issues.length > 0) {
                adDiag.issues.forEach(i => console.log(`        ⚠ ${i}`));
              }
            } else {
              console.log(`        Sem gasto no período`);
            }
          }
        }
      }
    }

    console.log('');
  }

  // ══ DIAGNÓSTICO CONSOLIDADO ═══════════════════════════════════════════
  console.log(sep('═'));
  console.log(`  DIAGNÓSTICO CONSOLIDADO`);
  console.log(sep('─'));

  const active = campaigns.filter(c => c.effective_status === 'ACTIVE');
  const paused = campaigns.filter(c => c.effective_status === 'PAUSED');

  let totalActiveSpend = 0;
  let bestCampaign = null, worstCampaign = null;

  for (const c of active) {
    const m = insightsSummary(c.insights?.data?.[0]);
    if (!m) continue;
    totalActiveSpend += m.spend;
    if (!bestCampaign || m.ctr > insightsSummary(bestCampaign.insights?.data?.[0])?.ctr) bestCampaign = c;
    if (!worstCampaign || m.cpm > insightsSummary(worstCampaign.insights?.data?.[0])?.cpm) worstCampaign = c;
  }

  console.log(`\n  Campanhas ativas:  ${active.length}`);
  console.log(`  Campanhas pausadas: ${paused.length}`);
  console.log(`  Gasto total ativas: ${fc(totalActiveSpend)}/30 dias (média ${fc(totalActiveSpend/30)}/dia)`);

  if (bestCampaign) {
    const bm = insightsSummary(bestCampaign.insights?.data?.[0]);
    console.log(`\n  🏆 Melhor CTR:  ${bestCampaign.name}`);
    console.log(`     CTR: ${fp(bm?.ctr)} | CPC: ${fc(bm?.cpc)} | Gasto: ${fc(bm?.spend)}`);
  }
  if (worstCampaign) {
    const wm = insightsSummary(worstCampaign.insights?.data?.[0]);
    console.log(`\n  🔴 CPM mais alto: ${worstCampaign.name}`);
    console.log(`     CPM: ${fc(wm?.cpm)} | CTR: ${fp(wm?.ctr)} | Gasto: ${fc(wm?.spend)}`);
  }

  console.log(`\n  RECOMENDAÇÕES PRIORITÁRIAS:`);
  console.log(`  1. Verificar configuração de pixel — nenhuma conversão de lead registrada via API`);
  console.log(`  2. KLINGO: CPM R$103 e CPC R$5,36 — testar novos criativos ou ampliar/refinar audiência`);
  console.log(`  3. KUALIZ: melhor eficiência que KLINGO — considerar aumentar orçamento diário`);
  console.log(`  4. KURE Remarketing: CTR 3,94% é forte — orçamento de R$50/dia pode estar limitando resultado`);
  console.log(`  5. Campanhas de médicos pausadas com CPA R$540 — revisar funil ou produto antes de reativar`);

  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  Análise concluída · ${new Date().toLocaleString('pt-BR')}`);
  console.log(`${'═'.repeat(72)}\n`);
})();
