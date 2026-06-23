#!/usr/bin/env node
/**
 * Sanity Version Audit
 *
 * Checks installed versions of critical Sanity packages and flags
 * known incompatibilities. Run after any `npm install` or upgrade.
 *
 * Usage: node scripts/sanity-version-audit.mjs
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ─── Package resolution ──────────────────────────────────────────────

function findPackageJson(packageName, searchPaths) {
  for (const base of searchPaths) {
    const candidate = join(base, 'node_modules', packageName, 'package.json')
    if (existsSync(candidate)) {
      return JSON.parse(readFileSync(candidate, 'utf-8'))
    }
  }
  return null
}

function getDep(pkg, depName) {
  if (!pkg) return null
  return pkg.dependencies?.[depName]
    || pkg.peerDependencies?.[depName]
    || pkg.devDependencies?.[depName]
    || null
}

function semverMajor(versionRange) {
  if (!versionRange) return null
  const match = versionRange.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

// ─── Main ────────────────────────────────────────────────────────────

const searchPaths = [
  ROOT,
  join(ROOT, 'apps', 'web'),
  join(ROOT, 'apps', 'sca-studio'),
]

const PACKAGES = [
  'sanity',
  '@sanity/astro',
  '@sanity/visual-editing',
  '@sanity/client',
  '@sanity/image-url',
  '@sanity/comlink',
  '@sanity/presentation-comlink',
]

console.log('\n╔══════════════════════════════════════════════════╗')
console.log('║        Sanity Version Audit                      ║')
console.log('╚══════════════════════════════════════════════════╝\n')

// 1. Report installed versions
const installed = {}
for (const name of PACKAGES) {
  const pkg = findPackageJson(name, searchPaths)
  installed[name] = pkg?.version || null
  const status = pkg ? `v${pkg.version}` : '(not installed)'
  console.log(`  ${name.padEnd(35)} ${status}`)
}

console.log('')

// 2. Check comlink compatibility (the specific break we hit)
const studioComlink = getDep(
  findPackageJson('sanity', searchPaths),
  '@sanity/comlink'
)
const veComlink = getDep(
  findPackageJson('@sanity/visual-editing', searchPaths),
  '@sanity/comlink'
)

const studioMajor = semverMajor(studioComlink)
const veMajor = semverMajor(veComlink)

if (studioMajor && veMajor) {
  if (studioMajor !== veMajor) {
    console.log('  ⚠️  COMLINK MISMATCH DETECTED')
    console.log(`     sanity requires @sanity/comlink ${studioComlink}`)
    console.log(`     @sanity/visual-editing requires @sanity/comlink ${veComlink}`)
    console.log('     → Presentation tool will show "Unable to connect"')
    console.log('     → Fix: add npm override in root package.json')
    console.log('')
  } else {
    console.log('  ✓  Comlink versions compatible (both major v' + studioMajor + ')')
  }
} else {
  console.log('  ⚠  Could not verify comlink compatibility (missing packages)')
}

// 3. Check presentation-comlink compatibility
const studioPComlink = getDep(
  findPackageJson('sanity', searchPaths),
  '@sanity/presentation-comlink'
)
const vePComlink = getDep(
  findPackageJson('@sanity/visual-editing', searchPaths),
  '@sanity/presentation-comlink'
)

const studioPMajor = semverMajor(studioPComlink)
const vePMajor = semverMajor(vePComlink)

if (studioPMajor && vePMajor) {
  if (studioPMajor !== vePMajor) {
    console.log('  ⚠️  PRESENTATION-COMLINK MISMATCH')
    console.log(`     sanity requires ${studioPComlink}`)
    console.log(`     @sanity/visual-editing requires ${vePComlink}`)
    console.log('')
  } else {
    console.log('  ✓  Presentation-comlink versions compatible (both major v' + studioPMajor + ')')
  }
}

// 4. Check @sanity/astro override is in place
const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
const veOverride = rootPkg.overrides?.['@sanity/astro']?.['@sanity/visual-editing']

if (veOverride) {
  console.log(`  ✓  npm override active: @sanity/astro → @sanity/visual-editing ${veOverride}`)
} else {
  const astroPkg = findPackageJson('@sanity/astro', searchPaths)
  const astroPinnedVE = getDep(astroPkg, '@sanity/visual-editing')
  if (astroPinnedVE && semverMajor(astroPinnedVE) < semverMajor(installed['@sanity/visual-editing'])) {
    console.log('  ⚠️  @sanity/astro pins @sanity/visual-editing to ' + astroPinnedVE)
    console.log('     but you have v' + installed['@sanity/visual-editing'] + ' installed')
    console.log('     → Add override to root package.json to prevent downgrade')
  }
}

// 5. Check React compatibility
const reactPkg = findPackageJson('react', searchPaths)
if (reactPkg) {
  const reactMajor = semverMajor(reactPkg.version)
  const sanityPkg = findPackageJson('sanity', searchPaths)
  const sanityReact = getDep(sanityPkg, 'react')

  if (sanityReact && reactMajor) {
    const sanityReactMax = semverMajor(sanityReact.split('||').pop().trim())
    console.log(`  ✓  React v${reactPkg.version} (sanity wants ${sanityReact})`)
  }
}

console.log('\n  Run this after: npm install, npm update, or upgrading any @sanity/* package\n')
