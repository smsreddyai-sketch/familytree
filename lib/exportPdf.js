// Turns the drawn tree into a PDF: page 1 is the whole tree as one big image, then a summary page.

const MAX_CANVAS_SIDE = 12000; // browsers fail on larger canvases
const MAX_PDF_SIDE = 14000; // PDF pages are limited to 14400pt per side

export async function exportTreePdf(treeElement, { width, height, summary }) {
  const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);

  const pixelRatio = Math.max(0.4, Math.min(2, MAX_CANVAS_SIDE / Math.max(width, height)));
  const image = await toPng(treeElement, {
    width,
    height,
    pixelRatio,
    backgroundColor: '#ffffff',
    style: { transform: 'none' },
    filter: node => !node.dataset || !('exportIgnore' in node.dataset), // leave delete buttons out of the PDF
  });

  const margin = 36;
  const header = 70;
  const scale = Math.min(1, (MAX_PDF_SIDE - header - margin) / Math.max(width, height));
  const pageW = width * scale + margin * 2;
  const pageH = height * scale + header + margin;

  const pdf = new jsPDF({ orientation: pageW > pageH ? 'landscape' : 'portrait', unit: 'pt', format: [pageW, pageH] });
  pdf.setFontSize(22);
  pdf.text('Family Tree', margin, 42);
  pdf.setFontSize(10);
  pdf.text(`Downloaded ${new Date().toLocaleDateString()}  ·  ${summary.total} people  ·  ${summary.generations} generations`, margin, 58);
  pdf.addImage(image, 'PNG', margin, header, width * scale, height * scale);

  // Summary page
  pdf.addPage('a4', 'portrait');
  let y = 50;
  const line = (text, size = 11, gap = 16) => {
    if (y > 790) {
      pdf.addPage('a4', 'portrait');
      y = 50;
    }
    pdf.setFontSize(size);
    pdf.text(text, 40, y);
    y += gap;
  };

  line('Family Summary', 18, 28);
  line(`Total people: ${summary.total}   Living: ${summary.living}   Late: ${summary.late}   Generations: ${summary.generations}`, 11, 26);

  line('People per generation', 14, 20);
  for (const g of summary.byGeneration) line(`Generation ${g.generation}: ${g.living} living, ${g.late} late`);
  y += 10;

  if (summary.countries.length) {
    line('Living relatives by country', 14, 20);
    for (const c of summary.countries) line(`${c.label}: ${c.people.length}`);
    y += 10;
  }

  line('Living relatives by place', 14, 20);
  for (const place of summary.places) {
    line(`${place.label} (${place.people.length})`, 11, 14);
    const names = place.people.map(p => p.name).join(', ');
    for (const chunk of pdf.splitTextToSize(names, 500)) line(`    ${chunk}`, 9, 13);
    y += 4;
  }
  if (summary.unknownPlace) line(`Place not entered: ${summary.unknownPlace}`);

  pdf.save('family-tree.pdf');
}
