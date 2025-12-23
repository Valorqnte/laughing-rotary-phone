<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchBooks, resolveBookCoverUrl, type Book } from '@/services/books'
import { borrowBook, returnBorrowRecord } from '@/services/borrow'
import { useAuthStore } from '@/stores/auth'

const DEFAULT_COVER = 'https://shadow.elemecdn.com/app/element/hamburger.9cf7b091-55e9-11e9-a976-7f4d0b07eef6.png'
type BookTag = 'Borrowed' | 'Available' | 'Byuser'
interface BookRow {
  id: number
  title: string
  author?: string | null
  cover: string
  type: BookTag
  button: string
  book: Book
  availableCount: number
}

const { user } = useAuthStore()
const tableData = ref<BookRow[]>([])
const search = ref('')
const loading = ref(false)
const activeRow = ref<number | null>(null)

const filterTag = (value: BookTag, row: BookRow) => row.type === value

const filterTableData = computed(() => tableData.value)

const statusTagTypeMap: Record<BookTag, 'success' | 'warning' | 'danger' | 'info'> = {
  Borrowed: 'warning',
  Available: 'success',
  Byuser: 'info',
}
const statusButtonTypeMap: Record<BookTag, 'success' | 'danger' | 'info' | 'warning'> = {
  Borrowed: 'info',
  Available: 'success',
  Byuser: 'warning',
}
const statusButtonLabelMap: Record<BookTag, string> = {
  Borrowed: 'Unavailable',
  Available: 'Borrow',
  Byuser: 'Return',
}

const getStatusButtonType = (status: BookTag) => statusButtonTypeMap[status]
const getStatusTagType = (status: BookTag) => statusTagTypeMap[status]
const isActionDisabled = (row: BookRow) => row.type === 'Borrowed' || activeRow.value === row.id

const deriveBorrowId = (book: Book) =>
  book.activeBorrowId ??
  book.active_borrow_id ??
  book.borrowId ??
  book.borrow_id ??
  null

const getAvailableCount = (book: Book) => {
  const qty = Number.isFinite(book.quantity) ? Number(book.quantity) : 0
  const borrowed = Number.isFinite(book.borrowed_count) ? Number(book.borrowed_count) : 0
  const available = (book as any).available_count ?? (book as any).availableCount ?? qty - borrowed
  return Math.max(0, Number.isFinite(available) ? Number(available) : qty - borrowed)
}

const deriveType = (book: Book, currentUserId: number | null): BookTag => {
  const borrowerId = book.borrowed_by ?? book.borrowerId ?? book.borrower_id ?? null
  const available = getAvailableCount(book)
  if (borrowerId && currentUserId && borrowerId === currentUserId) return 'Byuser'
  if (available <= 0) return 'Borrowed'
  return 'Available'
}

const mapRow = (book: Book, currentUserId: number | null): BookRow => {
  const type = deriveType(book, currentUserId)
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    cover: resolveBookCoverUrl(book) || DEFAULT_COVER,
    type,
    button: statusButtonLabelMap[type],
    book,
    availableCount: getAvailableCount(book),
  }
}

const loadBooks = async (q?: string) => {
  loading.value = true
  try {
    const books = await fetchBooks({ q: q?.trim() || undefined })
    tableData.value = books.map((book) => mapRow(book, user.value?.id ?? null))
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || 'Failed to load books')
  } finally {
    loading.value = false
  }
}

const handleAction = async (row: BookRow) => {
  if (row.type === 'Borrowed') return
  const currentUserId = user.value?.id
  if (!currentUserId) {
    ElMessage.error('Please login again')
    return
  }
  activeRow.value = row.id
  try {
    if (row.type === 'Available') {
      await borrowBook({ book_id: row.id, user_id: currentUserId })
      ElMessage.success('Book borrowed')
    } else if (row.type === 'Byuser') {
      const borrowId = deriveBorrowId(row.book)
      if (!borrowId) throw new Error('Borrow record not found')
      await returnBorrowRecord(borrowId)
      ElMessage.success('Book returned')
    }
    await loadBooks()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || error?.message || 'Action failed')
  } finally {
    activeRow.value = null
  }
}

onMounted(() => loadBooks())

let searchTimer: number | undefined
watch(
  search,
  (value) => {
    if (searchTimer) window.clearTimeout(searchTimer)
    searchTimer = window.setTimeout(() => {
      loadBooks(value)
    }, 300)
  },
  { flush: 'post' }
)
</script>

<template>
  <el-table :data="filterTableData" style="width: 100%" v-loading="loading">

    <el-table-column label="Cover" width="120">
      <template #default="{ row }">
        <img :src="row.cover" :alt="row.title" style="width: 50%; display: block; object-fit: cover;" />
      </template>
    </el-table-column>
    <el-table-column prop="title" label="Title" width="120" />
    <el-table-column prop="author" label="Author" width="150" />
    <el-table-column
        prop="type"
        label="Status"
        width="100"
        :filters="[
        { text: 'Borrowed', value: 'Borrowed' },
        { text: 'Available', value: 'Available' },
        { text: 'By you',   value: 'Byuser' }
      ]"
        :filter-method="filterTag"
        filter-placement="bottom-end"
    >
      <template #default="scope">
        <el-tag
            :type="getStatusTagType(scope.row.type)"
            disable-transitions
        >{{ scope.row.type }}</el-tag
        >
      </template>
    </el-table-column>
    <el-table-column align="right">
      <template #header>
        <div class="table-header-actions">
          <el-input v-model="search" size="small" placeholder="Type to search" />
        </div>
      </template>
      <template #default="scope">
        <el-button
          size="small"
          :type="getStatusButtonType(scope.row.type)"
          :disabled="isActionDisabled(scope.row)"
          :loading="activeRow === scope.row.id"
          disable-transitions
          @click="handleAction(scope.row)"
        >
          {{ scope.row.button }}
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>

.table-header-actions {
  display: flex;

  gap: 8px; /* space between button and input */
  /* optional: uncomment to right-align inside the header cell */
  /* justify-content: flex-end; */
}
.table-header-actions .el-input {
  min-width: 200px;
  max-width: 400px;
}
</style>