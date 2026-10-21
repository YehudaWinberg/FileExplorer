export type PdfState =
  | { status: 'loading'; progress: number | null }
  | { status: 'error' }
  | { status: 'ready'; url: string; pages: number | null }

export const PDF_LOADING: PdfState = { status: 'loading', progress: null }

export const PDF_ERROR_MESSAGE = 'לא ניתן לטעון את הקובץ'
