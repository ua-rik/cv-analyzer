import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll('files').filter((value): value is File => value instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
  }

  const sessionId = randomUUID();
  const dir = path.join('/tmp', sessionId);
  await fs.mkdir(dir, { recursive: true });

  const storedFiles = [] as { id: string; filename: string; path: string }[];

  for (const file of files) {
    const id = randomUUID();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(dir, `${id}-${file.name}`);
    await fs.writeFile(filePath, buffer);
    storedFiles.push({ id, filename: file.name, path: filePath });
  }

  return NextResponse.json({ sessionId, files: storedFiles });
}
