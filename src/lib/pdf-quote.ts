import jsPDF from 'jspdf'

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
const PAGE_BG: [number, number, number] = [250, 248, 244]       // #FAF8F4
const NEAR_BLACK: [number, number, number] = [44, 36, 22]       // #2C2416
const GOLD: [number, number, number] = [184, 149, 106]          // #B8956A
const WARM_GRAY: [number, number, number] = [154, 142, 126]     // #9A8E7E
const LIGHT_CREAM: [number, number, number] = [242, 237, 229]   // #F2EDE5
const DIVIDER: [number, number, number] = [212, 201, 184]       // #D4C9B8
const DISC_RED: [number, number, number] = [192, 57, 43]        // #C0392B
const MUTED_CIRCLE: [number, number, number] = [229, 221, 208]  // #E5DDD0

function generateQuoteRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let ref = ''
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)]
  return 'Q-' + ref
}

function fmtNIS(n: number): string {
  return n.toLocaleString('en-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function generateQuotePdf(data: PdfQuoteData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const mL = 18 // left margin
  const mR = 18 // right margin
  const contentW = pageW - mL - mR
  const rightEdge = pageW - mR

  // --- Page background ---
  doc.setFillColor(...PAGE_BG)
  doc.rect(0, 0, pageW, pageH, 'F')

  // --- Left gold accent line (3px = ~1mm, full height) ---
  doc.setFillColor(...GOLD)
  doc.rect(0, 0, 1, pageH, 'F')

  // ======================== SECTION 1: HEADER ========================
  // Left: PAPERLY STUDIO
  // TODO: embed Cormorant Garamond for "STUDIO"
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...NEAR_BLACK)
  doc.text('PAPERLY', mL, 26)
  const paperlyW = doc.getTextWidth('PAPERLY')
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(22)
  doc.setTextColor(...GOLD)
  doc.text(' STUDIO', mL + paperlyW, 26)

  // Tagline
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...WARM_GRAY)
  doc.text('CREATIVE DIRECTION FOR PREMIUM EVENTS', mL, 32)

  // Right: quote ref + date
  const quoteRef = data.quoteRef || generateQuoteRef()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...GOLD)
  doc.text(quoteRef, rightEdge, 24, { align: 'right' })

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...WARM_GRAY)
  doc.text(today, rightEdge, 30, { align: 'right' })

  // Divider hairline at y=38
  doc.setDrawColor(...DIVIDER)
  doc.setLineWidth(0.15)
  doc.line(mL, 38, rightEdge, 38)

  // ======================== SECTION 2: DOCUMENT LABEL ========================
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...GOLD)
  doc.text('QUOTE', mL, 46)
  // Gold underline (28mm wide, 0.5pt)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.5)
  doc.line(mL, 48, mL + 28, 48)

  // ======================== SECTION 3: CLIENT INFO BLOCK ========================
  const clientBlockY = 52
  const clientBlockH = data.notes ? 30 : 26
  doc.setFillColor(...LIGHT_CREAM)
  doc.roundedRect(mL, clientBlockY, contentW, clientBlockH, 3, 3, 'F')

  // Left: PREPARED FOR + client name
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...WARM_GRAY)
  doc.text('PREPARED FOR', mL + 8, clientBlockY + 8)

  // TODO: embed Cormorant Garamond Bold for client name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...NEAR_BLACK)
  doc.text(data.clientName, mL + 8, clientBlockY + 16)

  // Notes below client name
  if (data.notes) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...WARM_GRAY)
    doc.text(data.notes, mL + 8, clientBlockY + 23)
  }

  // Right: DELIVERY DATE
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...WARM_GRAY)
  doc.text('DELIVERY DATE', 130, clientBlockY + 8)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...NEAR_BLACK)
  if (data.deliveryDate) {
    const dDate = new Date(data.deliveryDate + 'T00:00:00').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    doc.text(dDate, 130, clientBlockY + 16)
  } else {
    doc.text('\u2014', 130, clientBlockY + 16)
  }

  // ======================== SECTION 4: LINE ITEMS TABLE ========================
  let y = clientBlockY + clientBlockH + 6

  // Column positions
  const col = {
    num: mL + 4,       // circle center
    desc: mL + 14,
    qty: 125,
    price: 158,
    total: rightEdge,
  }

  // Table header (dark bar, top-only radius)
  const headerH = 9
  doc.setFillColor(...NEAR_BLACK)
  doc.roundedRect(mL, y, contentW, headerH, 2, 2, 'F')
  // Fill bottom corners to make only top rounded
  doc.rect(mL, y + headerH - 2, contentW, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...PAGE_BG)
  doc.text('#', col.num, y + 6)
  doc.text('DESCRIPTION', col.desc, y + 6)
  doc.text('QTY', col.qty, y + 6, { align: 'right' })
  doc.text('UNIT PRICE', col.price, y + 6, { align: 'right' })
  doc.text('TOTAL', col.total, y + 6, { align: 'right' })

  y += headerH

  // Item rows
  const rowH = 10
  data.items.forEach((item, idx) => {
    // Alternating row fill
    if (idx % 2 === 1) {
      doc.setFillColor(...LIGHT_CREAM)
      doc.rect(mL, y, contentW, rowH, 'F')
    }

    const rowCenter = y + rowH / 2

    // Row number circle
    doc.setFillColor(...MUTED_CIRCLE)
    doc.circle(col.num, rowCenter, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...WARM_GRAY)
    doc.text(String(idx + 1), col.num, rowCenter + 1.2, { align: 'center' })

    // Description
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...NEAR_BLACK)
    const descText = item.name || 'Item'
    doc.text(descText, col.desc, rowCenter + 1.2)

    if (item.isOffered) {
      // Append " — Offert" in italic gold
      const descW = doc.getTextWidth(descText)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(...GOLD)
      doc.text(' \u2014 Offert', col.desc + descW, rowCenter + 1.2)

      // Dash in total column
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...NEAR_BLACK)
      doc.text('\u2014', col.total, rowCenter + 1.2, { align: 'right' })
    } else {
      // QTY
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...NEAR_BLACK)
      if (item.hideQty) {
        doc.text('\u2014', col.qty, rowCenter + 1.2, { align: 'right' })
      } else {
        doc.text(String(item.quantity), col.qty, rowCenter + 1.2, { align: 'right' })
      }

      // Unit price
      doc.text('NIS ' + fmtNIS(item.unitPrice), col.price, rowCenter + 1.2, { align: 'right' })

      // Line total
      const lineTotal = item.quantity * item.unitPrice
      doc.setFont('helvetica', 'bold')
      doc.text('NIS ' + fmtNIS(lineTotal), col.total, rowCenter + 1.2, { align: 'right' })
    }

    y += rowH
  })

  // ======================== SECTION 5: TOTALS BLOCK ========================
  y += 8
  const totalsBlockW = 95
  const totalsLeft = rightEdge - totalsBlockW

  // Subtotal
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...WARM_GRAY)
  doc.text('Subtotal', totalsLeft, y)
  doc.setFontSize(10)
  doc.setTextColor(...NEAR_BLACK)
  doc.text('NIS ' + fmtNIS(data.subtotal), rightEdge, y, { align: 'right' })

  // Discount
  if (data.discountAmount > 0) {
    y += 7
    doc.setFontSize(9)
    doc.setTextColor(...WARM_GRAY)
    doc.text(data.discountLabel || 'Discount', totalsLeft, y)
    doc.setFontSize(10)
    doc.setTextColor(...DISC_RED)
    doc.text('\u2212NIS ' + fmtNIS(data.discountAmount), rightEdge, y, { align: 'right' })
  }

  // Hairline
  y += 5
  doc.setDrawColor(...DIVIDER)
  doc.setLineWidth(0.15)
  doc.line(totalsLeft, y, rightEdge, y)

  // Total box
  y += 4
  const totalBoxH = 14
  doc.setFillColor(...NEAR_BLACK)
  doc.roundedRect(totalsLeft, y, totalsBlockW, totalBoxH, 3, 3, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...PAGE_BG)
  doc.text('TOTAL', totalsLeft + 6, y + 9)

  // NIS prefix in gold
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...GOLD)
  const totalStr = fmtNIS(data.total)
  const totalW = doc.getTextWidth(totalStr) * 1.8 // estimate for larger font
  doc.text('NIS', rightEdge - totalW - 12, y + 9.5)

  // Amount
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...PAGE_BG)
  doc.text(totalStr, rightEdge - 4, y + 10, { align: 'right' })

  // ======================== SECTION 6: FOOTER ========================
  const footerY = 274
  doc.setDrawColor(...DIVIDER)
  doc.setLineWidth(0.15)
  doc.line(mL, footerY, rightEdge, footerY)

  // TODO: embed Cormorant Garamond Italic for thank-you line
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  doc.setTextColor(...GOLD)
  doc.text('Thank you for choosing Paperly Studio', mL, footerY + 8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...WARM_GRAY)
  doc.text('paperly.com', rightEdge, footerY + 8, { align: 'right' })
  doc.text(today, rightEdge, footerY + 14, { align: 'right' })

  // Save
  const fileName = 'Paperly_Quote_' + data.clientName.replace(/\s+/g, '_') + '.pdf'
  doc.save(fileName)
}
