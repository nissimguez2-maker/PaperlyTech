import jsPDF from 'jspdf'
import { PDF_FONTS } from './pdf-fonts'
import { PDF_LOGO } from './pdf-logo'

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

export interface GenerateQuoteOptions {
  lang: 'fr' | 'en'
}

// ── Palette — pure black on warm-white, hairlines only. No accent colour. ──
const PAPER:    [number, number, number] = [253, 252, 250] // warm-white ground (only fill)
const INK:      [number, number, number] = [26, 24, 22]    // near-black — names, totals
const INK_SOFT: [number, number, number] = [88, 80, 72]    // labels, dates, footer (darkened for legibility)
const HAIRLINE: [number, number, number] = [222, 218, 212] // structural rules
const NEUTRAL:  [number, number, number] = [150, 146, 140] // offered / struck items

const STRINGS = {
  fr: {
    quote: 'DEVIS', preparedFor: 'PRÉPARÉ POUR', deliveryDate: 'DATE DE LIVRAISON',
    description: 'DÉSIGNATION', qty: 'QTÉ', unitPrice: 'PRIX UNITAIRE', amount: 'MONTANT',
    subtotal: 'Sous-total', discount: 'Remise', offered: 'Offert', total: 'TOTAL',
    thankYou: 'Merci de votre confiance.', none: '—', itemFallback: 'Article', fileStem: 'Paperly_Devis',
  },
  en: {
    quote: 'QUOTE', preparedFor: 'PREPARED FOR', deliveryDate: 'DELIVERY DATE',
    description: 'DESCRIPTION', qty: 'QTY', unitPrice: 'UNIT PRICE', amount: 'AMOUNT',
    subtotal: 'Subtotal', discount: 'Discount', offered: 'Complimentary', total: 'TOTAL',
    thankYou: 'Thank you for your trust.', none: '—', itemFallback: 'Item', fileStem: 'Paperly_Quote',
  },
} as const

/** Money, language-aware. Value first, then ₪ (Israeli convention). 2 decimals, matches screen. */
function fmtMoney(n: number, lang: 'fr' | 'en'): string {
  const fixed = Math.abs(n).toFixed(2)
  const s = lang === 'fr'
    ? fixed.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    : fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return s + ' ₪'
}

function fmtDate(iso: string, lang: 'fr' | 'en'): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function registerFonts(doc: jsPDF) {
  doc.addFileToVFS('Inter-Regular.ttf', PDF_FONTS.InterRegular)
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal')
  doc.addFileToVFS('Inter-Bold.ttf', PDF_FONTS.InterBold)
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold')
  doc.addFileToVFS('Inter-SemiBold.ttf', PDF_FONTS.InterSemiBold)
  doc.addFont('Inter-SemiBold.ttf', 'InterSB', 'normal')
  doc.addFileToVFS('Cormorant-Bold.ttf', PDF_FONTS.CormorantBold)
  doc.addFont('Cormorant-Bold.ttf', 'Cormorant', 'bold')
  doc.addFileToVFS('Cormorant-Italic.ttf', PDF_FONTS.CormorantItalic)
  doc.addFont('Cormorant-Italic.ttf', 'Cormorant', 'italic')
}

