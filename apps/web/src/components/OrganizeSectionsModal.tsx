import { useEffect, useState } from 'react'
import { X, GripVertical, RotateCcw } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from './ui/Button'
import { useDashboardStore } from '../store/dashboardStore'
import { DEFAULT_SECTION_ORDER, sectionById } from '../lib/dashboardSections'
import { cn } from '../lib/utils'

function SortableRow({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const section = sectionById(id)
  if (!section) return null

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/40 px-3 py-2.5',
        isDragging && 'opacity-80 shadow-lg ring-1 ring-primary/40'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Reordenar ${section.label}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm">{section.label}</span>
      {section.span === 'half' && (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">meia</span>
      )}
    </div>
  )
}

export function OrganizeSectionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { sectionOrder, setSectionOrder } = useDashboardStore()
  // Rascunho: só grava no store ao Salvar, para o Cancelar funcionar de verdade.
  const [draft, setDraft] = useState<string[]>(sectionOrder)

  useEffect(() => {
    if (open) setDraft(sectionOrder)
  }, [open, sectionOrder])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (!open) return null

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setDraft((items) => {
      const from = items.indexOf(String(active.id))
      const to = items.indexOf(String(over.id))
      return from === -1 || to === -1 ? items : arrayMove(items, from, to)
    })
  }

  const save = () => {
    setSectionOrder(draft)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-semibold">Organizar Seções</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Arraste as seções para reordenar como elas aparecem na página.
        </p>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={draft} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {draft.map((id) => <SortableRow key={id} id={id} />)}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex items-center gap-2 mt-6">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => setDraft(DEFAULT_SECTION_ORDER)}
            disabled={draft.join() === DEFAULT_SECTION_ORDER.join()}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={save}>Salvar</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
