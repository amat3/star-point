'use client'

import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { ThinkingOrb } from 'thinking-orbs'
import styled from '@emotion/styled'
import Avatar from '@/components/atoms/Avatar'
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
    <Root>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileChange}
      />
      <Trigger
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Cambiar foto de perfil"
        aria-label="Cambiar foto de perfil"
      >
        <Avatar src={previewUrl} name={userName} size={104} />
        <CameraBadge>
          {uploading ? <ThinkingOrb state="composing" size={20} theme="auto" aria-label="Subiendo…" /> : <Camera />}
        </CameraBadge>
      </Trigger>
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  flex-shrink: 0;
`

const Trigger = styled.button`
  position: relative;
  display: block;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;

  &:disabled {
    opacity: 0.7;
  }
`

const CameraBadge = styled.span`
  position: absolute;
  right: 0;
  bottom: 0;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 2px solid ${({ theme }) => theme.colors.background};
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.forest};
  color: ${({ theme }) => theme.colors.onForest};

  svg {
    width: 1rem;
    height: 1rem;
  }
`

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
