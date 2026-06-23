const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'vimeo.com',
  'www.vimeo.com',
])

export type ParseResult = { src: string } | { error: string }

export function parseVideoEmbed(input: string): ParseResult {
  let u: URL
  try {
    u = new URL(input)
  } catch {
    return { error: 'Not a valid URL' }
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    return { error: 'URL must be http(s)' }
  }
  if (!ALLOWED_HOSTS.has(u.hostname)) {
    return { error: 'Host must be YouTube or Vimeo' }
  }

  if (u.hostname === 'youtu.be') {
    const id = u.pathname.replace(/^\//, '')
    if (!/^[\w-]{11}$/.test(id)) return { error: 'Could not parse YouTube video ID' }
    return { src: `https://www.youtube-nocookie.com/embed/${id}` }
  }
  if (u.hostname.endsWith('youtube.com')) {
    const id = u.searchParams.get('v') || ''
    if (!/^[\w-]{11}$/.test(id)) return { error: 'Could not parse YouTube video ID' }
    return { src: `https://www.youtube-nocookie.com/embed/${id}` }
  }
  if (u.hostname.endsWith('vimeo.com')) {
    const id = u.pathname.split('/').filter(Boolean)[0] || ''
    if (!/^\d+$/.test(id)) return { error: 'Could not parse Vimeo video ID' }
    return { src: `https://player.vimeo.com/video/${id}` }
  }
  return { error: 'Unsupported URL' }
}
