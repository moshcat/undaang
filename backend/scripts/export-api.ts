import { mkdir } from 'node:fs/promises'
import Converter from 'openapi-to-postmanv2'
import { createApp } from '../src/app'

// Collection v2.1 shape, only the parts this script touches
type Auth = { type: string; bearer?: { key: string; value: string; type: string }[] }
type Item = {
  name: string
  item?: Item[]
  request?: { auth?: Auth | null; url?: { path?: string[] } }
  event?: { listen: string; script: { type: string; exec: string[] } }[]
}

const OUT_DIR = new URL('../docs/api/', import.meta.url)

const res = await createApp().request('/openapi.json')
const spec = await res.json()
spec.servers = [{ url: 'http://localhost:3000' }]

await mkdir(OUT_DIR, { recursive: true })
await Bun.write(new URL('openapi.json', OUT_DIR), JSON.stringify(spec, null, 2) + '\n')

const collection = await new Promise<Record<string, unknown>>((resolve, reject) => {
  Converter.convert(
    { type: 'json', data: spec },
    {
      folderStrategy: 'Tags',
      parametersResolution: 'Example',
      includeAuthInfoInExample: false,
      enableOptionalParameters: false,
    },
    (err, result) => {
      if (err) return reject(err)
      const data = result?.result ? result.output?.[0]?.data : undefined
      if (!data) return reject(new Error(result?.reason ?? 'conversion failed'))
      resolve(data as Record<string, unknown>)
    },
  )
})

// Protected requests inherit the collection-level bearer token; the rest send no auth.
function walk(items: Item[]) {
  for (const item of items) {
    if (item.item) walk(item.item)
    if (!item.request) continue
    if (item.request.auth?.type === 'bearer') delete item.request.auth
    else item.request.auth = { type: 'noauth' }
    const path = item.request.url?.path?.join('/')
    if (path === 'api/v1/auth/login' || path === 'api/v1/auth/register') {
      item.event = [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'const body = pm.response.json()',
              "if (body.data && body.data.token) pm.collectionVariables.set('token', body.data.token)",
            ],
          },
        },
      ]
    }
  }
}
walk(collection.item as Item[])

collection.auth = {
  type: 'bearer',
  bearer: [{ key: 'token', value: '{{token}}', type: 'string' }],
}
collection.variable = [
  { key: 'baseUrl', value: 'http://localhost:3000', type: 'string' },
  { key: 'token', value: '', type: 'string' },
]

const file = new URL('undaang.postman_collection.json', OUT_DIR)
await Bun.write(file, JSON.stringify(collection, null, 2) + '\n')
console.log(`Wrote ${file.pathname}`)
