import * as pdfjsLib from 'pdfjs-dist';

export async function parsePdf(pdfPath) {
  const pdf = await pdfjsLib.getDocument(pdfPath).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n\n'; // Add some spacing between pages
  }

  return fullText;
}