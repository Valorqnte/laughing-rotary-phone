import http from './http'

export interface BorrowPayload {
  book_id: number
  user_id: number
}

export interface BorrowRecord {
  id: number
  book_id: number
  user_id: number
  status: 'borrowed' | 'returned'
  borrow_date?: string
  return_date?: string | null
  book?: {
    id: number
    title: string
    author?: string
    cover_url?: string | null
  }
  user?: {
    id: number
    username: string
  }
}

export const fetchBorrowRecords = async () => {
  const { data } = await http.get<BorrowRecord[]>('/borrow')
  return data
}

export const borrowBook = async (payload: BorrowPayload) => {
  const { data } = await http.post<BorrowRecord>('/borrow', payload)
  return data
}

export const returnBorrowRecord = async (borrowId: number) => {
  const { data } = await http.put<BorrowRecord>(`/borrow/${borrowId}/return`)
  return data
}

