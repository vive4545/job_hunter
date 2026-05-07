import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractResumeText({ buffer, mimetype, filename }) {
  const name = (filename || '').toLowerCase();
  const type = (mimetype || '').toLowerCase();

  if (type === 'text/plain' || name.endsWith('.txt')) {
    return buffer.toString('utf8');
  }

  if (
    type === 'application/pdf' ||
    name.endsWith('.pdf') ||
    type === 'application/x-pdf'
  ) {
    const data = await pdf(buffer);
    return data.text || '';
  }

  if (
    type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value || '';
  }

  throw new Error(`unsupported_file_type:${mimetype || filename || 'unknown'}`);
}

