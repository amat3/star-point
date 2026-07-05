'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/utils/supabase/client'
import { updateAvatarUrl } from '@/app/actions/users'
import { toast } from 'sonner'

const MAX_ORIGINAL_SIZE = 25 * 1024 * 1024 // 25MB — guard antes de intentar decodificar
const OUTPUT_SIZE = 512
const JPEG_QUALITY = 0.85

interface AvatarUploadProps {
  userId: string
  avatarUrl?: string | null
  userName: string
}

export function AvatarUpload({ userId, avatarUrl, userName }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl ?? null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a seleccionar el mismo archivo después
    if (!file) return

    if (file.size > MAX_ORIGINAL_SIZE) {
      toast.error('La foto es demasiado pesada, prueba con otra')
      return
    }

    setUploading(true)
    try {
      const blob = await compressToSquareJpeg(file)
      const supabase = createClient()
      const path = `${userId}/avatar.jpg`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) throw new Error(uploadError.message)

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const bustedUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

      await updateAvatarUrl(bustedUrl)
      setPreviewUrl(bustedUrl)
      toast.success('Foto de perfil actualizada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo procesar esa foto, prueba con otra')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative block rounded-full disabled:opacity-70"
        title="Cambiar foto de perfil"
      >
        <Avatar className="h-32 w-32 border-4 border-lime-500">
          <AvatarImage src={previewUrl ?? undefined} />
          <AvatarFallback className="bg-lime-100 text-lime-800 text-4xl font-bold">
            {userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        </span>
      </button>
    </div>
  )
}

async function compressToSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')

  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen'))),
      'image/jpeg',
      JPEG_QUALITY
    )
  })
}
