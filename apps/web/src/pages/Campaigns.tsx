import { DashboardFilters } from '../components/DashboardFilters'
import { CampaignsTable } from '../components/CampaignsTable'

export default function Campaigns() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Campanhas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie e analise suas campanhas Meta Ads</p>
        </div>
        <DashboardFilters />
      </div>
      <CampaignsTable />
    </div>
  )
}
