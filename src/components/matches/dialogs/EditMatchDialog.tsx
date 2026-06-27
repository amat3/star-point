'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { updateMatchScore } from '@/app/actions/matches'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { toast } from 'sonner'
import { Match } from '@/types'
import { ScoreInput } from '../shared/score-input'

const formSchema = z.object({
  games_a: z.coerce.number().min(0),
  games_b: z.coerce.number().min(0),
}).superRefine((data, ctx) => {
  if (data.games_a === 0 && data.games_b === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El marcador no puede ser 0-0', path: ['games_a'] })
  }
  if (data.games_a !== 0 && data.games_a === data.games_b) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'No se permite empate', path: ['games_b'] })
  }
})

interface EditMatchDialogProps {
  match: Match
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditMatchDialog({ match, open, onOpenChange }: EditMatchDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const parseScore = (score: string) => {
    const [a, b] = (score || '0-0').split('-').map(Number)
    return { games_a: a || 0, games_b: b || 0 }
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: parseScore(match.score_details || ''),
  })

  useEffect(() => {
    if (open) form.reset(parseScore(match.score_details || ''))
  }, [match, open, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      await updateMatchScore(match.id, {
        score_details: `${values.games_a}-${values.games_b}`,
      })
      toast.success('Resultado actualizado')
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Editar Resultado</DialogTitle>
          <DialogDescription>Modifica el marcador del partido.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex justify-between items-center text-sm px-4">
              <div className="text-center w-1/3">
                <div className="font-bold text-primary truncate">{match.p_a1?.full_name?.split(' ')[0]}</div>
                <div className="font-bold text-primary truncate">{match.p_a2?.full_name?.split(' ')[0]}</div>
              </div>
              <div className="font-black text-muted-foreground">VS</div>
              <div className="text-center w-1/3">
                <div className="font-bold text-secondary-foreground truncate">{match.p_b1?.full_name?.split(' ')[0]}</div>
                <div className="font-bold text-secondary-foreground truncate">{match.p_b2?.full_name?.split(' ')[0]}</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold mb-1 text-primary">Juegos A</span>
                <ScoreInput name="games_a" form={form} labelColor="hidden" max={50} />
              </div>
              <span className="text-xl font-bold text-gray-300">-</span>
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold mb-1 text-secondary-foreground">Juegos B</span>
                <ScoreInput name="games_b" form={form} labelColor="hidden" max={50} />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Guardando...' : 'Actualizar Resultado'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
