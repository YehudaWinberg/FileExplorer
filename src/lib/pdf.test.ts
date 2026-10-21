import { afterEach, describe, expect, it, vi } from 'vitest'
import { countPdfPages, isValidPdf, loadPdf, PdfLoadError } from './pdf'
import { pdf } from './testFixtures'

const file = (bytes: Uint8Array) => new File([bytes as BlobPart], 'a.pdf')
const text = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes)

afterEach(() => {
  vi.useRealTimers()
})

describe('countPdfPages', () => {
  it.each([1, 2, 7])('counts %i page objects', (pages) => {
    expect(countPdfPages(text(pdf(pages)))).toBe(pages)
  })

  it('falls back to /Count when the page objects are not visible in the text', () => {
    expect(countPdfPages('<< /Type /Pages /Kids [1 0 R] /Count 12 >>')).toBe(12)
    expect(countPdfPages('<< /Count 4 /Type /Pages >>')).toBe(4)
  })

  it('returns null instead of guessing when the count cannot be determined', () => {
    expect(countPdfPages('%PDF-1.5 compressed %%EOF')).toBeNull()
  })
})

describe('isValidPdf', () => {
  it('requires the %PDF- header and the %%EOF marker', () => {
    expect(isValidPdf('%PDF-1.4', 'x %%EOF\n')).toBe(true)
    expect(isValidPdf('hello', '%%EOF')).toBe(false)
    expect(isValidPdf('%PDF-1.4', 'truncated')).toBe(false)
  })
})

describe('loadPdf', () => {
  it('returns a PDF blob and the page count', async () => {
    const result = await loadPdf(async () => file(pdf(3)))
    expect(result.pages).toBe(3)
    expect(result.blob.type).toBe('application/pdf')
  })

  it('reports real progress in increasing steps that end at 1', async () => {
    const bytes = pdf(1, 1000)
    const steps: number[] = []
    await loadPdf(async () => file(bytes), { chunkBytes: 400, onProgress: (f) => steps.push(f) })

    expect(steps.length).toBeGreaterThan(1)
    expect(steps).toEqual([...steps].sort((a, b) => a - b))
    expect(steps[0]).toBeCloseTo(400 / bytes.length)
    expect(steps[steps.length - 1]).toBe(1)
  })

  it('rejects a corrupt file as invalid', async () => {
    await expect(loadPdf(async () => file(new Uint8Array([1, 2, 3])))).rejects.toMatchObject({ reason: 'invalid' })
  })

  it('rejects an empty file as invalid', async () => {
    await expect(loadPdf(async () => file(new Uint8Array()))).rejects.toBeInstanceOf(PdfLoadError)
  })

  it('rejects when the file cannot be obtained', async () => {
    await expect(loadPdf(() => Promise.reject(new Error('denied')))).rejects.toBeInstanceOf(PdfLoadError)
  })

  it('times out after 60 seconds by default, and not before', async () => {
    vi.useFakeTimers()
    const result = loadPdf(() => new Promise<Blob>(() => {}))
    const settled = vi.fn()
    result.catch(settled)

    await vi.advanceTimersByTimeAsync(59_999)
    expect(settled).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await expect(result).rejects.toMatchObject({ reason: 'timeout' })
  })

  it('stops reading and stays silent after an abort', async () => {
    const controller = new AbortController()
    const steps: number[] = []
    const result = loadPdf(async () => file(pdf(1, 2000)), {
      chunkBytes: 100,
      signal: controller.signal,
      onProgress: (f) => {
        steps.push(f)
        controller.abort()
      },
    })

    await expect(result).rejects.toMatchObject({ reason: 'aborted' })
    expect(steps).toHaveLength(1)
  })

  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(loadPdf(async () => file(pdf()), { signal: controller.signal })).rejects.toMatchObject({
      reason: 'aborted',
    })
  })
})
