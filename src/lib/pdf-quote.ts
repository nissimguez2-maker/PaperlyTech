import jsPDF from 'jspdf'

interface PdfQuoteItem {
  name: string
  qty: number
  unitPrice: number
  isOffered: boolean
  hideQty: boolean
}

interface PdfQuoteData {
  client: string
  deliveryDate: string
  notes: string
  items: PdfQuoteItem[]
  subtotal: number
  discAmount: number
  discLabel: string
  total: number
}

// Brand colors
const BARK = [61, 53, 48] as const
const GOLD = [201, 181, 156] as const
const GOLD_DARK = [158, 132, 104] as const
const CREAM = [249, 248, 246] as const
const CREAM_DARK = [239, 233, 227] as const
const MUTED = [154, 145, 138] as const
const SAND = [217, 207, 199] as const
const FOREST = [74, 140, 92] as const
const CORAL = [160, 80, 80] as const
const WHITE = [255, 255, 255] as const

function setColor(doc: jsPDF, c: readonly [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2])
}
function setDraw(doc: jsPDF, c: readonly [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2])
}
function setFill(doc: jsPDF, c: readonly [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2])
}

export function generateQuotePdf(data: PdfQuoteData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const ml = 24  // margin left
  const mr = 24  // margin right
  const cw = W - ml - mr  // content width

  // ── Background: subtle cream fill ──
  setFill(doc, CREAM)
  doc.rect(0, 0, W, H, 'F')

  // ── Top decorative bar ──
  setFill(doc, GOLD)
  doc.rect(0, 0, W, 3, 'F')

  // ── Left accent stripe ──
  setFill(doc, GOLD_DARK)
  doc.rect(0, 0, 1.5, H, 'F')

  let y = 22

  // ── Studio name ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  setColor(doc, BARK)
  doc.text('PAPERLY', ml, y)

  // "STUDIO" in gold next to it
  const pw = doc.getTextWidth('PAPERLY ')
  doc.setFontSize(28)
  setColor(doc, GOLD_DARK)
  doc.text('STUDIO', ml + pw, y)

  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setColor(doc, MUTED)
  doc.text('CREATIVE DIRECTION FOR PREMIUM EVENTS', ml, y)
  doc.setFontSize(7)
  doc.text('ISRAEL', ml + doc.getTextWidth('CREATIVE DIRECTION FOR PREMIUM EVENTS  '), y)

  // ── Right-aligned quote number + date ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  setColor(doc, GOLD_DARK)
  const quoteNum = `Q-${Date.now().toString(36).toUpperCase().slice(-6)}`
  doc.text(quoteNum, W - mr, 18, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setColor(doc, MUTED)
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(today, W - mr, 24, { align: 'right' })

  y += 8

  // ── Gold divider ──
  setDraw(doc, GOLD)
  doc.setLineWidth(0.6)
  doc.line(ml, y, W - mr, y)

  y += 12

  // ── QUOTE title ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  setColor(doc, GOLD_DARK)
  doc.text('QUOTE', ml, y)
  doc.setLineWidth(0.3)
  doc.line(ml, y + 1.5, ml + 16, y + 1.5)

  y += 12

  // ── Client info card ──
  setFill(doc, WHITE)
  setDraw(doc, SAND)
  doc.setLineWidth(0.3)
  const cardH = data.deliveryDate ? (data.notes ? 30 : 24) : (data.notes ? 24 : 18)
  doc.roundedRect(ml, y - 4, cw, cardH, 2, 2, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setColor(doc, MUTED)
  doc.text('PREPARED FOR', ml + 5, y + 1)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  setColor(doc, BARK)
  doc.text(data.client, ml + 5, y + 8)

  let infoY = y + 1
  if (data.deliveryDate) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    setColor(doc, MUTED)
    doc.text('DELIVERY', W - mr - 50, infoY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    setColor(doc, BARK)
    const fmtDelivery = new Date(data.deliveryDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    doc.text(fmtDelivery, W - mr - 50, infoY + 5)
    infoY += 12
  }

  if (data.notes) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    setColor(doc, MUTED)
    const noteLines = doc.splitTextToSize(data.notes, cw - 10)
    doc.text(noteLines, ml + 5, y + (data.deliveryDate ? 16 : 12))
  }

  y += cardH + 10

  // ── Table header ──
  setFill(doc, BARK)
  doc.roundedRect(ml, y - 4, cw, 9, 1.5, 1.5, 'F')

  const cols = {
    num: ml + 5,
    desc: ml + 16,
    qty: ml + cw * 0.55,
    price: ml + cw * 0.7,
    total: ml + cw * 0.85,
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  setColor(doc, [249, 248, 246])
  doc.text('#', cols.num, y)
  doc.text('DESCRIPTION', cols.desc, y)
  doc.text('QTY', cols.qty, y)
  doc.text('UNIT PRICE', cols.price, y)
  doc.text('TOTAL', cols.total, y)

  y += 9

  // ── Table rows ──
  data.items.forEach((item, idx) => {
    if (y > 248) { doc.addPage(); y = 24; setFill(doc, CREAM); doc.rect(0, 0, W, H, 'F'); setFill(doc, GOLD); doc.rect(0, 0, W, 3, 'F'); setFill(doc, GOLD_DARK); doc.rect(0, 0, 1.5, H, 'F') }

    // Alternate row bg
    if (idx % 2 === 0) {
      setFill(doc, WHITE)
      doc.rect(ml, y - 4, cw, 9, 'F')
    } else {
      setFill(doc, CREAM_DARK)
      doc.rect(ml, y - 4, cw, 9, 'F')
    }

    const lineTotal = item.isOffered ? 0 : item.qty * item.unitPrice

    // Row number - gold circle
    setFill(doc, GOLD)
    doc.circle(cols.num + 2, y - 0.5, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    setColor(doc, WHITE)
    doc.text(String(idx + 1), cols.num + 2, y + 0.5, { align: 'center' })

    // Description
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    setColor(doc, BARK)
    const desc = item.name.length > 45 ? item.name.substring(0, 42) + '...' : item.name
    doc.text(desc, cols.desc, y)

    // Qty
    doc.setFontSize(8)
    setColor(doc, MUTED)
    if (!item.hideQty) doc.text(String(item.qty), cols.qty, y)

    // Unit price
    doc.text(`${item.unitPrice.toFixed(2)}`, cols.price, y)

    // Total
    if (item.isOffered) {
      doc.setFont('helvetica', 'italic')
      setColor(doc, FOREST)
      doc.text('Offered', cols.total, y)
    } else {
      doc.setFont('helvetica', 'bold')
      setColor(doc, BARK)
      doc.text(`${lineTotal.toFixed(2)}`, cols.total, y)
    }

    y += 9
  })

  // ── Bottom border of table ──
  setDraw(doc, SAND)
  doc.setLineWidth(0.3)
  doc.line(ml, y - 3, W - mr, y - 3)

  y += 6

  // ── Summary block (right-aligned) ──
  const sumX = ml + cw * 0.55
  const valX = W - mr

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  setColor(doc, MUTED)
  doc.text('Subtotal', sumX, y)
  setColor(doc, BARK)
  doc.text(`NIS ${data.subtotal.toFixed(2)}`, valX, y, { align: 'right' })
  y += 6

  if (data.discAmount > 0) {
    setColor(doc, MUTED)
    doc.text(data.discLabel, sumX, y)
    setColor(doc, CORAL)
    doc.text(`- NIS ${data.discAmount.toFixed(2)}`, valX, y, { align: 'right' })
    y += 6
  }

  // Total line
  setDraw(doc, GOLD)
  doc.setLineWidth(0.4)
  doc.line(sumX, y - 1, W - mr, y - 1)
  y += 5

  // Total box
  setFill(doc, BARK)
  doc.roundedRect(sumX - 2, y - 6, cw * 0.45 + 2, 14, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  setColor(doc, GOLD)
  doc.text('TOTAL', sumX + 3, y + 1)

  doc.setFontSize(16)
  setColor(doc, WHITE)
  doc.text(`NIS ${data.total.toFixed(2)}`, valX - 3, y + 2, { align: 'right' })

  // ── Footer area ──
  const footY = H - 22

  // Gold line
  setDraw(doc, GOLD)
  doc.setLineWidth(0.4)
  doc.line(ml, footY, W - mr, footY)

  // Thank you
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  setColor(doc, GOLD_DARK)
  doc.text('Thank you for choosing Paperly Studio', ml, footY + 7)

  // Contact
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  setColor(doc, MUTED)
  doc.text('paperly.com', ml, footY + 12)

  doc.setFontSize(7)
  doc.text(today, W - mr, footY + 12, { align: 'right' })

  // ── Bottom decorative bar ──
  setFill(doc, GOLD)
  doc.rect(0, H - 3, W, 3, 'F')

  // Save
  const safeName = data.client.replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`Paperly_Quote_${safeName}.pdf`)
}
