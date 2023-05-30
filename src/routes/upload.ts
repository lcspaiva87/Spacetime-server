/* eslint-disable no-unused-vars */
import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { FastifyInstance } from 'fastify'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import admin from 'firebase-admin'
import process from 'node:process'
const pump = promisify(pipeline)
const private_key = process.env.private_key?.replace(/\\n/g, '\n')
const firebaseConfig: any = {
  type: process.env.type,
  project_id: process.env.project_id,
  private_key_id: process.env.private_key_id,
  private_key,
  client_email: process.env.client_email,
}

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  storageBucket: 'gs://spacetime-img.appspot.com',
})
export async function uploadRoutes(app: FastifyInstance) {
  app.post('/upload', async (request, reply) => {
    const upload = await request.file({
      limits: {
        fileSize: 5_242_880, // 5mb
      },
    })
    if (!upload) {
      return reply.status(400).send()
    }
    const mimeTypeRegex = /^(image|video)\/[a-zA-Z]+/
    const isValidFileFormat = mimeTypeRegex.test(upload.mimetype)

    if (!isValidFileFormat) {
      return reply.status(400).send()
    }

    const fileId = randomUUID()
    const extension = extname(upload.filename)

    const fileName = fileId.concat(extension)

    const bucket = admin.storage().bucket()
    const file = bucket.file(fileName)

    const writeStream = file.createWriteStream({
      metadata: {
        contentType: upload.mimetype,
      },
      resumable: false, // Desabilite uploads retomáveis para simplificar
    })

    await pump(upload.file, writeStream)

    const fileUrl = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500', // Ajuste a data de expiração conforme necessário
    })

    return { fileUrl }
  })
}