export function generateQuotePdf(data: PdfQuoteData, opts: GenerateQuoteOptions) {
  const { lang } = opts
  const t = STRINGS[lang]
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  registerFonts(doc)

  const pageW = 210, pageH = 297
  const mL = 20, mR = 20
  const rightEdge = pageW - mR

  doc.setFillColor(...PAPER)
  doc.rect(0, 0, pageW, pageH, 'F')

  const rule = (x1: number, y: number, x2: number, rgb = HAIRLINE, w = 0.2) => {
    doc.setDrawColor(...rgb); doc.setLineWidth(w); doc.line(x1, y, x2, y)
  }

  // ══════════ MASTHEAD ══════════
  const logoH = 13
  const logoW = logoH * PDF_LOGO.ratio
  doc.addImage(PDF_LOGO.paperMark, 'PNG', mL, 13, logoW, logoH)

  const today = new Date().toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.setFont('Inter', 'normal'); doc.setFontSize(9); doc.setTextColor(...INK_SOFT)
  doc.text(today, rightEdge, 21, { align: 'right' })

  rule(mL, 34, rightEdge)

  // ── short-quote balancing: shift the body down so a short quote sits composed ──
  const n = data.items.length
  const rowH = 13
  const hasDiscount = data.discountAmount > 0
  const bodyH = 28 + 16 + 9 + n * rowH + 12 + (hasDiscount ? 35 : 28)
  const naturalTop = 46
  const footerRuleY = 278
  const slack = (footerRuleY - 16) - (naturalTop + bodyH)
  const shift = slack > 0 ? Math.min(slack * 0.42, 38) : 0
  let y = naturalTop + shift

  // ══════════ DEVIS · CLIENT (hero) · DELIVERY ══════════
  doc.setFont('Inter', 'normal'); doc.setFontSize(8); doc.setTextColor(...INK_SOFT)
  doc.text(t.quote, mL, y, { charSpace: 0.8 })
  doc.text(t.deliveryDate, rightEdge, y, { align: 'right', charSpace: 0.5 })

  y += 11
  doc.setFont('Cormorant', 'bold'); doc.setFontSize(30); doc.setTextColor(...INK)
  doc.text(data.clientName, mL, y)
  doc.setFont('InterSB', 'normal'); doc.setFontSize(12); doc.setTextColor(...INK)
  doc.text(data.deliveryDate ? fmtDate(data.deliveryDate, lang) : t.none, rightEdge, y, { align: 'right' })

  y += 6
  rule(mL, y, rightEdge)

  if (data.notes) {
    y += 7
    doc.setFont('Cormorant', 'italic'); doc.setFontSize(11); doc.setTextColor(...INK_SOFT)
    doc.text(data.notes, mL, y)
  }

  // ══════════ LINE ITEMS — hairline columns, no fills ══════════
  y += 16
  const colQty = 124, colPrice = 158, colAmt = rightEdge
  doc.setFont('InterSB', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...INK_SOFT)
  doc.text(t.description, mL, y, { charSpace: 0.4 })
  doc.text(t.qty, colQty, y, { align: 'right', charSpace: 0.4 })
  doc.text(t.unitPrice, colPrice, y, { align: 'right', charSpace: 0.4 })
  doc.text(t.amount, colAmt, y, { align: 'right', charSpace: 0.4 })
  y += 3
  rule(mL, y, rightEdge)

  let rowTop = y
  data.items.forEach((item) => {
    const b = rowTop + 9
    const nameText = item.name || t.itemFallback
    doc.setFont('Cormorant', 'bold'); doc.setFontSize(13.5); doc.setTextColor(...INK)
    doc.text(nameText, mL, b)
    if (item.isOffered) {
      const nw = doc.getTextWidth(nameText)
      doc.setFont('Cormorant', 'italic'); doc.setFontSize(11.5); doc.setTextColor(...NEUTRAL)
      doc.text('  ' + t.offered, mL + nw, b)
      doc.setFont('Inter', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...NEUTRAL)
      doc.text(t.none, colAmt, b, { align: 'right' })
    } else {
      // qty + unit price: dark and a touch larger so they read clearly (supporting weight)
      doc.setFont('Inter', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...INK)
      doc.text(item.hideQty ? t.none : String(item.quantity), colQty, b, { align: 'right' })
      doc.text(fmtMoney(item.unitPrice, lang), colPrice, b, { align: 'right' })
      // amount: the result — semibold + largest figure on the line
      doc.setFont('InterSB', 'normal'); doc.setFontSize(11.5); doc.setTextColor(...INK)
      doc.text(fmtMoney(item.quantity * item.unitPrice, lang), colAmt, b, { align: 'right' })
    }
    rowTop += rowH
  })
  rule(mL, rowTop + 1, rightEdge)

  // ══════════ TOTALS — rule + large figure, no box ══════════
  y = rowTop + 13
  const totL = rightEdge - 72
  doc.setFont('Inter', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK_SOFT)
  doc.text(t.subtotal, totL, y)
  doc.setFontSize(10.5); doc.setTextColor(...INK)
  doc.text(fmtMoney(data.subtotal, lang), rightEdge, y, { align: 'right' })

  if (hasDiscount) {
    y += 7
    doc.setFont('Inter', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK_SOFT)
    doc.text(data.discountLabel || t.discount, totL, y)
    doc.setFontSize(10.5); doc.setTextColor(...INK_SOFT)
    doc.text('− ' + fmtMoney(data.discountAmount, lang), rightEdge, y, { align: 'right' })
  }

  y += 7
  rule(totL, y, rightEdge, INK, 0.4)
  y += 10
  doc.setFont('InterSB', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...INK)
  doc.text(t.total, totL, y, { charSpace: 0.7 })
  doc.setFont('Inter', 'bold'); doc.setFontSize(20); doc.setTextColor(...INK)
  doc.text(fmtMoney(data.total, lang), rightEdge, y, { align: 'right' })

  // ══════════ FOOTER (pinned) ══════════
  rule(mL, footerRuleY, rightEdge)
  doc.setFont('Cormorant', 'italic'); doc.setFontSize(12.5); doc.setTextColor(...INK_SOFT)
  doc.text(t.thankYou, mL, footerRuleY + 8)
  doc.setFont('Inter', 'normal'); doc.setFontSize(9); doc.setTextColor(...INK)
  doc.text('Sacha Guez  ·  +972-58-6170698', rightEdge, footerRuleY + 7, { align: 'right' })
  doc.setFont('Inter', 'normal'); doc.setFontSize(9); doc.setTextColor(...INK_SOFT)
  doc.text('sachaguez.mt@gmail.com', rightEdge, footerRuleY + 12, { align: 'right' })

  const fileName = t.fileStem + '_' + data.clientName.replace(/\s+/g, '_') + '.pdf'
  doc.save(fileName)
}
