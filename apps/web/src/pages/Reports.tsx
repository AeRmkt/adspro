import { useState } from 'react'
import { FileText, Download, Plus, Loader2, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReports, generateReport, getReportDownload } from '../services/api'
import { useDashboardStore } from '../store/dashboardStore'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { fmtDate } from '../lib/format'
import { toast } from '../components/ui/useToast'

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-warning" />,
  processing: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
  done: <CheckCircle className="h-4 w-4 text-success" />,
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando', processing: 'Processando', done: 'Pronto', error: 'Erro',
}

export default function Reports() {
  const { selectedAccountId, dateRange } = useDashboardStore()
  const queryClient = useQueryClient()
  const [reportType, setReportType] = useState<'pdf' | 'csv'>('pdf')

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: getReports,
    refetchInterval: 5000,
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
    onError: (err) => {
      toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' })
    },
  })

  const handleDownload = async (id: string) => {
    try {
      const { downloadUrl } = await getReportDownload(id)
      window.open(downloadUrl, '_blank')
    } catch (err) {
      toast({ title: 'Erro ao baixar', description: 'Não foi possível obter o link de download.', variant: 'destructive' })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gere e baixe relatórios detalhados</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as 'pdf' | 'csv')}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
          </select>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!selectedAccountId || generateMutation.isPending}
            className="gap-2"
          >
            {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Gerar Relatório
          </Button>
        </div>
      </div>

      <div className="glass-card divide-y divide-border/40">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))
        ) : reports?.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum relatório gerado ainda.</p>
          </div>
        ) : (
          reports?.map((report) => (
            <div key={report.id} className="p-4 flex items-center gap-4 hover:bg-accent/20 transition-colors">
              <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{report.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {fmtDate(report.dateFrom)} até {fmtDate(report.dateTo)} · {report.type.toUpperCase()} · {fmtDate(report.createdAt.split('T')[0])}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm">
                  {STATUS_ICON[report.status]}
                  <span className="text-muted-foreground">{STATUS_LABEL[report.status]}</span>
                </div>
                {report.status === 'done' && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleDownload(report.id)}>
                    <Download className="h-3.5 w-3.5" />
                    Baixar
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
