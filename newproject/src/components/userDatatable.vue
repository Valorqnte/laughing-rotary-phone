<template>
  <el-table :data="filterTableData" style="width: 100%" v-loading="loading">
    <el-table-column label="Username" prop="username" />
    <el-table-column label="Borrowed">
      <template #default="{ row }">
        {{ row.borrowedCount }} book(s)
      </template>
    </el-table-column>
    <el-table-column align="right">
      <template #header>
        <el-input v-model="search" size="small" placeholder="Type to search" />
      </template>
      <template #default="scope">
        <el-button size="small" @click="handleEdit(scope.$index, scope.row)">Change password</el-button>
        <el-button size="small" @click="handleDetail(scope.$index, scope.row)">Detail</el-button>
        <el-button size="small" type="danger" @click="handleDelete(scope.$index, scope.row)">Delete</el-button>
      </template>
    </el-table-column>
  </el-table>
  <userdetailtable
    v-model="detailVisible"
    :user-id="detailUser?.id ?? undefined"
    :username="detailUser?.username"
    @removed="loadUsers"
  />
  <changepassword
    v-model="passwordVisible"
    :info="passwordUser || undefined"
    @updated="loadUsers"
  />
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import userdetailtable from './userdetailtable.vue'
import changepassword from './changepassword.vue'
import { fetchUsers, deleteUser, type UserSummary } from '@/services/users'
import { fetchBorrowRecords } from '@/services/borrow'

interface UserRow extends UserSummary {
  borrowedCount: number
}

const loading = ref(false)
const users = ref<UserRow[]>([])
const search = ref('')

const detailVisible = ref(false)
const passwordVisible = ref(false)
const detailUser = ref<UserRow | null>(null)
const passwordUser = ref<UserRow | null>(null)

const loadUsers = async (q?: string) => {
  loading.value = true
  try {
    const [userList, borrowList] = await Promise.all([
      fetchUsers({ q: q?.trim() || undefined }),
      fetchBorrowRecords(),
    ])
    const counts = borrowList.reduce<Record<number, number>>((acc, record) => {
      if (record.status === 'borrowed') {
        acc[record.user_id] = (acc[record.user_id] || 0) + 1
      }
      return acc
    }, {})
    users.value = userList.map((user) => ({
      ...user,
      borrowedCount: counts[user.id] || 0,
    }))
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || 'Failed to load users')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadUsers())

let searchTimer: number | undefined
watch(
  search,
  (value) => {
    if (searchTimer) window.clearTimeout(searchTimer)
    searchTimer = window.setTimeout(() => {
      loadUsers(value)
    }, 300)
  },
  { flush: 'post' }
)

const filterTableData = computed(() => users.value)

const handleEdit = (_index: number, row: UserRow) => {
  passwordUser.value = row
  passwordVisible.value = true
}

const handleDelete = (_index: number, row: UserRow) => {
  ElMessageBox.confirm(`Delete user "${row.username}"?`, 'Warning', { type: 'warning' })
    .then(async () => {
      await deleteUser(row.id)
      ElMessage.success('User deleted')
      loadUsers()
    })
    .catch(() => {})
}

const handleDetail = (_index: number, row: UserRow) => {
  detailUser.value = row
  detailVisible.value = true
}
</script>
