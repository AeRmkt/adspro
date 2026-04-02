import { useState } from 'react'
import { FileText, Download, Plus, Loader2, Clock, CheckCircle, AlertCircle, Trash2, RefreshCw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReports, generateReport, getReportDownload, deleteReport } from '../services/api'
import { useDashboardStore } from '../store/dashboardStore'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { fmtDate } from '../lib/format'
import { toast } from '../components/ui/useToast'

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-400" />,
  processing: <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
  done: <CheckCircle className="h-4 w-4 text-green-400" />,
  error: <AlertCircle className="h-4 w-4 text-red-400" />,
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando',
  processing: 'Processando',
  done: 'Pronto',
  error: 'Erro',
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'destructive' | 'muted'> = {
  pending: 'muted',
  processing: 'default',
  done: 'success',
  error: 'destructive',
}

export default function Reports() {
  const { selectedAccountId, dateRange } = useDashboardStore()
  const queryClient = useQueryClient()
  const [reportType, setReportType] = useState<'pdf' | 'csv'>('pdf')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: getReports,
    refetchInterval: (data) => {
      const hasPending = data?.some(r => r.status === 'pending' || r.status === 'processing')
      return hasPending ? 3000 : false
    },
  })

  const generateMutation = useMutation({
    mutationFn: () => generateReport({
      accountId: selectedAccountId!,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      type: reportType,
      name: `Relatório ${fmtDate(dateRange.from)} a ${fmtDate(dateRange.to)}`,
    }),
    onSuccess: () => {
      toast({ title: 'Relatório solicitado!', description: 'Seu relatório está sendo gerado.', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (err) => toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      toast({ title: 'Relatório removido', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (err) => toast({ title: 'Erro ao remover', description: (err as Error).message, variant: 'destructive' }),
  })

  const handleDownload = async (id: string) => {
    setDownloadingId(id)
    try {
      const { downloadUrl } = await getReportDownload(id)
      window.open(downloadUrl, '_blank')
    } catch (err) {
      toast({ title: 'Erro ao baixar', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setDownloadingId(null)
    }
  }

  const pendingCount = reports?.filter(r => r.status === 'pending' || r.status === 'processing').length ?? 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Relatórios
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gere relatórios completos em PDF ou CSV
            {pendingCount > 0 && (
              <span className="ml-2 text-blue-400">
                · {pendingCount} em processamento
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as 'pdf' | 'csv')}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="pdf">PDF</option>
            <option value="csv">CSV (Excel)</option>
          </select>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!selectedAccountId || generateMutation.isPending}
            className="gap-2"
          >
            {generateMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Plus className="h-4 w-4" />}
            Gerar Relatório
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['reports'] })}
            title="Atualizar lista"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!selectedAccountId && (
        <div className="glass-card p-4 flex items-center gap-3 border border-yellow-500/30 bg-yellow-500/5">
          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
          <p className="text-sm">Selecione uma conta de anúncio no filtro acima para gerar relatórios.</p>
        </div>
      )}

      {/* Lista de relatórios */}
      <div className="glass-card divide-y divide-border/40">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))
        ) : reports?.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum relatório gerado ainda</p>
            <p className="text-sm mt-1">Selecione uma conta e clique em "Gerar Relatório"</p>
          </div>
        ) : (
          reports?.map((report) => (
            <div
              key={report.id}
              className="p-4 flex items-center gap-4 hover:bg-accent/20 transition-colors"
            >
              {/* Ícone */}
              <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${
                report.type === 'pdf' ? 'bg-red-500/10' : 'bg-green-500/10'
              }`}>
                <FileText className={`h-5 w-5 ${report.type === 'pdf' ? 'text-red-400' : 'text-green-400'}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{report.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span>{fmtDate(report.dateFrom)} até {fmtDate(report.dateTo)}</span>
                  <span>·</span>
                  <span className="uppercase font-mono">{report.type}</span>
                  <span>·</span>
                  <span>Criado em {fmtDate(report.createdAt.split('T')[0])}</span>
                  {report.status === 'error' && (report as { errorMsg?: string }).errorMsg && (
                    <>
                      <span>·</span>
                      <span className="text-red-400">{(report as { errorMsg?: string }).errorMsg}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status + ações */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={STATUS_BADGE[report.status]} className="gap-1.5">
                  {STATUS_ICON[report.status]}
                  {STATUS_LABEL[report.status]}
                </Badge>

                {report.status === 'done' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => handleDownload(report.id)}
                    disabled={downloadingId === report.id}
                  >
                    {downloadingId === report.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Download className="h-3.5 w-3.5" />}
                    Baixar
                  </Button>
                )}

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(report.id)}
                  disabled={deleteMutation.isPending}
                  title="Remover relatório"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info sobre formatos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-red-500/10 rounded flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-red-400" />
            </div>
            <span className="font-medium text-sm">Relatório PDF</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Layout profissional com resumo de métricas, tabela de campanhas e gráficos. Ideal para apresentações a clientes.
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-green-500/10 rounded flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-green-400" />
            </div>
            <span className="font-medium text-sm">Relatório CSV</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Dados brutos de todas as campanhas exportados para Excel. Ideal para análises personalizadas e planilhas.
          </p>
        </div>
      </div>
    </div>
  )
}
