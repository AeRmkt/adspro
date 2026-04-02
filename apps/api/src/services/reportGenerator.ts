import { createClient } from '@supabase/supabase-js'
import PDFDocument from 'pdfkit'
import { metaApiService } from './metaApi.js'
import { decrypt } from './crypto.js'
import type { PrismaClient } from '@prisma/client'
import type { FastifyBaseLogger } from 'fastify'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const STORAGE_BUCKET = 'reports'

function getStorage() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY).storage
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtNum(v: number) {
  return v.toLocaleString('pt-BR')
}
function fmtPct(v: number) {
  return `${v.toFixed(2)}%`
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

function buildCSV(data: Record<string, unknown>[]): Buffer {
  if (data.length === 0) return Buffer.from('')
  const headers = Object.keys(data[0])
  const rows = [
    headers.join(';'),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h]
        const str = val === null || val === undefined ? '' : String(val)
        return str.includes(';') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
      }).join(';')
    ),
  ]
  return Buffer.from('\uFEFF' + rows.join('\r\n'), 'utf-8') // BOM para Excel
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

async function buildPDF(params: {
  reportName: string
  accountName: string
  dateFrom: string
  dateTo: string
  metrics: Record<string, unknown>
  campaigns: Record<string, unknown>[]
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill('#1a1a2e')
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
      .text('AdsPro', 40, 25)
    doc.fontSize(10).font('Helvetica')
      .text('Dashboard de Performance Meta Ads', 40, 52)

    // Título do relatório
    doc.fillColor('#1a1a2e').fontSize(16).font('Helvetica-Bold')
      .text(params.reportName, 40, 100)
    doc.fillColor('#666').fontSize(10).font('Helvetica')
      .text(`Conta: ${params.accountName}  |  Período: ${params.dateFrom} a ${params.dateTo}`, 40, 122)

    doc.moveTo(40, 145).lineTo(doc.page.width - 40, 145).strokeColor('#e0e0e0').stroke()

    // Métricas principais
    const m = params.metrics as Record<string, number>
    const cards = [
      { label: 'Investimento', value: fmtBRL(m.spend ?? 0) },
      { label: 'Impressões', value: fmtNum(m.impressions ?? 0) },
      { label: 'Cliques', value: fmtNum(m.clicks ?? 0) },
      { label: 'CTR', value: fmtPct(m.ctr ?? 0) },
      { label: 'CPM', value: fmtBRL(m.cpm ?? 0) },
      { label: 'CPC', value: fmtBRL(m.cpc ?? 0) },
      { label: 'Alcance', value: fmtNum(m.reach ?? 0) },
      { label: 'ROAS', value: `${(m.roas ?? 0).toFixed(2)}x` },
    ]

    doc.fillColor('#1a1a2e').fontSize(13).font('Helvetica-Bold')
      .text('Resumo do Período', 40, 160)

    const cardW = (doc.page.width - 80 - 30) / 4
    const cardH = 60
    cards.forEach((card, i) => {
      const col = i % 4
      const row = Math.floor(i / 4)
      const x = 40 + col * (cardW + 10)
      const y = 180 + row * (cardH + 10)

      doc.rect(x, y, cardW, cardH).fillAndStroke('#f8f9fa', '#e0e0e0')
      doc.fillColor('#666').fontSize(8).font('Helvetica').text(card.label, x + 8, y + 10)
      doc.fillColor('#1a1a2e').fontSize(14).font('Helvetica-Bold').text(card.value, x + 8, y + 26, { width: cardW - 16 })
    })

    // Tabela de campanhas
    const tableY = 340
    doc.fillColor('#1a1a2e').fontSize(13).font('Helvetica-Bold')
      .text('Campanhas', 40, tableY)

    const cols = [
      { label: 'Campanha', width: 160 },
      { label: 'Status', width: 60 },
      { label: 'Gasto', width: 70 },
      { label: 'Impressões', width: 75 },
      { label: 'Cliques', width: 60 },
      { label: 'CTR', width: 50 },
      { label: 'ROAS', width: 50 },
    ]
    const tableHeaderY = tableY + 20
    let cx = 40

    // Header da tabela
    doc.rect(40, tableHeaderY, doc.page.width - 80, 20).fill('#1a1a2e')
    cols.forEach(col => {
      doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold')
        .text(col.label, cx + 4, tableHeaderY + 6, { width: col.width - 4 })
      cx += col.width
    })

    // Linhas
    params.campaigns.slice(0, 20).forEach((camp, idx) => {
      const c = camp as Record<string, unknown>
      const ins = (c.insights ?? {}) as Record<string, number>
      const rowY = tableHeaderY + 20 + idx * 18
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8f9fa'
      doc.rect(40, rowY, doc.page.width - 80, 18).fill(bg)

      const values = [
        String(c.name ?? '').slice(0, 28),
        String(c.status ?? ''),
        fmtBRL(ins.spend ?? 0),
        fmtNum(ins.impressions ?? 0),
        fmtNum(ins.clicks ?? 0),
        fmtPct(ins.ctr ?? 0),
        `${(ins.roas ?? 0).toFixed(2)}x`,
      ]
      let vx = 40
      values.forEach((val, vi) => {
        doc.fillColor('#333').fontSize(7).font('Helvetica')
          .text(val, vx + 4, rowY + 5, { width: cols[vi].width - 4, ellipsis: true })
        vx += cols[vi].width
      })
    })

    // Rodapé
    const footerY = doc.page.height - 40
    doc.moveTo(40, footerY - 10).lineTo(doc.page.width - 40, footerY - 10).strokeColor('#e0e0e0').stroke()
    doc.fillColor('#999').fontSize(8).font('Helvetica')
      .text(`Gerado em ${new Date().toLocaleString('pt-BR')} • AdsPro`, 40, footerY - 4)

    doc.end()
  })
}

