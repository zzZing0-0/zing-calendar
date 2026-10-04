// Retired legacy endpoint. B2 signing is served only by /api/b2-sign.
export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Deprecation', 'true')
  return res.status(410).json({ error: 'Legacy attachment signing endpoint retired' })
}
