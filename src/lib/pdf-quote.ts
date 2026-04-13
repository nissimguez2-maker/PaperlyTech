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
  total: number
}

const CREAM = [249, 248, 246] as const
const GOLD = [201, 181, 156] as const
const GOLD_DARK = [158, 132, 104] as const
const BARK = [61, 53, 48] as const
const WHITE = [255, 255, 255] as const

export function generateQuotePdf(data: PdfQuoteData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const margin = 20

  // Background
  doc.setFillColor(...CREAM)
  doc.rect(0, 0, pageW, pageH, 'F')

  // Top gold accent bar
  doc.setFillColor(...GOLD)
  doc.rect(0, 0, pageW, 3, 'F')

  // Left gold stripe
  doc.setFillColor(...GOLD)
  doc.rect(0, 0, 5, pageH, 'F')

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(...GOLD_DARK)
  doc.text('PAPERLY', margin + 5, 28)
  doc.setFontSize(12)
  doc.setTextColor(...GOLD)
  doc.text('S T U D I O', margin + 5, 36)

  // Quote label
  doc.setFontSize(10)
  doc.setTextColor(...BARK)
  doc.setFont('helvetica', 'normal')
  doc.text('QUOTE', pageW - margin, 25, { align: 'right' })
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.setFontSize(8)
  doc.setTextColor(...GOLD_DARK)
  doc.text(today, pageW - margin, 31, { align: 'right' })

  // Divider
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.3)
  doc.line(margin, 42, pageW - margin, 42)

  // Client info card
  let y = 50
  doc.setFillColor(...WHITE)
  doc.roundedRect(margin, y, pageW - 2 * margin, 22, 3, 3, 'F')
  doc.setFontSize(8)
  doc.setTextColor(...GOLD_DARK)
  doc.text('CLIENT', margin + 6, y + 7)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...BARK)
  doc.text(data.clientName, margin + 6, y + 15)

  if (data.deliveryDate) {
    doc.setFontSize(8)
    doc.setTextColor(...GOLD_DARK)
    doc.setFont('helvetica', 'normal')
    doc.text('DELIVERY', pageW - margin - 6, y + 7, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...BARK)
    const dDate = new Date(data.deliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    doc.text(dDate, pageW - margin - 6, y + 15, { align: 'right' })
  }

  // Table
  y = 82
  const colX = { num: margin + 2, name: margin + 14, qty: 125, price: 148, total: 172 }
  const tableW = pageW - 2 * margin

  // Dark header row
  doc.setFillColor(...BARK)
  doc.roundedRect(margin, y, tableW, 10, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...WHITE)
  doc.text('#', colX.num + 3, y + 7)
  doc.text('DESCRIPTION', colX.name, y + 7)
  doc.text('QTY', colX.qty, y + 7, { align: 'center' })
  doc.text('UNIT PRICE', colX.price, y + 7, { align: 'center' })
  doc.text('TOTAL', colX.total + 10, y + 7, { align: 'right' })

  y += 12

  // Item rows
  data.items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(...WHITE)
      doc.rect(margin, y - 4, tableW, 12, 'F')
    }

    // Row number circle
    doc.setFillColor(...GOLD)
    doc.circle(colX.num + 4, y + 1.5, 3.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...WHITE)
    doc.text(String(idx + 1), colX.num + 4, y + 3, { align: 'center' })

    // Item name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BARK)
    doc.text(item.name || 'Item', colX.name, y + 2.5)

    if (item.description) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...GOLD_DARK)
      doc.text(item.description, colX.name, y + 7)
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BARK)

    if (item.isOffered) {
      doc.setTextColor(76, 140, 100)
      doc.text('Offered', colX.total + 10, y + 2.5, { align: 'right' })
    } else {
      if (!item.hideQty) {
        doc.text(String(item.quantity), colX.qty, y + 2.5, { align: 'center' })
      }
      doc.text('NIS ' + item.unitPrice.toLocaleString(), colX.price, y + 2.5, { align: 'center' })
      const lineTotal = item.quantity * item.unitPrice
      doc.setFont('helvetica', 'bold')
      doc.text('NIS ' + lineTotal.toLocaleString(), colX.total + 10, y + 2.5, { align: 'right' })
    }

    y += item.description ? 14 : 12
  })

  // Totals
  y += 5
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.3)
  doc.line(colX.price - 10, y, pageW - margin, y)

  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GOLD_DARK)
  doc.text('Subtotal', colX.price - 5, y)
  doc.setTextColor(...BARK)
  doc.text('NIS ' + data.subtotal.toLocaleString(), pageW - margin, y, { align: 'right' })

  if (data.discountAmount > 0) {
    y += 7
    doc.setTextColor(...GOLD_DARK)
    doc.text('Discount', colX.price - 5, y)
    doc.setTextColor(180, 80, 60)
    doc.text('-NIS ' + data.discountAmount.toLocaleString(), pageW - margin, y, { align: 'right' })
  }

  // Total box
  y += 10
  doc.setFillColor(...BARK)
  doc.roundedRect(colX.price - 10, y - 6, pageW - margin - colX.price + 10, 16, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...WHITE)
  doc.text('TOTAL', colX.price, y + 3)
  doc.setFontSize(14)
  doc.setTextColor(...GOLD)
  doc.text('NIS ' + data.total.toLocaleString(), pageW - margin - 4, y + 4, { align: 'right' })

  // Notes
  if (data.notes) {
    y += 24
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(...GOLD_DARK)
    doc.text('Note: ' + data.notes, margin + 5, y)
  }

  // Footer
  doc.setFillColor(...GOLD)
  doc.rect(0, pageH - 20, pageW, 20, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...WHITE)
  doc.text('Thank you for choosing Paperly Studio', pageW / 2, pageH - 10, { align: 'center' })

  doc.setFillColor(...BARK)
  doc.rect(0, pageH - 3, pageW, 3, 'F')

  // Save
  const fileName = 'Paperly_Quote_' + data.clientName.replace(/\s+/g, '_') + '.pdf'
  doc.save(fileName)
}
