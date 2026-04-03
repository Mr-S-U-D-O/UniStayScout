import cors from 'cors';
import express from 'express';

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() });
});

app.get('/api/listings', (_req, res) => {
  // Placeholder response until database integration is complete.
  res.json({ data: [], total: 0 });
});

app.post('/api/ai/recommendations', (req, res) => {
  const { profile, mapContext } = req.body ?? {};
  res.json({
    questions: [
      'What is your ideal monthly budget?',
      'Do you prefer private or shared accommodation?'
    ],
    recommendedListingIds: [],
    rationale: 'This is a placeholder until AI orchestration and data layers are connected.',
    contextEcho: { profile, mapContext }
  });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
