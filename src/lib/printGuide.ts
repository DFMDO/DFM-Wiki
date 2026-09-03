function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

const calloutStyles: Record<string, { icon: string; bg: string; border: string }> = {
  WARNUNG: { icon: '⚠️', bg: '#fff4e5', border: '#f59e0b' },
  GEFAHR: { icon: '🛑', bg: '#fee2e2', border: '#dc2626' },
  INFO: { icon: 'ℹ️', bg: '#e0f2fe', border: '#3b82f6' },
  TIPP: { icon: '💡', bg: '#fef9c3', border: '#eab308' },
  LOESUNG: { icon: '✅', bg: '#dcfce7', border: '#16a34a' }
}

function normalizeType(raw: string): string {
  return raw.toUpperCase().replace('Ö', 'OE').replace('Ä', 'AE').replace('Ü', 'UE')
}

function contentToHtml(content: string, imageUrls: string[]): string {
  const blocks = content.split(/\n\s*\n/)
  return blocks
    .map((block) => {
      const calloutMatch = block.match(/^\[!([A-Za-zÄÖÜäöü]+)\]\s*/)
      if (calloutMatch) {
        const type = normalizeType(calloutMatch[1])
        const style = calloutStyles[type]
        const text = block.slice(calloutMatch[0].length).trim()
        if (style) {
          return `<div style="background:${style.bg};border-left:4px solid ${style.border};border-radius:6px;padding:10px 14px;margin:12px 0;font-size:14px;">${style.icon} ${escapeHtml(
            text
          ).replace(/\n/g, '<br>')}</div>`
        }
      }
      const imageMatch = block.match(/^\[(?:Bild|Foto|Abb\.?)\s*(\d+)\]\s*(.*)$/i)
      if (imageMatch) {
        const idx = parseInt(imageMatch[1], 10) - 1
        const caption = imageMatch[2]?.trim()
        const url = imageUrls[idx]
        if (url) {
          return `<figure style="margin:14px 0;"><img src="${url}" style="max-width:100%; border-radius:8px; display:block;"><figcaption style="font-size:11px; color:#888; text-align:center; margin-top:4px;">Abb. ${idx + 1}${caption ? ' — ' + escapeHtml(caption) : ''}</figcaption></figure>`
        }
      }
      const lines = block
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      if (lines.length > 0 && lines.every((l) => /^\d+\.\s+/.test(l))) {
        return `<ol style="padding-left:22px; margin:12px 0;">${lines
          .map((l) => `<li style="margin-bottom:4px;">${escapeHtml(l.replace(/^\d+\.\s+/, ''))}</li>`)
          .join('')}</ol>`
      }
      return `<p style="margin:12px 0; line-height:1.6;">${escapeHtml(block).replace(/\n/g, '<br>')}</p>`
    })
    .join('')
}

export function printGuide(params: {
  title: string
  summary?: string | null
  areaName?: string
  stationName?: string
  content: string
  tags?: string[]
  imageUrls?: string[]
  referenceUrl?: string | null
  referenceLabel?: string | null
  logoDataUrl?: string
}) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(params.title)}</title>
      <style>
        body { font-family: -apple-system, Arial, sans-serif; color: #111; padding: 32px; max-width: 700px; margin: 0 auto; }
        .brand { display:flex; align-items:center; gap:10px; border-bottom:2px solid #e2273e; padding-bottom:10px; margin-bottom:20px; }
        .brand img { height: 32px; }
        .brand span { font-size:12px; color:#666; letter-spacing:.04em; text-transform:uppercase; }
        .breadcrumb { font-size:12px; color:#888; margin-bottom:6px; }
        h1 { font-size: 22px; margin: 0 0 6px 0; }
        .summary { color:#555; margin-bottom:10px; }
        .tags { margin-bottom:16px; }
        .tag { display:inline-block; background:#f1f1f1; border-radius:12px; padding:3px 10px; font-size:11px; color:#555; margin-right:6px; }
        .ref { display:inline-block; margin-bottom:16px; font-size:13px; color:#2563eb; }
        img.guide-photo { max-width:100%; border-radius:8px; margin:10px 0; display:block; }
        .footer { margin-top:32px; padding-top:10px; border-top:1px solid #ddd; font-size:11px; color:#999; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="brand">
        ${params.logoDataUrl ? `<img src="${params.logoDataUrl}" alt="">` : ''}
        <span>Museum Wiki</span>
      </div>
      ${params.areaName ? `<div class="breadcrumb">${escapeHtml(params.areaName)} › ${escapeHtml(params.stationName || '')}</div>` : ''}
      <h1>${escapeHtml(params.title)}</h1>
      ${params.summary ? `<div class="summary">${escapeHtml(params.summary)}</div>` : ''}
      ${
        params.tags && params.tags.length > 0
          ? `<div class="tags">${params.tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}</div>`
          : ''
      }
      ${
        params.referenceUrl
          ? `<a class="ref" href="${escapeHtml(params.referenceUrl)}">📎 ${escapeHtml(params.referenceLabel || 'Weiterführender Link')}</a><br>`
          : ''
      }
      <div>${contentToHtml(params.content, params.imageUrls || [])}</div>
      ${(params.imageUrls || [])
        .filter((_, idx) => !new RegExp(`\\[(?:Bild|Foto|Abb\\.?)\\s*${idx + 1}\\]`, 'i').test(params.content))
        .map((url) => `<img class="guide-photo" src="${url}">`)
        .join('')}
      <div class="footer">Gedruckt am ${new Date().toLocaleDateString('de-DE')} aus dem Museum Wiki</div>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `
  printWindow.document.write(html)
  printWindow.document.close()
}