// ─── Upload para Supabase Storage ─────────────────────────────────────────────

async function uploadToStorage(buffer: Buffer, path: string, contentType: string): Promise<string> {
  const storage = getStorage()

  // Garante que o bucket existe
  const { error: bucketErr } = await storage.createBucket(STORAGE_BUCKET, { public: false }).catch(() => ({ error: null }))
  if (bucketErr && !bucketErr.message.includes('already exists')) {
    throw new Error(`Erro ao criar bucket: ${bucketErr.message}`)
  }

  const { error: uploadErr } = await storage.from(STORAGE_BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  })

  if (uploadErr) throw new Error(`Erro no upload: ${uploadErr.message}`)

  const { data } = storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// ─── Função principal ─────────────────────────────────────────────────────────

export async function generateReport(
  reportId: string,
  prisma: PrismaClient,
  log: FastifyBaseLogger
): Promise<void> {
  const report = await prisma.report.findUnique({ where: { id: reportId } })
  if (!report) return

  await prisma.report.update({ where: { id: reportId }, data: { status: 'processing' } })

  try {
    const account = await prisma.adAccount.findFirst({ where: { id: report.adAccountId } })
    if (!account) throw new Error('Conta de anúncio não encontrada')

    const connection = await prisma.facebookConnection.findUnique({ where: { userId: report.userId } })
    if (!connection) throw new Error('Conexão Meta não encontrada')

    const accessToken = decrypt(connection.accessToken)

    const [metrics, campaigns] = await Promise.all([
      metaApiService.getAggregatedMetrics(accessToken, account.metaAccountId, report.dateFrom, report.dateTo),
      metaApiService.getCampaigns(accessToken, account.metaAccountId, report.dateFrom, report.dateTo),
    ])

    let fileUrl: string

    if (report.type === 'csv') {
      const rows = campaigns.map(c => ({
        'Campanha': c.name,
        'Status': c.status,
        'Gasto (R$)': c.insights?.spend?.toFixed(2) ?? '0',
        'Impressões': c.insights?.impressions ?? 0,
        'Cliques': c.insights?.clicks ?? 0,
        'CTR (%)': c.insights?.ctr?.toFixed(2) ?? '0',
        'CPM (R$)': c.insights?.cpm?.toFixed(2) ?? '0',
        'CPC (R$)': c.insights?.cpc?.toFixed(2) ?? '0',
        'Alcance': c.insights?.reach ?? 0,
        'ROAS': c.insights?.roas?.toFixed(2) ?? '0',
        'Compras': c.insights?.purchases ?? 0,
        'Leads': c.insights?.leads ?? 0,
      }))
      const buffer = buildCSV(rows)
      fileUrl = await uploadToStorage(buffer, `${reportId}.csv`, 'text/csv; charset=utf-8')
    } else {
      const buffer = await buildPDF({
        reportName: report.name,
        accountName: account.accountName,
        dateFrom: report.dateFrom,
        dateTo: report.dateTo,
        metrics: metrics as unknown as Record<string, unknown>,
        campaigns: campaigns as unknown as Record<string, unknown>[],
      })
      fileUrl = await uploadToStorage(buffer, `${reportId}.pdf`, 'application/pdf')
    }

    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'done', fileUrl },
    })

    log.info({ reportId, type: report.type }, 'Relatório gerado com sucesso')
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
    log.error({ reportId, err }, 'Erro ao gerar relatório')
    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'error', errorMsg },
    })
  }
}
