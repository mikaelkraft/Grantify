// Server-side PNG generation for the daily funding alert card
// Uses satori (JSX→SVG) + @resvg/resvg-js (SVG→PNG)
// Endpoint: GET /api/funding-alert-image

const GRANTS = [
  { name: 'Bank of Industry (BOI)', desc: 'Long-term loans for manufacturing & industry', amount: '₦500K – ₦50M' },
  { name: 'SMEDAN MSME Support', desc: 'Training, grants & funding for small businesses', amount: '₦200K – ₦5M' },
  { name: 'Tony Elumelu Foundation', desc: 'Seed capital for African entrepreneurs', amount: 'USD $5,000' },
  { name: 'LSETF (Lagos State)', desc: 'Low-interest loans for Lagos residents', amount: '₦100K – ₦2M' },
  { name: 'CBN AGSMEIS', desc: 'Agribusiness & MSME investment scheme', amount: '₦1M – ₦10M' },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Dynamic import to avoid startup cost when not used
    const { default: satori } = await import('satori');
    const { Resvg } = await import('@resvg/resvg-js');

    const today = new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const topGrants = GRANTS.slice(0, 3);

    // Build the JSX element tree (satori accepts a plain object, not actual JSX)
    const element = {
      type: 'div',
      props: {
        style: {
          width: '1080px',
          height: '1080px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111827 50%, #0a0a0a 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px',
          fontFamily: 'sans-serif',
          position: 'relative',
        },
        children: [
          // Header
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', marginBottom: '48px' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            background: '#22c55e',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: '900',
                            padding: '6px 16px',
                            borderRadius: '999px',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                          },
                          children: '🔔 Daily Funding Alert',
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { color: '#d4af37', fontSize: '52px', fontWeight: '900', lineHeight: '1.1' },
                    children: 'Today\'s Top Grants',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { color: '#ffffff80', fontSize: '20px', marginTop: '8px' },
                    children: today,
                  },
                },
              ],
            },
          },
          // Grant cards
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', gap: '20px', flex: '1' },
              children: topGrants.map((grant, i) => ({
                type: 'div',
                props: {
                  key: String(i),
                  style: {
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '20px',
                    padding: '28px 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: { color: '#ffffff', fontSize: '24px', fontWeight: '800' },
                              children: grant.name,
                            },
                          },
                          {
                            type: 'div',
                            props: {
                              style: {
                                color: '#22c55e',
                                fontSize: '18px',
                                fontWeight: '900',
                                background: 'rgba(34,197,94,0.1)',
                                padding: '4px 14px',
                                borderRadius: '999px',
                                border: '1px solid rgba(34,197,94,0.3)',
                                whiteSpace: 'nowrap',
                              },
                              children: grant.amount,
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: { color: '#ffffff99', fontSize: '18px', lineHeight: '1.4' },
                        children: grant.desc,
                      },
                    },
                  ],
                },
              })),
            },
          },
          // Footer
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '40px',
                paddingTop: '24px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { color: '#d4af37', fontSize: '28px', fontWeight: '900', letterSpacing: '-0.02em' },
                    children: 'Grantify',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { color: '#ffffff60', fontSize: '16px' },
                    children: 'grantify.help · Nigeria\'s #1 Grant & Loan Matching Platform',
                  },
                },
              ],
            },
          },
        ],
      },
    };

    const svg = await satori(element, {
      width: 1080,
      height: 1080,
      fonts: [], // No custom fonts needed — system sans-serif is fine
    });

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1080 },
    });
    const pngBuffer = resvg.render().asPng();

    const filename = `grantify-daily-grants-${new Date().toISOString().slice(0, 10)}.png`;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600'); // Cache for 1 hour
    return res.send(pngBuffer);
  } catch (err) {
    console.error('Funding alert image error:', err);
    return res.status(500).json({ error: 'Failed to generate image. ' + (err?.message || '') });
  }
}
