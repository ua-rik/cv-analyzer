import fs from 'node:fs/promises';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const SUPPORTED_TEXT_EXTENSIONS = new Set(['.txt', '.md']);

export async function parseResume(filePath: string): Promise<string> {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.pdf') {
    const data = await fs.readFile(filePath);
    const pdf = await pdfParse(data);
    return pdf.text;
  }

  if (extension === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  if (SUPPORTED_TEXT_EXTENSIONS.has(extension) || extension === '') {
    return fs.readFile(filePath, 'utf8');
  }

  throw new Error(`Unsupported file type: ${extension}`);
}
