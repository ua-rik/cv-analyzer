'use client';

import { useMemo, useState } from 'react';

type CriterionInput = {
  id: string;
  name: string;
  description: string;
  weight: number;
};

type EvaluationResult = {
  file: string;
  scores: { id: string; score: number; evidence: string[] }[];
  total: number;
  notes: string[];
};

const emptyCriterion = (): CriterionInput => ({
  id: crypto.randomUUID(),
  name: '',
  description: '',
  weight: 0.5
});

export default function HomePage() {
  const [criteria, setCriteria] = useState<CriterionInput[]>([emptyCriterion()]);
  const [files, setFiles] = useState<File[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<EvaluationResult[]>([]);

  const canAddMoreCriteria = criteria.length < 10;
  const filledCriteria = useMemo(
    () => criteria.filter((criterion) => criterion.name.trim() && criterion.description.trim()),
    [criteria]
  );

  const handleCriteriaChange = (id: string, key: keyof CriterionInput, value: string) => {
    setCriteria((prev) =>
      prev.map((criterion) =>
        criterion.id === id
          ? {
              ...criterion,
              [key]: key === 'weight' ? clampWeight(Number(value)) : value
            }
          : criterion
      )
    );
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setFiles(Array.from(selectedFiles));
    }
  };

  const handleAddCriterion = () => {
    if (canAddMoreCriteria) {
      setCriteria((prev) => [...prev, emptyCriterion()]);
    }
  };

  const handleRemoveCriterion = (id: string) => {
    setCriteria((prev) => prev.filter((criterion) => criterion.id !== id));
  };

  const handleStartEvaluation = async () => {
    try {
      setLoading(true);
      setError(null);
      setResults([]);

      if (!files.length) {
        setError('Завантаж файли резюме.');
        return;
      }

      if (!filledCriteria.length) {
        setError('Додай хоча б один критерій з описом.');
        return;
      }

      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Не вдалося завантажити файли');
      }

      const uploadData = await uploadResponse.json();

      const evaluateResponse = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: uploadData.sessionId,
          criteria: filledCriteria,
          files: uploadData.files,
          apiKey: apiKey.trim() || undefined
        })
      });

      if (!evaluateResponse.ok) {
        const message = await evaluateResponse.json();
        throw new Error(message.error || 'Не вдалося оцінити резюме');
      }

      const evaluation = await evaluateResponse.json();
      setResults(evaluation.results);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem' }}>
      <h1>CV Analyzer</h1>
      <section style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2>Критерії оцінки</h2>
        {criteria.map((criterion, index) => (
          <div
            key={criterion.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 120px auto',
              gap: '0.75rem',
              marginBottom: '0.75rem'
            }}
          >
            <input
              type="text"
              placeholder={`Назва #${index + 1}`}
              value={criterion.name}
              onChange={(event) => handleCriteriaChange(criterion.id, 'name', event.target.value)}
            />
            <input
              type="text"
              placeholder="Опис"
              value={criterion.description}
              onChange={(event) => handleCriteriaChange(criterion.id, 'description', event.target.value)}
            />
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              placeholder="Вага"
              value={criterion.weight}
              onChange={(event) => handleCriteriaChange(criterion.id, 'weight', event.target.value)}
            />
            {criteria.length > 1 && (
              <button type="button" onClick={() => handleRemoveCriterion(criterion.id)}>
                Видалити
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={handleAddCriterion} disabled={!canAddMoreCriteria}>
          Додати критерій
        </button>
      </section>

      <section style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2>API ключ та файли</h2>
        <input
          type="password"
          placeholder="API ключ (наприклад, OpenAI)"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          style={{ width: '100%', marginBottom: '1rem' }}
        />
        <input type="file" multiple accept=".pdf,.docx,.txt,.md" onChange={handleFileChange} />
      </section>

      <button type="button" onClick={handleStartEvaluation} disabled={loading}>
        {loading ? 'Опрацювання...' : 'Start Evaluation'}
      </button>

      {error && (
        <p style={{ color: 'crimson', marginTop: '1rem' }}>
          {error}
        </p>
      )}

      {results.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <h2>Результати</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={cellStyle}>Файл</th>
                <th style={cellStyle}>Бали по критеріях</th>
                <th style={cellStyle}>Підсумковий бал</th>
                <th style={cellStyle}>Evidence / Notes</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.file}>
                  <td style={cellStyle}>{result.file}</td>
                  <td style={cellStyle}>
                    <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                      {result.scores.map((score) => (
                        <li key={score.id}>
                          <strong>{score.id}</strong>: {score.score}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td style={cellStyle}>{result.total.toFixed(2)}</td>
                  <td style={cellStyle}>
                    <div>
                      {result.scores.map((score) => (
                        <div key={`${score.id}-evidence`}>
                          <strong>{score.id}</strong> — {score.evidence.join('; ')}
                        </div>
                      ))}
                      {result.notes.length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <strong>Notes:</strong> {result.notes.join('; ')}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}

const cellStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  padding: '0.5rem',
  verticalAlign: 'top'
};

function clampWeight(value: number) {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(2));
}
