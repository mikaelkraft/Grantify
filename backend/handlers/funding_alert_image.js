// Server-side image generation for the daily funding alert card
// Provides pure standalone vector SVG response and optional PNG
// Endpoint: GET /api/funding-alert-image

const GRANTS = [
  { name: 'Bank of Industry (BOI) SME Facility', tag: 'MANUFACTURING & AGRO', amount: '₦500K – ₦50M', sub: 'Single-digit interest capital for production & equipment' },
  { name: 'SMEDAN National Enterprise Support', tag: 'SMALL BUSINESS & TRADERS', amount: '₦200K – ₦5M', sub: 'Non-collateral operational grants & working capital' },
  { name: 'Tony Elumelu Foundation Entrepreneurship', tag: 'PAN-AFRICAN SEED GRANT', amount: '$5,000 USD', sub: '100% non-dilutive grant capital for early-stage founders' },
];

function buildFundingAlertSvg(today) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="mainBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#052e16" />
      <stop offset="45%" stop-color="#064e3b" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="30" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1080" fill="url(#mainBg)" />

  <!-- Ambient Glow Circles -->
  <circle cx="950" cy="120" r="320" fill="#F59E0B" opacity="0.15" filter="url(#glow)" />
  <circle cx="100" cy="980" r="360" fill="#10B981" opacity="0.15" filter="url(#glow)" />

  <!-- Outer Frame -->
  <rect x="40" y="40" width="1000" height="1000" rx="36" fill="none" stroke="#F59E0B" stroke-opacity="0.3" stroke-width="2" />

  <!-- Header Badge -->
  <g transform="translate(80, 80)">
    <rect width="260" height="44" rx="22" fill="#10B981" fill-opacity="0.2" stroke="#10B981" stroke-width="1.5" />
    <circle cx="28" cy="22" r="6" fill="#34D399" />
    <text x="46" y="28" fill="#A7F3D0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" letter-spacing="1.5">DAILY FUNDING ALERT</text>
  </g>

  <!-- Main Headline -->
  <text x="80" y="195" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="56" font-weight="900" letter-spacing="-1">Today's Verified Capital</text>
  <text x="80" y="240" fill="#FBBF24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700">${today}</text>

  <!-- Grants List Container -->
  <!-- Item 1 -->
  <g transform="translate(80, 280)">
    <rect width="920" height="180" rx="24" fill="#022c22" fill-opacity="0.85" stroke="#059669" stroke-width="2" />
    <rect x="36" y="28" width="220" height="28" rx="14" fill="#10B981" fill-opacity="0.15" />
    <text x="50" y="47" fill="#6EE7B7" font-family="sans-serif" font-size="12" font-weight="800" letter-spacing="1">MANUFACTURING &amp; AGRO</text>
    <text x="36" y="95" fill="#FFFFFF" font-family="sans-serif" font-size="28" font-weight="900">Bank of Industry (BOI) SME Facility</text>
    <text x="36" y="132" fill="#9CA3AF" font-family="sans-serif" font-size="16">Single-digit interest capital for equipment &amp; industrial scale-up</text>
    <rect x="680" y="44" width="200" height="92" rx="18" fill="#F59E0B" fill-opacity="0.12" stroke="#F59E0B" stroke-opacity="0.3" stroke-width="1.5" />
    <text x="780" y="80" text-anchor="middle" fill="#9CA3AF" font-family="sans-serif" font-size="12" font-weight="700">MAX ALLOCATION</text>
    <text x="780" y="115" text-anchor="middle" fill="#FCD34D" font-family="sans-serif" font-size="26" font-weight="900">₦50,000,000</text>
  </g>

  <!-- Item 2 -->
  <g transform="translate(80, 485)">
    <rect width="920" height="180" rx="24" fill="#022c22" fill-opacity="0.85" stroke="#059669" stroke-width="2" />
    <rect x="36" y="28" width="230" height="28" rx="14" fill="#10B981" fill-opacity="0.15" />
    <text x="50" y="47" fill="#6EE7B7" font-family="sans-serif" font-size="12" font-weight="800" letter-spacing="1">SMALL BUSINESS &amp; TRADERS</text>
    <text x="36" y="95" fill="#FFFFFF" font-family="sans-serif" font-size="28" font-weight="900">SMEDAN National Enterprise Support</text>
    <text x="36" y="132" fill="#9CA3AF" font-family="sans-serif" font-size="16">Collateral-free grants &amp; operational credit lines for artisans &amp; retailers</text>
    <rect x="680" y="44" width="200" height="92" rx="18" fill="#F59E0B" fill-opacity="0.12" stroke="#F59E0B" stroke-opacity="0.3" stroke-width="1.5" />
    <text x="780" y="80" text-anchor="middle" fill="#9CA3AF" font-family="sans-serif" font-size="12" font-weight="700">MAX ALLOCATION</text>
    <text x="780" y="115" text-anchor="middle" fill="#FCD34D" font-family="sans-serif" font-size="26" font-weight="900">₦5,000,000</text>
  </g>

  <!-- Item 3 -->
  <g transform="translate(80, 690)">
    <rect width="920" height="180" rx="24" fill="#022c22" fill-opacity="0.85" stroke="#059669" stroke-width="2" />
    <rect x="36" y="28" width="220" height="28" rx="14" fill="#10B981" fill-opacity="0.15" />
    <text x="50" y="47" fill="#6EE7B7" font-family="sans-serif" font-size="12" font-weight="800" letter-spacing="1">PAN-AFRICAN SEED GRANT</text>
    <text x="36" y="95" fill="#FFFFFF" font-family="sans-serif" font-size="28" font-weight="900">Tony Elumelu Foundation (TEF)</text>
    <text x="36" y="132" fill="#9CA3AF" font-family="sans-serif" font-size="16">100% non-refundable seed capital for early-stage African entrepreneurs</text>
    <rect x="680" y="44" width="200" height="92" rx="18" fill="#F59E0B" fill-opacity="0.12" stroke="#F59E0B" stroke-opacity="0.3" stroke-width="1.5" />
    <text x="780" y="80" text-anchor="middle" fill="#9CA3AF" font-family="sans-serif" font-size="12" font-weight="700">MAX ALLOCATION</text>
    <text x="780" y="115" text-anchor="middle" fill="#FCD34D" font-family="sans-serif" font-size="26" font-weight="900">$5,000 USD</text>
  </g>

  <!-- Footer Banner -->
  <g transform="translate(80, 915)">
    <line x1="0" y1="0" x2="920" y2="0" stroke="#F59E0B" stroke-opacity="0.2" stroke-width="1.5" />
    <text x="0" y="48" fill="#FCD34D" font-family="sans-serif" font-size="32" font-weight="900" letter-spacing="-0.5">Grantify.help</text>
    <text x="0" y="78" fill="#9CA3AF" font-family="sans-serif" font-size="15">Nigeria's Leading Grant &amp; MSME Capital Discovery Platform</text>

    <!-- Right Call to Action -->
    <rect x="650" y="20" width="270" height="60" rx="30" fill="#F59E0B" />
    <text x="785" y="58" text-anchor="middle" fill="#052e16" font-family="sans-serif" font-size="17" font-weight="900">CHECK ELIGIBILITY →</text>
  </g>
</svg>`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const today = new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const svg = buildFundingAlertSvg(today);

  // If client specifically requests PNG or if resvg is available:
  const wantsPng = String(req.headers.accept || '').includes('image/png') || req.query.format === 'png';

  if (wantsPng) {
    try {
      const { Resvg } = await import('@resvg/resvg-js');
      const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1080 } });
      const pngBuffer = resvg.render().asPng();

      const filename = `grantify-funding-alert-${new Date().toISOString().slice(0, 10)}.png`;
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      return res.send(pngBuffer);
    } catch (e) {
      // Fallback cleanly to SVG if resvg fails
    }
  }

  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  return res.send(svg);
}
