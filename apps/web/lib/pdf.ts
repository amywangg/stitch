import pdfParse from 'pdf-parse'

/**
 * Extracts plain text from a PDF buffer.
 * Returns the text and page count.
 */
export async function extractPdfText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const data = await pdfParse(buffer)
  return { text: data.text, pageCount: data.numpages }
}
