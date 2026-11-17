import fs from 'fs'
import path from 'path'

function ensureBuildDirs() {
  function walk(dir) {
    let results = []
    try {
      const list = fs.readdirSync(dir)
      list.forEach((file) => {
        const full = path.join(dir, file)
        const stat = fs.statSync(full)
        if (stat && stat.isDirectory()) {
          results.push(full)
          results = results.concat(walk(full))
        }
      })
    } catch {}
    return results
  }

  const appDirs = walk('app')
  const bases = [
    path.join('.next', 'server', 'app'),
    path.join('.next', 'static', 'chunks', 'app'),
    path.join('.next', 'types', 'app'),
  ]

  const extraDirs = [
    path.join('.next', 'static', 'chunks', 'next', 'dist'),
    path.join('.next', 'static', 'chunks', 'next', 'dist', 'client'),
    path.join('.next', 'static', 'chunks', 'next', 'dist', 'client', 'components'),
    path.join('.next', 'static', 'chunks', 'next', 'dist', 'compiled'),
    path.join('.next', 'server', 'chunks'),
    path.join('.next', 'server', 'vendor-chunks'),
    path.join('.next', 'server', 'app', '_global-error.segments', '_global-error'),
  ]

  extraDirs.forEach((d) => {
    try {
      fs.mkdirSync(d, { recursive: true })
    } catch {}
  })

  appDirs.forEach((dir) => {
    const rel = path.relative('app', dir)
    bases.forEach((base) => {
      const target = path.join(base, rel)
      try {
        fs.mkdirSync(target, { recursive: true })
      } catch {}
    })
  })
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    cpus: 1,
  },
  webpack: (config) => {
    ensureBuildDirs()
    config.plugins.push({
      apply: (compiler) => {
        compiler.hooks.beforeCompile.tap('EnsureDirsPlugin', () => {
          ensureBuildDirs()
        })
        compiler.hooks.compilation.tap('EnsureDirsPlugin', () => {
          ensureBuildDirs()
        })
      },
    })
    return config
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
