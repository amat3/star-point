'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Trash2, ArrowLeft, ShieldBan } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { getExclusions, addExclusion, removeExclusion, ExclusionRow } from '@/app/actions/admin-exclusions'
import { toTitleCase } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

type Profile = { id: string; full_name: string }

const TYPE_LABELS: Record<string, { label: string; color: string; description: string }> = {
  no_partner:  { label: 'No compañeros',  color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', description: 'Nunca pueden jugar en la misma pareja' },
  no_opponent: { label: 'No rivales',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',         description: 'Nunca pueden enfrentarse entre sí' },
  no_contact:  { label: 'Sin contacto',   color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',             description: 'Nunca en el mismo partido (ni pareja ni rival)' },
}

export default function ExclusionsPage() {
  const [exclusions, setExclusions] = useState<ExclusionRow[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const [playerA, setPlayerA] = useState('')
  const [playerB, setPlayerB] = useState('')
  const [type, setType] = useState<'no_partner' | 'no_opponent' | 'no_contact'>('no_contact')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [excl, supabase] = await Promise.all([
        getExclusions(),
        createClient(),
      ])
      setExclusions(excl)

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_guest', false)
        .order('full_name')
      setProfiles(data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!playerA || !playerB) { toast.error('Selecciona dos jugadores'); return }
    if (playerA === playerB) { toast.error('Los jugadores deben ser distintos'); return }
    setSaving(true)
    try {
      await addExclusion(playerA, playerB, type, note || undefined)
      toast.success('Exclusión añadida')
      setPlayerA(''); setPlayerB(''); setNote('')
      await loadAll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeExclusion(id)
      toast.success('Exclusión eliminada')
      setExclusions(prev => prev.filter(e => e.id !== id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  const availableForB = profiles.filter(p => p.id !== playerA)
  const availableForA = profiles.filter(p => p.id !== playerB)

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldBan className="w-5 h-5 text-red-500" />
            Exclusiones de Mixing
          </h1>
          <p className="text-xs text-muted-foreground">Parejas que el algoritmo evitará al generar rondas</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Nueva exclusión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Jugador A</p>
              <Select value={playerA} onValueChange={setPlayerA}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {availableForA.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-sm">{toTitleCase(p.full_name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Jugador B</p>
              <Select value={playerB} onValueChange={setPlayerB}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {availableForB.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-sm">{toTitleCase(p.full_name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Tipo de exclusión</p>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-sm">
                    <span className="font-medium">{v.label}</span>
                    <span className="text-xs text-muted-foreground ml-1">— {v.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            placeholder="Nota opcional (motivo, contexto...)"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="h-9 text-sm"
          />

          <Button onClick={handleAdd} disabled={saving || !playerA || !playerB} className="w-full">
            {saving ? 'Guardando...' : 'Añadir exclusión'}
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
        ) : exclusions.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-sm text-muted-foreground">No hay exclusiones configuradas</p>
          </div>
        ) : exclusions.map(ex => {
          const meta = TYPE_LABELS[ex.type]
          return (
            <div key={ex.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm truncate">{toTitleCase(ex.player_a_name)}</span>
                <span className="text-muted-foreground text-xs shrink-0">↔</span>
                <span className="font-semibold text-sm truncate">{toTitleCase(ex.player_b_name)}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={`text-[10px] font-semibold px-2 py-0.5 border-0 ${meta.color}`}>{meta.label}</Badge>
                {ex.note && <span className="text-xs text-muted-foreground hidden sm:block">{ex.note}</span>}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleRemove(ex.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
