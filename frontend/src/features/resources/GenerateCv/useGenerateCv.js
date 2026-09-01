import { useState, useCallback } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { RENDER_CV_QUERY } from '../cv.gql.js'

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function base64ToBlob(base64, mime) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Opens the rendered CV in a hidden iframe and triggers the browser's print
 * dialog, where the user picks "Save as PDF". Using an iframe rather than a
 * popup avoids blockers and keeps the current page untouched.
 */
function printHtml(html, onDone) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
  document.body.appendChild(frame)

  const cleanup = () => {
    // Delay removal so the print dialog has the document while it is open.
    setTimeout(() => frame.remove(), 1000)
    onDone?.()
  }

  frame.onload = () => {
    const win = frame.contentWindow
    if (!win) return cleanup()
    win.addEventListener('afterprint', cleanup, { once: true })
    try {
      win.focus()
      win.print()
    } catch {
      cleanup()
    }
  }

  frame.srcdoc = html
}

export function useGenerateCv(resourceId) {
  const client = useApolloClient()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const generate = useCallback(
    async (templateId, format) => {
      setGenerating(true)
      setError(null)
      try {
        const { data } = await client.query({
          query: RENDER_CV_QUERY,
          variables: { resourceId, templateId, format },
          // A CV must reflect the data as saved right now.
          fetchPolicy: 'network-only',
        })
        const cv = data?.renderCv
        if (!cv) throw new Error('The server returned no CV.')

        if (format === 'DOCX') {
          if (!cv.docxBase64) throw new Error('The server returned no document.')
          downloadBlob(base64ToBlob(cv.docxBase64, DOCX_MIME), cv.fileName)
          setGenerating(false)
        } else {
          // Printing is async — clear the busy state when the dialog closes.
          printHtml(cv.html, () => setGenerating(false))
        }
        return true
      } catch (err) {
        setError(err.message ?? 'Failed to generate the CV.')
        setGenerating(false)
        return false
      }
    },
    [client, resourceId],
  )

  return { generate, generating, error }
}
