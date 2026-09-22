const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

function checkAuth(req, res) {
  const pass = req.headers['x-app-pass'];
  if (!pass || pass !== process.env.APP_PASSWORD) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

function isValidPayload(body) {
  if (!body || typeof body !== 'object') return false;
  const keys = ['products', 'shipments', 'salesLog', 'defectLog', 'fixedCosts'];
  return keys.every(k => Array.isArray(body[k]));
}

module.exports = async (req, res) => {
  if (!checkAuth(req, res)) return;

  if (req.method === 'GET') {
    const rows = await sql`select data from app_state where id = 1`;
    res.status(200).json(rows[0]?.data || { products: [], shipments: [], salesLog: [], defectLog: [], fixedCosts: [] });
    return;
  }

  if (req.method === 'POST') {
    const body = req.body;
    if (!isValidPayload(body)) {
      res.status(400).json({ error: 'invalid payload' });
      return;
    }
    await sql`
      insert into app_state (id, data, updated_at)
      values (1, ${JSON.stringify(body)}::jsonb, now())
      on conflict (id) do update set data = excluded.data, updated_at = now()
    `;
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
};
