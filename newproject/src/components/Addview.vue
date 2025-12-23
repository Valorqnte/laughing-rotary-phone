<template>

  <el-dialog
      v-model="dialogVisible"
      title="Add"
      width="500"
      :before-close="handleClose"
      draggable
  >
    <el-form :model="form" label-width="auto" style="max-width: 600px" ref="ruleFormRef" :rules="rules">
      <el-form-item label="Title" prop="title">
        <el-input v-model="form.title" />
      </el-form-item>
      <el-form-item label="Author" prop="author">
        <el-input v-model="form.author" />
      </el-form-item>
      <el-form-item label="Number" prop="quantity">
        <el-input-number v-model="form.quantity" :min="0" :step="1" />
      </el-form-item>
      <el-form-item label="Cover">
        <div class="cover-upload-wrapper">
          <el-upload
            ref="uploadRef"
            class="upload-demo"
            action=""
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleRemove"
            :on-exceed="handleExceed"
            accept="image/*"
          >
            <template #trigger>
              <el-button type="primary" class="selectfile">select file</el-button>
            </template>
            <el-button class="ml-3" type="success" :loading="uploadLoading" @click="uploadCover">
              upload to server
            </el-button>
            <template #tip>
              <div class="el-upload__tip text-red">
                limit 1 file, new file will cover the old file. Save the book before uploading.
              </div>
            </template>
          </el-upload>
          <div v-if="currentCover" class="current-cover">
            <span>Current cover</span>
            <img :src="currentCover" alt="Current cover" />
          </div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="closeDialog">Cancel</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">
          Confirm
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref, computed, watch, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { genFileId } from 'element-plus'
import type { FormInstance, FormRules, UploadInstance, UploadProps, UploadRawFile } from 'element-plus'
import { createBook, updateBook, uploadBookCover, resolveBookCoverUrl, type Book } from '@/services/books'

const uploadRef = ref<UploadInstance>()
const selectedFile = ref<File | null>(null)
const uploadLoading = ref(false)

const handleExceed: UploadProps['onExceed'] = (files) => {
  uploadRef.value?.clearFiles()
  const file = files[0] as UploadRawFile
  file.uid = genFileId()
  uploadRef.value?.handleStart(file)
}

const handleFileChange: UploadProps['onChange'] = (uploadFile) => {
  selectedFile.value = uploadFile.raw ?? null
}

const handleRemove: UploadProps['onRemove'] = () => {
  selectedFile.value = null
}

const props = defineProps<{ modelValue: boolean; info?: Book | null }>()
const emit = defineEmits(['update:modelValue', 'saved'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})


const currentCover = computed(() => (props.info ? resolveBookCoverUrl(props.info) : null))

const form = reactive({
  id: 0,
  title: '',
  author: '',
  description: '',
  quantity: 0,
})
const submitting = ref(false)

const resetForm = () => {
  form.id = 0
  form.title = ''
  form.author = ''
  form.description = ''
  form.quantity = 0
  selectedFile.value = null
  uploadRef.value?.clearFiles()
}

watch(
  () => props.info,
  (info) => {
    if (info) {
      form.id = info.id ?? 0
      form.title = info.title ?? ''
      form.author = info.author ?? ''
      form.description = info.description ?? ''
      form.quantity = info.quantity ?? 0
    } else {
      resetForm()
    }
    selectedFile.value = null
    uploadRef.value?.clearFiles()
  },
  { deep: true }
)

const closeDialog = () => {
  dialogVisible.value = false
  resetForm()
}

const ruleFormRef = ref<FormInstance>()
const rules = reactive<FormRules>({
  title: [{ required: true, message: 'Please input book title', trigger: 'blur' }],
  author: [{ required: true, message: 'Please input author', trigger: 'blur' }],
  quantity: [
    { required: true, message: 'Please input number of books', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (!Number.isInteger(value) || value < 0) {
          callback(new Error('Number must be a non-negative integer'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
})

const submit = () => {
  if (!ruleFormRef.value) return
  ruleFormRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const payload = {
        title: form.title.trim(),
        author: form.author.trim(),
        publish_date: null,
        status: 'available' as const,
        quantity: form.quantity,
      }
      if (form.id) {
        await updateBook(form.id, payload)
        ElMessage.success('Book updated')
      } else {
        await createBook(payload)
        ElMessage.success('Book added')
      }
      emit('saved')
      closeDialog()
    } catch (error: any) {
      ElMessage.error(error?.response?.data?.error || 'Operation failed')
    } finally {
      submitting.value = false
    }
  })
}

const uploadCover = async () => {
  if (!form.id) {
    ElMessage.warning('Save the book before uploading a cover')
    return
  }
  if (!selectedFile.value) {
    ElMessage.error('Please select a cover file first')
    return
  }
  uploadLoading.value = true
  try {
    await uploadBookCover(form.id, selectedFile.value)
    ElMessage.success('Cover uploaded')
    emit('saved')
    selectedFile.value = null
    uploadRef.value?.clearFiles()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || 'Upload failed')
  } finally {
    uploadLoading.value = false
  }
}

const handleClose = (done: () => void) => {
  ElMessageBox.confirm('Are you sure to close this dialog?')
    .then(() => {
      resetForm()
      done()
    })
    .catch(() => {})
}
</script>

<style scoped>
.ml-3 {
  margin-left: 12px;

}
.selectfile {

}
.cover-upload-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.current-cover {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.current-cover img {
  width: 120px;
  height: 160px;
  object-fit: cover;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
</style>
