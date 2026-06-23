/**
 * HTML to Portable Text Converter
 *
 * Converts Webflow-extracted HTML to Sanity Portable Text format.
 * Strips Webflow-specific classes and artifacts.
 */

import { randomUUID } from 'crypto'

// Generate unique keys for Portable Text blocks
function generateKey() {
  return randomUUID().slice(0, 12)
}

// HTML entity decoder
function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

// Clean text: remove zero-width joiners and normalize whitespace
function cleanText(text) {
  return text
    .replace(/\u200D/g, '') // zero-width joiner
    .replace(/\u200B/g, '') // zero-width space
    .replace(/\u00A0/g, ' ') // non-breaking space
    .replace(/[\r\n]+/g, ' ') // newlines to spaces
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()
}

// Check if text is essentially empty (just whitespace or Unicode artifacts)
function isEmptyText(text) {
  const cleaned = cleanText(text)
  return cleaned === '' || cleaned === '‍' // zero-width joiner visual
}

// Parse inline content (spans, em, strong, a, br)
function parseInlineContent(html) {
  const children = []
  let currentMarks = []

  // Simple regex-based parser for inline elements
  // This handles: <strong>, <em>, <a>, <br>, plain text
  const parts = html.split(/(<\/?(?:strong|em|b|i|a|br|span)[^>]*>)/gi)

  for (const part of parts) {
    if (!part) continue

    // Opening tags
    if (/^<strong|^<b/i.test(part)) {
      currentMarks.push('strong')
    } else if (/^<em|^<i/i.test(part)) {
      currentMarks.push('em')
    } else if (/^<a\s/i.test(part)) {
      // Extract href
      const hrefMatch = part.match(/href="([^"]*)"/i)
      if (hrefMatch) {
        currentMarks.push({ type: 'link', href: hrefMatch[1] })
      }
    } else if (/^<br/i.test(part)) {
      // Line break - add newline text
      children.push({
        _type: 'span',
        _key: generateKey(),
        text: '\n',
        marks: []
      })
    } else if (/^<span/i.test(part)) {
      // Ignore span opening, just pass through
    }
    // Closing tags
    else if (/^<\/strong|^<\/b/i.test(part)) {
      currentMarks = currentMarks.filter(m => m !== 'strong')
    } else if (/^<\/em|^<\/i/i.test(part)) {
      currentMarks = currentMarks.filter(m => m !== 'em')
    } else if (/^<\/a/i.test(part)) {
      currentMarks = currentMarks.filter(m => typeof m !== 'object' || m.type !== 'link')
    } else if (/^<\/span/i.test(part)) {
      // Ignore span closing
    }
    // Text content
    else if (!/^</.test(part)) {
      const text = decodeEntities(part)
      if (text.trim()) {
        // Build marks array
        const marks = []
        const markDefs = []
        for (const mark of currentMarks) {
          if (typeof mark === 'string') {
            marks.push(mark)
          } else if (mark.type === 'link') {
            const linkKey = generateKey()
            marks.push(linkKey)
            markDefs.push({
              _type: 'link',
              _key: linkKey,
              href: mark.href
            })
          }
        }

        children.push({
          _type: 'span',
          _key: generateKey(),
          text,
          marks,
          _markDefs: markDefs.length > 0 ? markDefs : undefined
        })
      }
    }
  }

  // If no children, add empty span (required for valid block)
  if (children.length === 0) {
    return {
      children: [{
        _type: 'span',
        _key: generateKey(),
        text: '',
        marks: []
      }],
      markDefs: []
    }
  }

  // Collect all markDefs
  const allMarkDefs = []
  for (const child of children) {
    if (child._markDefs) {
      allMarkDefs.push(...child._markDefs)
      delete child._markDefs
    }
  }

  return { children, markDefs: allMarkDefs }
}

// Parse list items from HTML
function parseListItems(html, listType) {
  const items = []
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi
  let match

  while ((match = liRegex.exec(html)) !== null) {
    const content = match[1]
    const { children, markDefs } = parseInlineContent(content)

    const text = children.map(c => c.text).join('')
    if (!isEmptyText(text)) {
      items.push({
        _type: 'block',
        _key: generateKey(),
        style: 'normal',
        listItem: listType,
        level: 1,
        children,
        markDefs
      })
    }
  }

  return items
}

// Main converter
export function htmlToPortableText(html) {
  if (!html || typeof html !== 'string') {
    return { error: 'Invalid HTML input', blocks: [] }
  }

  const blocks = []
  const errors = []

  // Remove Webflow-specific classes from the HTML
  let cleanHtml = html
    .replace(/\sclass="[^"]*"/gi, '') // Remove all class attributes
    .replace(/\srole="[^"]*"/gi, '') // Remove role attributes

  // Split into block-level elements
  // Match: p, h1-h6, ul, ol, blockquote, div
  const blockRegex = /<(p|h[1-6]|ul|ol|blockquote|div)(\s[^>]*)?>[\s\S]*?<\/\1>/gi
  let lastIndex = 0
  let blockMatch

  while ((blockMatch = blockRegex.exec(cleanHtml)) !== null) {
    const fullMatch = blockMatch[0]
    const tagName = blockMatch[1].toLowerCase()
    const innerHtml = fullMatch.replace(new RegExp(`^<${tagName}[^>]*>`, 'i'), '')
                               .replace(new RegExp(`</${tagName}>$`, 'i'), '')

    // Handle lists
    if (tagName === 'ul' || tagName === 'ol') {
      const listType = tagName === 'ul' ? 'bullet' : 'number'
      const listBlocks = parseListItems(fullMatch, listType)
      blocks.push(...listBlocks)
      continue
    }

    // Parse inline content
    const { children, markDefs } = parseInlineContent(innerHtml)

    // Check if block has meaningful content
    const textContent = children.map(c => c.text).join('')
    if (isEmptyText(textContent)) {
      continue // Skip empty paragraphs (Webflow artifacts)
    }

    // Determine style
    let style = 'normal'
    if (/^h([1-6])$/i.test(tagName)) {
      const level = parseInt(tagName[1])
      style = `h${level}`
    } else if (tagName === 'blockquote') {
      style = 'blockquote'
    }

    blocks.push({
      _type: 'block',
      _key: generateKey(),
      style,
      children,
      markDefs
    })
  }

  // Validation
  if (blocks.length === 0) {
    return { error: 'No valid blocks extracted', blocks: [] }
  }

  // Validate each block
  for (const block of blocks) {
    if (!block._key) {
      errors.push('Block missing _key')
    }
    if (!block.children || block.children.length === 0) {
      errors.push('Block has no children')
    }
    if (!block.style) {
      errors.push('Block missing style')
    }
    // Check for invalid styles
    const validStyles = ['normal', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote']
    if (!validStyles.includes(block.style)) {
      errors.push(`Invalid style: ${block.style}`)
    }
    // Check children have _key
    for (const child of (block.children || [])) {
      if (!child._key) {
        errors.push('Child span missing _key')
      }
    }
  }

  if (errors.length > 0) {
    return { error: errors.join('; '), blocks: [] }
  }

  return { blocks, error: null }
}

export default { htmlToPortableText }
