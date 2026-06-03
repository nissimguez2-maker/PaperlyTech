#!/usr/bin/env node
// Garde-fou polices PDF (cf. audit C1) : décode chaque police embarquée dans
// src/lib/pdf-fonts.ts et vérifie qu'il s'agit bien d'un fichier TTF/OTF.
// Les polices Inter actuelles sont en réalité des pages HTML encodées en base64
// (le PDF retombe alors en Helvetica). Ce script échoue (exit 1) tant que ce
// n'est pas corrigé. À câbler dans `prebuild` une fois de vrais TTF embarqués.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fontsPath = fileURLToPath(new URL('../src/lib/pdf-fonts.ts', import.meta.url))
const src = readFileSync(fontsPath, 'utf8')

// Signatures d'en-tête valides : TTF (0x00010000), OTTO, 'true', 'ttcf'
const VALID_HEADERS = [
  [0x00, 0x01, 0x00, 0x00],
  [0x4f, 0x54, 0x54, 0x4f], // OTTO
  [0x74, 0x72, 0x75, 0x65], // true
  [0x74, 0x74, 0x63, 0x66], // ttcf
]

const re = /(\w+)\s*:\s*['"]([A-Za-z0-9+/=]{100,})['"]/g
let total = 0
let bad = 0
let m
while ((m = re.exec(src)) !== null) {
  const [, name, b64] = m
  total++
  const head = Buffer.from(b64.slice(0, 12), 'base64')
  const ok = VALID_HEADERS.some((sig) => sig.every((b, i) => head[i] === b))
  const hex = [...head.slice(0, 4)].map((x) => x.toString(16).padStart(2, '0')).join(' ')
  if (ok) {
    console.log(`✓ ${name} : TTF/OTF valide (${hex})`)
  } else {
    bad++
    console.error(`✗ ${name} : EN-TÊTE INVALIDE — ce n'est pas un TTF/OTF (octets : ${hex})`)
  }
}

if (total === 0) {
  console.error('Aucune police trouvée dans pdf-fonts.ts.')
  process.exit(2)
}
if (bad > 0) {
  console.error(`\n${bad}/${total} police(s) corrompue(s). Remplacez-les par de vrais fichiers TTF avant de diffuser un devis.`)
  process.exit(1)
}
console.log(`\n${total} police(s) valides.`)
