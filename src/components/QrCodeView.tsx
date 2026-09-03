import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QrCodeViewProps {
  url: string
  label: string
  sublabel?: string
}

export function QrCodeView({ url, label, sublabel }: QrCodeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dataUrl, setDataUrl] = useState<string>('')

  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 2, color: { dark: '#000000', light: '#ffffff' } }).then(
      setDataUrl
    )
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 240, margin: 2 })
    }
  }, [url])

  function handleDownload() {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `qr-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
    a.click()
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <title>QR-Code – ${label}</title>
        <style>
          body { font-family: -apple-system, Arial, sans-serif; text-align: center; padding: 40px; }
          .card { border: 2px solid #000; border-radius: 16px; padding: 32px; max-width: 400px; margin: 0 auto; }
          .brand { font-size: 14px; letter-spacing: 0.05em; color: #555; margin-bottom: 16px; }
          img { width: 260px; height: 260px; }
          .title { font-size: 22px; font-weight: bold; margin-top: 16px; text-transform: uppercase; }
          .hint { font-size: 13px; color: #555; margin-top: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand">🏛️ MUSEUM WIKI</div>
          <img src="${dataUrl}" alt="QR-Code" />
          <div class="title">${label}</div>
          <div class="hint">Problem? QR-Code scannen</div>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-center">
      <div className="text-xs text-neutral-500 mb-3">🏛️ MUSEUM WIKI</div>
      <canvas ref={canvasRef} className="mx-auto rounded-lg bg-white p-2" />
      <div className="font-bold mt-4">{label}</div>
      {sublabel && <div className="text-xs text-neutral-500 mt-1">{sublabel}</div>}
      <div className="text-xs text-neutral-600 mt-2 break-all">{url}</div>

      <div className="flex gap-2 justify-center mt-5">
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-bold"
        >
          PNG herunterladen
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-accent hover:bg-accent-dark rounded-lg text-sm font-bold"
        >
          Druckansicht
        </button>
      </div>
    </div>
  )
}
