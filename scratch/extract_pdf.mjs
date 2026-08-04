import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);
const { PDFParse, VerbosityLevel } = req('pdf-parse');

const buf = readFileSync('data/MGM F JUNE 2026.pdf');

try {
  const parser = new PDFParse({ verbosity: VerbosityLevel.ERRORS });
  
  // load needs a URL or data object - try passing as typed array
  const uint8arr = new Uint8Array(buf);
  await parser.load({ data: uint8arr });
  
  const info = parser.getInfo();
  console.log('Info:', JSON.stringify(info));
  
  let fullText = '';
  const numPages = info?.numPages || 0;
  console.log('Number of pages:', numPages);
  
  for (let i = 1; i <= numPages; i++) {
    const pageText = await parser.getText(i);
    fullText += pageText + '\n';
  }
  
  writeFileSync('scratch/pdf_text.txt', fullText, 'utf8');
  console.log('Saved! Preview:');
  console.log(fullText.substring(0, 3000));
} catch(e) {
  console.error('Error:', e.message);
}
