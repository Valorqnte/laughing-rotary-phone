<template>
  <el-dialog v-model="dialogTableVisible" :title="dialogTitle" width="600">
    <el-table :data="gridData" v-loading="loading" empty-text="No borrowed books">
      <el-table-column property="title" label="Title" width="160" />
      <el-table-column property="author" label="Author" width="180" />
      <el-table-column property="borrow_date" label="Borrowed At" width="160" />
      <el-table-column fixed="right" label="Operations" min-width="80">
        <template #default="scope">
          <el-button
            link
            type="danger"
            size="small"
            :disabled="scope.row.status !== 'borrowed'"
            @click="handleRemove(scope.row)"
          >
            Remove
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchUserBorrowed, type UserBorrowRecord } from '@/services/users'
import { returnBorrowRecord } from '@/services/borrow'

const props = defineProps<{ modelValue: boolean; userId?: number; username?: string }>()
const emit = defineEmits(['update:modelValue', 'removed'])

const dialogTableVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const dialogTitle = computed(() => `${props.username || 'User'} Borrowed Books`)

const loading = ref(false)
const gridData = ref<UserBorrowRecord[]>([])

const loadData = async () => {
  if (!props.userId || !dialogTableVisible.value) return
  loading.value = true
  try {
    gridData.value = await fetchUserBorrowed(props.userId)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || 'Failed to load borrowed books')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.userId, dialogTableVisible.value],
  () => {
    if (dialogTableVisible.value) loadData()
  }
)

const handleRemove = async (row: UserBorrowRecord) => {
  try {
    await returnBorrowRecord(row.borrow_id)
    ElMessage.success('Book returned')
    emit('removed')
    loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || 'Failed to return book')
  }
}
</script>