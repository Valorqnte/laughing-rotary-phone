import http from './http'

export type BookStatus = 'available' | 'borrowed'

export interface BookPayload {
  title: string
  author: string
  publish_date?: string | null
  status?: BookStatus
  description?: string
  quantity: number
}

export interface Book extends BookPayload {
  id: number
  status: BookStatus
  borrower_id?: number | null
  borrowerId?: number | null
  borrowed_by?: number | null
  active_borrow_id?: number | null
  activeBorrowId?: number | null
  borrow_id?: number | null
  borrowId?: number | null
  cover_url?: string | null
  image?: string | null
  file_key?: string | null
  borrowed_count?: number
  available_count?: number
}

interface BookMutationResponse {
  success: boolean
  id?: number
}

export const fetchBooks = async (params?: { q?: string }) => {
  const { data } = await http.get<Book[]>('/books', { params })
  return data
}

export const createBook = async (payload: BookPayload) => {
  const { data } = await http.post<BookMutationResponse>('/books', payload)
  return data
}

export const updateBook = async (id: number, payload: BookPayload) => {
  const { data } = await http.put<BookMutationResponse>(`/books/${id}`, payload)
  return data
}

export const deleteBook = (id: number) => http.delete(`/books/${id}`)

export const uploadBookCover = async (id: number, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await http.post<{ success: boolean; file_key: string }>(
    `/books/${id}/file`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  )
  return data
}

export const resolveBookCoverUrl = (book: Book) => {
  if (book.cover_url) return book.cover_url
  if (book.image) return book.image
  if (book.file_key) return `/api/books/${book.id}/file`
  return null
}
