<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { updatePassword } from '@/services/users'

const props = defineProps<{ modelValue: boolean; info?: { id?: number } }>()
const emit = defineEmits(['update:modelValue', 'updated'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const formLabelWidth = '140px'
const loading = ref(false)

const form = reactive({
  password: '',
})

const close = () => {
  dialogVisible.value = false
}

const resetForm = () => {
  form.password = ''
}

const submit = async () => {
  if (!form.password || form.password.length < 6) {
    ElMessage.error('Password must be at least 6 characters')
    return
  }
  if (!props.info?.id) {
    ElMessage.error('Missing user id')
    return
  }
  loading.value = true
  try {
    await updatePassword(props.info.id, form.password)
    ElMessage.success('Password updated')
    emit('updated')
    resetForm()
    close()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || 'Update failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog v-model="dialogVisible" title="Change password" width="500">
    <el-form :model="form">
      <el-form-item label="New password" :label-width="formLabelWidth">
        <el-input v-model="form.password" autocomplete="off" type="password" show-password />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="close">Cancel</el-button>
        <el-button type="primary" :loading="loading" @click="submit">Confirm</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>