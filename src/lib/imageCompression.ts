// Verkleinert Fotos vor dem Hochladen client-seitig — spart Zeit und Datenvolumen
// im Museums-WLAN. Videos, GIFs, SVGs und bereits kleine Dateien werden unverändert
// gelassen.
export async function compressImageIfNeeded(file: File, maxDimension = 1920, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file
  }
  // Kleine Fotos lohnen den Aufwand nicht
  if (file.size < 700 * 1024) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    if (scale >= 1) {
      bitmap.close?.()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file

    const newName = file.name.replace(/\.[a-z0-9]+$/i, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg' })
  } catch {
    // Bei Problemen (z.B. exotisches Format) lieber Original hochladen als scheitern
    return file
  }
}
