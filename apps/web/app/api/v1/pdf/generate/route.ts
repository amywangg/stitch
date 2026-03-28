import { NextRequest, NextResponse } from 'next/server'
import { withAuth, findOwned } from '@/lib/route-helpers'
import { prisma } from '@/lib/prisma'
import { requirePro } from '@/lib/pro-gate'
import { jsPDF } from 'jspdf'


export const dynamic = 'force-dynamic'
export const POST = withAuth(async (req, user) => {
  const proErr = requirePro(user, 'PDF export')
  if (proErr) return proErr

  const body = await req.json()
  const { pattern_id } = body

  if (!pattern_id) {
    return NextResponse.json({ error: 'pattern_id is required' }, { status: 400 })
  }

  const pattern = await prisma.patterns.findFirst({
    where: { id: pattern_id, user_id: user.id, deleted_at: null },
    include: {
      sections: {
        where: { size_id: null },
        orderBy: { sort_order: 'asc' },
        include: { rows: { orderBy: { row_number: 'asc' } } },
      },
      sizes: { orderBy: { sort_order: 'asc' } },
    },
  })

  if (!pattern) {
    return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
  }

  // If a selected_size exists, load size-specific sections instead
  let sections = pattern.sections
  if (pattern.selected_size) {
    const size = pattern.sizes.find((s) => s.name === pattern.selected_size)
    if (size) {
      const sizeSections = await prisma.pattern_sections.findMany({
        where: { pattern_id: pattern.id, size_id: size.id },
        orderBy: { sort_order: 'asc' },
        include: { rows: { orderBy: { row_number: 'asc' } } },
      })
      if (sizeSections.length > 0) sections = sizeSections
    }
  }

  // Generate PDF
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = 210
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const addPage = () => {
    doc.addPage()
    y = margin
  }

  const checkPageBreak = (needed: number) => {
    if (y + needed > 277) addPage()
  }

  // Title page
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(pattern.title, contentWidth)
  doc.text(titleLines, pageWidth / 2, y + 20, { align: 'center' })
  y += 20 + titleLines.length * 10

  if (pattern.designer_name) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text(`by ${pattern.designer_name}`, pageWidth / 2, y + 8, { align: 'center' })
    y += 16
  }

  y += 10
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  // Pattern info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const infoLines: string[] = []

  if (pattern.craft_type) infoLines.push(`Craft: ${pattern.craft_type}`)
  if (pattern.difficulty) infoLines.push(`Difficulty: ${pattern.difficulty}`)
  if (pattern.garment_type) infoLines.push(`Type: ${pattern.garment_type}`)
  if (pattern.yarn_weight) infoLines.push(`Yarn weight: ${pattern.yarn_weight}`)
  if (pattern.needle_size_mm) infoLines.push(`Needle size: ${pattern.needle_size_mm}mm`)
  if (pattern.needle_sizes?.length) infoLines.push(`Needles: ${pattern.needle_sizes.join(', ')}`)
  if (pattern.gauge_stitches_per_10cm || pattern.gauge_rows_per_10cm) {
    const gaugeParts: string[] = []
    if (pattern.gauge_stitches_per_10cm) gaugeParts.push(`${pattern.gauge_stitches_per_10cm} sts`)
    if (pattern.gauge_rows_per_10cm) gaugeParts.push(`${pattern.gauge_rows_per_10cm} rows`)
    infoLines.push(`Gauge: ${gaugeParts.join(' x ')} per 10cm`)
    if (pattern.gauge_stitch_pattern) infoLines.push(`  in ${pattern.gauge_stitch_pattern}`)
  }
  if (pattern.yardage_min) {
    if (pattern.yardage_max && pattern.yardage_max !== pattern.yardage_min) {
      infoLines.push(`Yardage: ${pattern.yardage_min}–${pattern.yardage_max} yards`)
    } else {
      infoLines.push(`Yardage: ${pattern.yardage_min} yards`)
    }
  }

  for (const line of infoLines) {
    checkPageBreak(6)
    doc.text(line, margin, y)
    y += 5
  }

  // Sizes
  if (pattern.sizes.length > 0) {
    y += 6
    checkPageBreak(12)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Sizes', margin, y)
    y += 6
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const sizeNames = pattern.sizes.map((s) => s.name).join(', ')
    doc.text(sizeNames, margin, y)
    y += 5

    if (pattern.selected_size) {
      doc.setFont('helvetica', 'italic')
      doc.text(`Instructions written for size: ${pattern.selected_size}`, margin, y)
      doc.setFont('helvetica', 'normal')
      y += 5
    }
  }

  // Description
  if (pattern.description) {
    y += 6
    checkPageBreak(16)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Description', margin, y)
    y += 6
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const descLines = doc.splitTextToSize(pattern.description, contentWidth)
    for (const line of descLines) {
      checkPageBreak(5)
      doc.text(line, margin, y)
      y += 5
    }
  }

  // Sections with instructions
  for (const section of sections) {
    y += 10
    checkPageBreak(20)

    // Section heading
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(section.name, margin, y)
    y += 2
    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6

    if (section.rows && section.rows.length > 0) {
      doc.setFontSize(10)

      for (const row of section.rows) {
        // Estimate height needed
        const instrLines = doc.splitTextToSize(row.instruction, contentWidth - 12)
        const rowHeight = instrLines.length * 5 + 4
        checkPageBreak(rowHeight)

        // Step number
        doc.setFont('helvetica', 'bold')
        doc.text(`${row.row_number}.`, margin, y)

        // Row type tag
        if (row.row_type) {
          const tagX = margin + 8
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(120)
          let typeLabel = row.row_type.replace(/_/g, ' ')
          if (row.is_repeat && row.repeat_count && row.rows_per_repeat) {
            typeLabel += ` (${row.repeat_count}×${row.rows_per_repeat})`
          } else if (row.rows_in_step && row.rows_in_step > 1) {
            typeLabel += ` (${row.rows_in_step} rows)`
          }
          doc.text(typeLabel.toUpperCase(), tagX, y)
          doc.setTextColor(0)
          y += 4
          doc.setFontSize(10)
        }

        // Instruction text
        doc.setFont('helvetica', 'normal')
        for (const line of instrLines) {
          doc.text(line, margin + 8, y)
          y += 5
        }

        // Stitch count
        if (row.stitch_count) {
          doc.setFontSize(8)
          doc.setTextColor(100)
          doc.text(`[${row.stitch_count} sts]`, margin + 8, y)
          doc.setTextColor(0)
          doc.setFontSize(10)
          y += 4
        }

        // Notes
        if (row.notes) {
          doc.setFontSize(8)
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(80)
          const noteLines = doc.splitTextToSize(row.notes, contentWidth - 14)
          for (const nl of noteLines) {
            checkPageBreak(4)
            doc.text(nl, margin + 10, y)
            y += 4
          }
          doc.setTextColor(0)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
        }

        y += 2 // spacing between steps
      }
    } else if (section.content) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const contentLines = doc.splitTextToSize(section.content, contentWidth)
      for (const line of contentLines) {
        checkPageBreak(5)
        doc.text(line, margin, y)
        y += 5
      }
    }
  }

  // Footer
  y += 10
  checkPageBreak(10)
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(140)
  doc.text('Created with Stitch', pageWidth / 2, y, { align: 'center' })

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pattern.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.pdf"`,
    },
  })
})
