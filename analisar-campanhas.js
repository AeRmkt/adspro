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

async function fetchMetaCampaigns(token, accountId) {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 30);
  const dateFrom = from.toISOString().split('T')[0];
  const dateTo = today.toISOString().split('T')[0];

  const fields = [
    'id', 'name', 'status', 'effective_status', 'objective',
    'daily_budget', 'lifetime_budget', 'budget_remaining',
    'insights.date_preset(last_30d){spend,impressions,clicks,reach,ctr,cpc,cpm,actions,action_values}'
  ].join(',');

  const url = `https://graph.facebook.com/v19.0/act_${accountId}/campaigns?fields=${fields}&access_token=${token}&limit=50`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) throw new Error(`Meta API: ${data.error.message}`);
  return data.data || [];
}

function formatCurrency(val) {
  return `R$ ${parseFloat(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function formatNumber(val) {
  return parseFloat(val || 0).toLocaleString('pt-BR');
}

function getMetric(insights, key) {
  if (!insights?.data?.[0]) return 0;
  return insights.data[0][key] || 0;
}

function getAction(insights, actionType) {
  if (!insights?.data?.[0]?.actions) return 0;
  const action = insights.data[0].actions.find(a => a.action_type === actionType);
  return action ? parseFloat(action.value) : 0;
}

(async () => {
  const client = new Client({ connectionString: decodeURIComponent(DATABASE_URL) });
  await client.connect();

  // Get all ad accounts with tokens
  const { rows: accounts } = await client.query(`
    SELECT
      aa.id, aa."accountName", aa."metaAccountId", aa."metaAccessToken", aa.source,
      u.email
    FROM "AdAccount" aa
    JOIN "User" u ON aa."userId" = u.id
    WHERE aa."isActive" = true
    ORDER BY u.email, aa."accountName"
  `);

  await client.end();

  if (accounts.length === 0) {
    console.log('Nenhuma conta de anúncio ativa encontrada no banco de dados.');
    return;
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('  ANÁLISE DE CAMPANHAS ATIVAS — META ADS');
  console.log(`  Últimos 30 dias · ${new Date().toLocaleDateString('pt-BR')}`);
  console.log(`${'='.repeat(70)}\n`);

  for (const account of accounts) {
    let token;
    try {
      token = decrypt(account.metaAccessToken);
    } catch (e) {
      console.log(`⚠️  Conta ${account.name}: erro ao descriptografar token\n`);
      continue;
    }

    console.log(`\n📊 CONTA: ${account.accountName}`);
    console.log(`   ID Meta: ${account.metaAccountId}`);
    console.log(`   Usuário: ${account.email}`);
    console.log(`${'─'.repeat(70)}`);

    let campaigns;
    try {
      campaigns = await fetchMetaCampaigns(token, account.metaAccountId);
    } catch (e) {
      console.log(`   ❌ Erro ao buscar campanhas: ${e.message}\n`);
      continue;
    }

    if (campaigns.length === 0) {
      console.log('   Nenhuma campanha encontrada.\n');
      continue;
    }

    const active = campaigns.filter(c => c.effective_status === 'ACTIVE');
    const paused = campaigns.filter(c => c.effective_status === 'PAUSED');
    const others = campaigns.filter(c => !['ACTIVE','PAUSED'].includes(c.effective_status));

    console.log(`\n   Total: ${campaigns.length} campanhas | ✅ Ativas: ${active.length} | ⏸  Pausadas: ${paused.length} | Outras: ${others.length}\n`);

    // Summary metrics for active campaigns
    let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalLeads = 0, totalPurchases = 0;

    for (const camp of campaigns) {
      const status = camp.effective_status === 'ACTIVE' ? '✅' :
                     camp.effective_status === 'PAUSED' ? '⏸ ' : '🔴';

      const spend = parseFloat(getMetric(camp.insights, 'spend'));
      const impressions = parseFloat(getMetric(camp.insights, 'impressions'));
      const clicks = parseFloat(getMetric(camp.insights, 'clicks'));
      const ctr = parseFloat(getMetric(camp.insights, 'ctr'));
      const cpc = parseFloat(getMetric(camp.insights, 'cpc'));
      const cpm = parseFloat(getMetric(camp.insights, 'cpm'));
      const leads = getAction(camp.insights, 'lead');
      const purchases = getAction(camp.insights, 'purchase');

      if (camp.effective_status === 'ACTIVE') {
        totalSpend += spend;
        totalImpressions += impressions;
        totalClicks += clicks;
        totalLeads += leads;
        totalPurchases += purchases;
      }

      const budget = camp.daily_budget
        ? `Diário: ${formatCurrency(camp.daily_budget / 100)}`
        : camp.lifetime_budget
        ? `Vitalício: ${formatCurrency(camp.lifetime_budget / 100)}`
        : 'Sem orçamento definido';

      console.log(`   ${status} ${camp.name}`);
      console.log(`      Objetivo: ${camp.objective || 'N/A'} | ${budget}`);
      if (spend > 0) {
        console.log(`      Gasto 30d: ${formatCurrency(spend)} | Impressões: ${formatNumber(impressions)} | Cliques: ${formatNumber(clicks)}`);
        console.log(`      CTR: ${parseFloat(ctr).toFixed(2)}% | CPC: ${formatCurrency(cpc)} | CPM: ${formatCurrency(cpm)}`);
        if (leads > 0) console.log(`      Leads: ${leads} | CPL: ${formatCurrency(spend / leads)}`);
        if (purchases > 0) console.log(`      Compras: ${purchases} | CPA: ${formatCurrency(spend / purchases)}`);
      } else {
        console.log(`      Sem dados de gasto nos últimos 30 dias`);
      }
      console.log('');
    }

    if (active.length > 0) {
      console.log(`${'─'.repeat(70)}`);
      console.log(`   RESUMO CAMPANHAS ATIVAS (últimos 30 dias):`);
      console.log(`   Gasto total:   ${formatCurrency(totalSpend)}`);
      console.log(`   Impressões:    ${formatNumber(totalImpressions)}`);
      console.log(`   Cliques:       ${formatNumber(totalClicks)}`);
      if (totalLeads > 0) console.log(`   Leads:         ${totalLeads} | CPL médio: ${formatCurrency(totalSpend / totalLeads)}`);
      if (totalPurchases > 0) console.log(`   Compras:       ${totalPurchases} | CPA médio: ${formatCurrency(totalSpend / totalPurchases)}`);
      console.log('');
    }
  }

  console.log(`${'='.repeat(70)}`);
  console.log('  Análise concluída.');
  console.log(`${'='.repeat(70)}\n`);
})();
