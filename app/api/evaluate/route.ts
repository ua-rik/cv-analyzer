import { NextResponse } from 'next/server';
import pLimit from 'p-limit';
import { parseResume } from '@/lib/parse';
import { calculateWeightedScore } from '@/lib/scoring';
import { evaluateWithLLM, type Criterion } from '@/lib/llm';

export const runtime = 'nodejs';

interface UploadedFileInfo {
  id: string;
  filename: string;
  path: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { criteria, files, apiKey } = body as {
      sessionId: string;
      criteria: Criterion[];
      files: UploadedFileInfo[];
      apiKey?: string;
    };

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'No files to evaluate' }, { status: 400 });
    }

    if (!Array.isArray(criteria) || criteria.length === 0) {
      return NextResponse.json({ error: 'No criteria provided' }, { status: 400 });
    }

    const concurrency = Number(process.env.LLM_MAX_CONCURRENCY ?? '3');
    const limit = pLimit(Number.isFinite(concurrency) ? concurrency : 3);

    const results = await Promise.all(
      files.map((file) =>
        limit(async () => {
          const resumeText = await parseResume(file.path);
          const evaluation = await evaluateWithLLM({
            resumeText,
            criteria,
            apiKey
          });
          const total = calculateWeightedScore(criteria, evaluation.scores);
          return {
            file: file.filename,
            scores: evaluation.scores,
            total,
            notes: evaluation.notes
          };
        })
      )
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
