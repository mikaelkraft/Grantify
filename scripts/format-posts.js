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
const doAll = argv.includes('--all')
if (!id && !doAll) {
  console.error('Usage: node scripts/format-posts.js --id <postId> | --all')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

function cleanHtml(html) {
  const frag = JSDOM.fragment(html)

  // Preserve headings; do not remove H2/H3 — keep author formatting.

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

  // Normalize "Also read:" occurrences.
  // Move any "Also read:" + anchor(s) into their own paragraph after the source element.
  const alsoPattern = /^\s*Also\s+read:?\s*$/i
  const candidates = Array.from(frag.querySelectorAll('p, div'))
  candidates.forEach(el => {
    // find a strong or text node that contains "Also read:"
    const strong = el.querySelector('strong')
    let hasAlso = false
    if (strong && alsoPattern.test(strong.textContent || '')) hasAlso = true
    if (!hasAlso) {
      // check text nodes
      for (const node of Array.from(el.childNodes)) {
        if (node.nodeType === 3 && alsoPattern.test(node.nodeValue || '')) { hasAlso = true; break }
      }
    }
    if (!hasAlso) return

    // collect anchor elements that follow or are inside this element
    const anchors = Array.from(el.querySelectorAll('a'))
    if (anchors.length === 0) return

    // remove anchors and any preceding "Also read" text from original element
    anchors.forEach(a => a.remove())
    if (strong) strong.remove()
    // also remove raw text "Also read:" occurrences
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3 && alsoPattern.test(node.nodeValue || '')) node.remove()
    }

    // build new paragraph
    const doc = frag.ownerDocument
    const p = doc.createElement('p')
    const s = doc.createElement('strong')
    s.textContent = 'Also read: '
    p.appendChild(s)
    anchors.forEach((a, i) => {
      p.appendChild(a)
      if (i !== anchors.length - 1) p.appendChild(doc.createTextNode(' '))
    })

    // insert after el
    if (el.parentNode) {
      el.parentNode.insertBefore(p, el.nextSibling)
    }
  })

  const container = frag.ownerDocument.createElement('div')
  container.appendChild(frag.cloneNode(true))
  return container.innerHTML || ''
}

async function processSingle(client, postId) {
  try {
    const res = await client.query('SELECT id, title, content, image, source_name, source_url, tags, category FROM blog_posts WHERE id = $1', [postId])
    if (res.rowCount === 0) {
      console.error('post not found:', postId)
      return
    }
    const row = res.rows[0]
    const before = row.content || ''
    const after = cleanHtml(before)

    if (after === before) {
      console.log('No formatting changes for', postId)
      return
    }

    const backupName = `.tmp-format-backup-${postId}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`
    const backup = { id: postId, before, after }
    fs.writeFileSync(backupName, JSON.stringify(backup, null, 2))
    console.log('Wrote backup', backupName)

    await client.query('BEGIN')
    await client.query('UPDATE blog_posts SET content = $1 WHERE id = $2', [after, postId])
    await client.query('COMMIT')
    console.log('Updated post', postId)
  } catch (err) {
    console.error('error processing', postId, err)
    try { await client.query('ROLLBACK') } catch(e) {}
  }
}

async function run() {
  const client = await pool.connect()
  try {
    if (doAll) {
      const list = await client.query('SELECT id FROM blog_posts')
      for (const r of list.rows) {
        const postId = String(r.id)
        await processSingle(client, postId)
      }
    } else {
      await processSingle(client, id)
    }
  } catch (err) {
    console.error('error', err)
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(e => { console.error(e); process.exit(1) })
