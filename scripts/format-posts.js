import fs from 'fs'
import path from 'path'
import { JSDOM } from 'jsdom'
import pg from 'pg'

const argv = process.argv.slice(2)
function argVal(name) {
  const i = argv.indexOf(name)
  return i === -1 ? null : argv[i+1]
}

const id = argVal('--id')
if (!id) {
  console.error('Usage: node scripts/format-posts.js --id <postId>')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

function cleanHtml(html) {
  const frag = JSDOM.fragment(html)

  // Remove leading H2 elements (commonly auto-injected titles)
  const firstEl = frag.firstElementChild
  if (firstEl && firstEl.tagName === 'H2') {
    firstEl.remove()
  }

  // Remove empty paragraphs and normalize whitespace
  const ps = frag.querySelectorAll('p')
  ps.forEach(p => {
    const txt = (p.textContent || '').replace(/\u00A0/g, '').trim()
    if (!txt) p.remove()
  })

  // Collapse multiple consecutive <br> into single
  frag.querySelectorAll('br').forEach((br) => {
    let next = br.nextSibling
    while (next && next.nodeType === 1 && next.tagName === 'BR') {
      const toRemove = next
      next = next.nextSibling
      toRemove.remove()
    }
  })

  // Trim text nodes
  const elements = frag.querySelectorAll('*')
  elements.forEach(el => {
    el.childNodes.forEach(n => {
      if (n.nodeType === 3 && n.nodeValue) {
        n.nodeValue = n.nodeValue.replace(/\s+/g, ' ')
      }
    })
  })

  const container = frag.ownerDocument.createElement('div')
  container.appendChild(frag.cloneNode(true))
  return container.innerHTML || ''
}

async function run() {
  const client = await pool.connect()
  try {
    const res = await client.query('SELECT id, title, content, image, source_name, source_url, tags, category FROM blog_posts WHERE id = $1', [id])
    if (res.rowCount === 0) {
      console.error('post not found:', id)
      return
    }
    const row = res.rows[0]
    const before = row.content || ''
    const after = cleanHtml(before)

    if (after === before) {
      console.log('No formatting changes for', id)
      return
    }

    const backupName = `.tmp-format-backup-${id}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`
    const backup = { id, before, after }
    fs.writeFileSync(backupName, JSON.stringify(backup, null, 2))
    console.log('Wrote backup', backupName)

    await client.query('BEGIN')
    await client.query('UPDATE blog_posts SET content = $1 WHERE id = $2', [after, id])
    await client.query('COMMIT')
    console.log('Updated post', id)
  } catch (err) {
    console.error('error', err)
    try { await client.query('ROLLBACK') } catch(e) {}
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(e => { console.error(e); process.exit(1) })
