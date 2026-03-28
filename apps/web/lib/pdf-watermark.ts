import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'

interface WatermarkOptions {
  buyerUsername: string
  transactionId: string
  purchaseDate: Date
}

/**
 * Stamps every page of a PDF with a subtle diagonal watermark
 * containing the buyer's username and transaction ID.
 * This makes any leaked PDF forensically traceable.
 */
export async function watermarkPdf(
  pdfBytes: Buffer | Uint8Array,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  const dateStr = options.purchaseDate.toISOString().split('T')[0]
  const watermarkText = `Licensed to ${options.buyerUsername} · ${options.transactionId} · ${dateStr}`

  for (const page of pages) {
    const { width, height } = page.getSize()
    const fontSize = 9
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize)

    // Diagonal watermark — subtle gray, repeated across the page
    const angleDeg = Math.atan(height / width) * (180 / Math.PI)
    const angleRad = angleDeg * (Math.PI / 180)

    // Center watermark
    page.drawText(watermarkText, {
      x: width / 2 - textWidth / 2 * Math.cos(angleRad),
      y: height / 2 - textWidth / 2 * Math.sin(angleRad),
      size: fontSize,
      font,
      color: rgb(0.85, 0.85, 0.85),
      rotate: degrees(angleDeg),
      opacity: 0.3,
    })

    // Bottom margin watermark — more visible, single line
    page.drawText(watermarkText, {
      x: 20,
      y: 12,
      size: 6.5,
      font,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.5,
    })
  }

  return pdfDoc.save()
}
