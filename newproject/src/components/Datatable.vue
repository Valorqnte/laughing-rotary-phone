<template>
  <el-table :data="filterTableData" style="width: 100%" v-loading="loading">
    <el-table-column label="Cover" width="120">
      <template #default="{ row }">
        <img :src="row.image || fallbackCover" :alt="row.title" style="width: 50%; object-fit: cover" />
      </template>
    </el-table-column>
    <el-table-column prop="title" label="Title" width="120" />
    <el-table-column prop="author" label="Author" width="150" />
    <el-table-column prop="quantity" label="Number" width="100" />
    <el-table-column align="right">
      <template #header>
        <div class="table-header-actions">
          <el-button type="primary" plain size="small" @click="handleAdd">Add</el-button>
          <el-input v-model="search" size="small" placeholder="Type to search" />
        </div>
      </template>
      <template #default="scope">
        <el-button size="small" @click="handleEdit(scope.$index, scope.row)">Edit</el-button>
        <el-button size="small" type="danger" @click="handleDelete(scope.$index, scope.row)">Delete</el-button>
      </template>
    </el-table-column>
  </el-table>
  <Addview v-model="isShow" :info="currentRow || undefined" @saved="loadBooks" />
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import Addview from './Addview.vue'
import { fetchBooks, deleteBook, resolveBookCoverUrl, type Book } from '@/services/books'

const fallbackCover = 'https://shadow.elemecdn.com/app/element/hamburger.9cf7b091-55e9-11e9-a976-7f4d0b07eef6.png'

const tableData = ref<Book[]>([])
const search = ref('')
const loading = ref(false)
const isShow = ref(false)
const currentRow = ref<Book | null>(null)

const loadBooks = async (q?: string) => {
  loading.value = true
  try {
    tableData.value = (await fetchBooks({ q: q?.trim() || undefined })).map((book) => ({
      ...book,
      image: resolveBookCoverUrl(book) || fallbackCover,
    }))
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || 'Failed to load books')
  } finally {
    loading.value = false
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

const handleAdd = () => {
  currentRow.value = null
  isShow.value = true
}

const handleEdit = (_index: number, row: Book) => {
  currentRow.value = row
  isShow.value = true
}

const handleDelete = (_index: number, row: Book) => {
  ElMessageBox.confirm(`Delete "${row.title}"?`, 'Warning', { type: 'warning' })
    .then(async () => {
      try {
        await deleteBook(row.id)
        ElMessage.success('Book deleted')
        loadBooks()
      } catch (error: any) {
        ElMessage.error(error?.response?.data?.error || 'Delete failed')
      }
    })
    .catch(() => {})
}

const filterTableData = computed(() => tableData.value)
</script>

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
