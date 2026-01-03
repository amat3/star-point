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
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Match } from '@/types'
import { ScoreInput } from '../shared/score-input'

// We need a schema that adapts to the match type
const formSchema = z.object({
  set1_a: z.coerce.number().min(0).max(7).optional(),
  set1_b: z.coerce.number().min(0).max(7).optional(),
  set2_a: z.coerce.number().min(0).max(7).optional(),
  set2_b: z.coerce.number().min(0).max(7).optional(),
  set3_a: z.coerce.number().min(0).max(7).optional(),
  set3_b: z.coerce.number().min(0).max(7).optional(),
  games_a: z.coerce.number().min(0).optional(),
  games_b: z.coerce.number().min(0).optional(),
})

interface EditMatchDialogProps {
  match: Match
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditMatchDialog({ match, open, onOpenChange }: EditMatchDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const isMixing = match.match_type === 'mixing'

  // Helper to parse existing score
  const parseScore = (score: string) => {
    // Standard: "6-4 6-2"
    // Mixing: "9-5"
    if (!score) return {}
    
    if (isMixing) {
      const [a, b] = score.split('-').map(Number)
      return { games_a: a || 0, games_b: b || 0 }
    } else {
      const parts = score.split(' ')
      const result: any = {}
      parts.forEach((part, idx) => {
        const [a, b] = part.split('-').map(Number)
        result[`set${idx + 1}_a`] = a
        result[`set${idx + 1}_b`] = b
      })
      return result
    }
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      ...parseScore(match.score_details || ""),
    },
  })

  // Reset form when match changes or opens
  useEffect(() => {
    if (open) {
      form.reset(parseScore(match.score_details || ""))
    }
  }, [match, open, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      let payload: any = {}

      if (isMixing) {
        if (values.games_a === undefined || values.games_b === undefined) throw new Error("Faltan juegos")
        // Draws allowed in Mixing
        // if (values.games_a === values.games_b) throw new Error("No se permite empate en Mixing")
        
        payload = {
            games_a: values.games_a,
            games_b: values.games_b,
            score_details: `${values.games_a}-${values.games_b}`
        }
      } else {
        // Standard Match Logic for Set Construction
        let scoreText = `${values.set1_a}-${values.set1_b} ${values.set2_a}-${values.set2_b}`
        if ((values.set3_a || 0) > 0 || (values.set3_b || 0) > 0) {
            scoreText += ` ${values.set3_a}-${values.set3_b}`
        }

        // Calculate Sets won
        let setsA = 0
        let setsB = 0
        if (values.set1_a! > values.set1_b!) setsA++
        else if (values.set1_b! > values.set1_a!) setsB++
        
        if (values.set2_a! > values.set2_b!) setsA++
        else if (values.set2_b! > values.set2_a!) setsB++
        
        if (values.set3_a !== undefined && values.set3_b !== undefined && ((values.set3_a > 0) || (values.set3_b > 0))) {
             if (values.set3_a > values.set3_b) setsA++
             else if (values.set3_b > values.set3_a) setsB++
        }

        payload = {
            sets_a: setsA,
            sets_b: setsB,
            score_details: scoreText
        }
      }

      await updateMatchScore(match.id, payload)
      toast.success("Resultado actualizado")
      onOpenChange(false)
      
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Error al actualizar")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Resultado ({isMixing ? 'Mixing' : 'Estándar'})</DialogTitle>
          <DialogDescription>
             Modifica el marcador del partido.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Players Display (Static) */}
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

            {isMixing ? (
               // MIXING INPUT
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
            ) : (
               // STANDARD INPUT
               <div className="space-y-3">
                   <div className="flex items-center justify-center gap-2">
                      <span className="w-12 text-xs font-bold text-muted-foreground">Set 1</span>
                      <ScoreInput name="set1_a" form={form} labelColor="text-indigo-600" />
                      <span>-</span>
                      <ScoreInput name="set1_b" form={form} labelColor="text-lime-600" />
                   </div>
                   <div className="flex items-center justify-center gap-2">
                      <span className="w-12 text-xs font-bold text-muted-foreground">Set 2</span>
                      <ScoreInput name="set2_a" form={form} labelColor="text-indigo-600" />
                      <span>-</span>
                      <ScoreInput name="set2_b" form={form} labelColor="text-lime-600" />
                   </div>
                   <div className="flex items-center justify-center gap-2">
                      <span className="w-12 text-xs font-bold text-muted-foreground">Set 3</span>
                      <ScoreInput name="set3_a" form={form} labelColor="text-indigo-600" />
                      <span>-</span>
                      <ScoreInput name="set3_b" form={form} labelColor="text-lime-600" />
                   </div>
               </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Guardando...' : 'Actualizar Resultado'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
