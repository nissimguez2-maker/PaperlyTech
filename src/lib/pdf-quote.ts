import jsPDF from 'jspdf'
import { PDF_FONTS } from './pdf-fonts'

export interface PdfQuoteItem {
  name: string
  description: string | null
  quantity: number
  unitPrice: number
  isOffered: boolean
  hideQty: boolean
}

export interface PdfQuoteData {
  clientName: string
  deliveryDate: string | null
  notes: string | null
  items: PdfQuoteItem[]
  subtotal: number
  discountAmount: number
  discountLabel?: string
  total: number
  quoteRef?: string
}

// Color palette
const PAGE_BG: [number, number, number] = [250, 248, 244]
const NEAR_BLACK: [number, number, number] = [44, 36, 22]
const GOLD: [number, number, number] = [184, 149, 106]
const WARM_GRAY: [number, number, number] = [154, 142, 126]
const LIGHT_CREAM: [number, number, number] = [242, 237, 229]
const DIVIDER: [number, number, number] = [212, 201, 184]
const DISC_RED: [number, number, number] = [192, 57, 43]
const MUTED_CIRCLE: [number, number, number] = [229, 221, 208]

function generateQuoteRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let ref = ''
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)]
  return 'Q-' + ref
}

function fmtNIS(n: number): string {
  return n.toLocaleString('en-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function registerFonts(doc: jsPDF) {
  // Inter
  doc.addFileToVFS('Inter-Regular.ttf', PDF_FONTS.InterRegular)
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal')
  doc.addFileToVFS('Inter-Bold.ttf', PDF_FONTS.InterBold)
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold')
  doc.addFileToVFS('Inter-SemiBold.ttf', PDF_FONTS.InterSemiBold)
  doc.addFont('Inter-SemiBold.ttf', 'InterSB', 'normal')

  // Cormorant Garamond
  doc.addFileToVFS('Cormorant-Bold.ttf', PDF_FONTS.CormorantBold)
  doc.addFont('Cormorant-Bold.ttf', 'Cormorant', 'bold')
  doc.addFileToVFS('Cormorant-Italic.ttf', PDF_FONTS.CormorantItalic)
  doc.addFont('Cormorant-Italic.ttf', 'Cormorant', 'italic')
}

export function generateQuotePdf(data: PdfQuoteData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  registerFonts(doc)

  const pageW = 210
  const pageH = 297
  const mL = 18
  const mR = 18
  const contentW = pageW - mL - mR
  const rightEdge = pageW - mR

  // ── Page background ──
  doc.setFillColor(...PAGE_BG)
  doc.rect(0, 0, pageW, pageH, 'F')

  // ── Left gold accent stripe ──
  doc.setFillColor(...GOLD)
  doc.rect(0, 0, 2.5, pageH, 'F')

  // ══════════════ HEADER ══════════════

  // PAPERLY in Inter Bold
  doc.setFont('Inter', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(...NEAR_BLACK)
  doc.text('PAPERLY', mL, 26)
  const pw = doc.getTextWidth('PAPERLY ')

  // STUDIO in Cormorant Italic
  doc.setFont('Cormorant', 'italic')
  doc.setFontSize(26)
  doc.setTextColor(...GOLD)
  doc.text('STUDIO', mL + pw, 26)

  // Tagline
  doc.setFont('Inter', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...WARM_GRAY)
  doc.text('CREATIVE DIRECTION FOR PREMIUM EVENTS', mL, 32)

  // Right: quote ref + date
  const quoteRef = data.quoteRef || generateQuoteRef()
  doc.setFont('Inter', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...GOLD)
  doc.text(quoteRef, rightEdge, 22, { align: 'right' })

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.setFont('Inter', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...WARM_GRAY)
  doc.text(today, rightEdge, 28, { align: 'right' })

  // Hairline divider
  doc.setDrawColor(...DIVIDER)
  doc.setLineWidth(0.15)
  doc.line(mL, 36, rightEdge, 36)

  // ══════════════ QUOTE LABEL ══════════════
  doc.setFont('Inter', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...GOLD)
  doc.text('QUOTE', mL, 43)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.5)
  doc.line(mL, 45, mL + 22, 45)

  // ══════════════ CLIENT INFO BLOCK ══════════════
  const cY = 50
  const cH = data.notes ? 30 : 26
  doc.setFillColor(...LIGHT_CREAM)
  doc.roundedRect(mL, cY, contentW, cH, 3, 3, 'F')

  const pad = 8

  // PREPARED FOR label
  doc.setFont('Inter', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...WARM_GRAY)
  doc.text('PREPARED FOR', mL + pad, cY + 8)

  // Client name in Cormorant Bold
  doc.setFont('Cormorant', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...NEAR_BLACK)
  doc.text(data.clientName, mL + pad, cY + 17)

  // Notes
  if (data.notes) {
    doc.setFont('Cormorant', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...WARM_GRAY)
    doc.text(data.notes, mL + pad, cY + 24)
  }

  // DELIVERY DATE
  doc.setFont('Inter', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...WARM_GRAY)
  doc.text('DELIVERY DATE', rightEdge - pad, cY + 8, { align: 'right' })

  doc.setFont('InterSB', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(...NEAR_BLACK)
  if (data.deliveryDate) {
    const dDate = new Date(data.deliveryDate + 'T00:00:00').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    doc.text(dDate, rightEdge - pad, cY + 16, { align: 'right' })
  } else {
    doc.text('—', rightEdge - pad, cY + 16, { align: 'right' })
  }

  // ══════════════ LINE ITEMS TABLE ══════════════
  let y = cY + cH + 8

  const col = {
    num: mL + 6,
    desc: mL + 16,
    qty: 118,
    price: 152,
    total: rightEdge,
  }

  // ── Table header (dark bar) ──
  const hdrH = 9
  doc.setFillColor(...NEAR_BLACK)
  doc.roundedRect(mL, y, contentW, hdrH, 2, 2, 'F')
  doc.rect(mL, y + hdrH - 2, contentW, 2, 'F')

  doc.setFont('InterSB', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...PAGE_BG)
  doc.text('#', mL + 6, y + 6)
  doc.text('DESCRIPTION', mL + 16, y + 6)
  doc.text('QTY', col.qty, y + 6, { align: 'right' })
  doc.text('UNIT PRICE', col.price, y + 6, { align: 'right' })
  doc.text('TOTAL', col.total, y + 6, { align: 'right' })

  y += hdrH

  // ── Item rows ──
  const rowH = 11
  data.items.forEach((item, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(...LIGHT_CREAM)
      doc.rect(mL, y, contentW, rowH, 'F')
    }

    const mid = y + rowH / 2 + 1

    // Row number circle
    doc.setFillColor(...MUTED_CIRCLE)
    doc.circle(col.num, y + rowH / 2, 3.2, 'F')
    doc.setFont('Inter', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...WARM_GRAY)
    doc.text(String(idx + 1), col.num, mid, { align: 'center' })

    // Description
    doc.setFont('Inter', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...NEAR_BLACK)
    const descText = item.name || 'Item'
    doc.text(descText, col.desc, mid)

    if (item.isOffered) {
      const dw = doc.getTextWidth(descText)
      doc.setFont('Cormorant', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(...GOLD)
      doc.text(' — Offert', col.desc + dw, mid)

      doc.setFont('Inter', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(...WARM_GRAY)
      doc.text('—', col.total, mid, { align: 'right' })
    } else {
      doc.setFont('Inter', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(...NEAR_BLACK)
      doc.text(item.hideQty ? '—' : String(item.quantity), col.qty, mid, { align: 'right' })

      doc.text('NIS ' + fmtNIS(item.unitPrice), col.price, mid, { align: 'right' })

      const lt = item.quantity * item.unitPrice
      doc.setFont('Inter', 'bold')
      doc.text('NIS ' + fmtNIS(lt), col.total, mid, { align: 'right' })
    }

    y += rowH
  })

  // Bottom table border
  doc.setDrawColor(...DIVIDER)
  doc.setLineWidth(0.15)
  doc.line(mL, y, rightEdge, y)

  // ══════════════ TOTALS ══════════════
  y += 10
  const totW = 85
  const totL = rightEdge - totW

  // Subtotal
  doc.setFont('Inter', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...WARM_GRAY)
  doc.text('Subtotal', totL, y)
  doc.setFontSize(10)
  doc.setTextColor(...NEAR_BLACK)
  doc.text('NIS ' + fmtNIS(data.subtotal), rightEdge, y, { align: 'right' })

  // Discount
  if (data.discountAmount > 0) {
    y += 7
    doc.setFont('Inter', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...WARM_GRAY)
    doc.text(data.discountLabel || 'Discount', totL, y)
    doc.setFontSize(10)
    doc.setTextColor(...DISC_RED)
    doc.text('-NIS ' + fmtNIS(data.discountAmount), rightEdge, y, { align: 'right' })
  }

  // Hairline
  y += 6
  doc.setDrawColor(...DIVIDER)
  doc.setLineWidth(0.15)
  doc.line(totL, y, rightEdge, y)

  // Total dark box
  y += 5
  const boxH = 14
  doc.setFillColor(...NEAR_BLACK)
  doc.roundedRect(totL, y, totW, boxH, 3, 3, 'F')

  // TOTAL label
  doc.setFont('Inter', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...PAGE_BG)
  doc.text('TOTAL', totL + 8, y + 9)

  // Total amount
  const totalStr = fmtNIS(data.total)
  doc.setFont('Inter', 'bold')
  doc.setFontSize(18)
  const numW = doc.getTextWidth(totalStr)
  const numX = rightEdge - 6

  doc.setTextColor(...PAGE_BG)
  doc.text(totalStr, numX, y + 10, { align: 'right' })

  // NIS prefix in gold
  doc.setFont('Inter', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...GOLD)
  doc.text('NIS', numX - numW - 3, y + 9)

  // ══════════════ FOOTER ══════════════
  const fY = 274
  doc.setDrawColor(...DIVIDER)
  doc.setLineWidth(0.15)
  doc.line(mL, fY, rightEdge, fY)

  // Thank you in Cormorant Italic
  doc.setFont('Cormorant', 'italic')
  doc.setFontSize(11)
  doc.setTextColor(...GOLD)
  doc.text('Thank you for choosing Paperly Studio', mL, fY + 8)

  doc.setFont('Inter', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...WARM_GRAY)
  doc.text('paperly.com', rightEdge, fY + 8, { align: 'right' })

  // Save
  const fileName = 'Paperly_Quote_' + data.clientName.replace(/\s+/g, '_') + '.pdf'
  doc.save(fileName)
}
