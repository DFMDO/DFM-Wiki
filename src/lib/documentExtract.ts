import { pdfjsLib } from './pdfWorker'
import mammoth from 'mammoth'
import { createWorker } from 'tesseract.js'

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pageTexts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items.map((item: any) => item.str).join(' ')
    pageTexts.push(text)
  }
  return pageTexts.join('\n\n')
}

export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

// Texterkennung (OCR) für gescannte PDFs ohne auswählbaren Text.
// Rendert jede Seite als Bild und lässt Tesseract.js den Text erkennen.
export async function extractTextFromPdfWithOcr(
  file: File,
  onProgress?: (info: string) => void
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise
  const worker = await createWorker('deu')
  const pageTexts: string[] = []

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(`Seite ${i} von ${pdf.numPages} wird erkannt …`)
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport, canvas }).promise
      const dataUrl = canvas.toDataURL('image/png')
      const { data } = await worker.recognize(dataUrl)
      pageTexts.push(data.text)
    }
  } finally {
    await worker.terminate()
  }

  return pageTexts.join('\n\n')
}
