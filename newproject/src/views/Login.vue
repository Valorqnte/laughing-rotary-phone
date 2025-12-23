<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login, register } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'

const activeName = ref('first')
const username = ref('')
const password = ref('')
const usertype = ref(false)
const loading = ref(false)

const router = useRouter()
const route = useRoute()
const { setUser } = useAuthStore()

const resetForm = () => {
  username.value = ''
  password.value = ''
}

const handleAuthSuccess = (user: { role: string }) => {
  setUser(user)
  const redirect = (route.query.redirect as string) || (user.role === 'admin' ? '/Adminhome' : '/')
  router.replace(redirect)
}

const loginHandler = async () => {
  if (!username.value || !password.value) {
    ElMessage.error('Username and password are required')
    return
  }
  loading.value = true
  try {
    const { data } = await login({ username: username.value, password: password.value })
    const expectedRole = usertype.value ? 'admin' : 'user'
    if (data.user.role !== expectedRole) {
      ElMessage.error(`Please login with a ${expectedRole} account`)
      return
    }
    handleAuthSuccess(data.user)
    ElMessage.success('Login successful')
    resetForm()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || 'Login failed')
  } finally {
    loading.value = false
  }
}

const registerHandler = async () => {
  if (!username.value || !password.value) {
    ElMessage.error('Username and password are required')
    return
  }
  loading.value = true
  try {
    await register({ username: username.value, password: password.value })
    ElMessage.success('Account created, you can now login')
    activeName.value = 'first'
    resetForm()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || 'Registration failed')
  } finally {
    loading.value = false
  }
}

const handleClick = () => {}
</script>

<template>
  <div class="login-page">
    <el-card style="max-width: 440px">
      <el-tabs v-model="activeName" class="demo-tabs">
        <el-tab-pane label="Login" name="first">
          <el-switch
              v-model="usertype"
              class="mb-2"
              active-text="Admin user"
              inactive-text="Guest user"
          />

          <div>
            Username
            <el-input v-model="username" class="input" style="width: 240px" placeholder="Please input"/>
          </div>

          <div>
            Password
            <el-input
                class="password"
                v-model="password"
                style="width: 240px"
                type="password"
                placeholder="Please input password"
                show-password
            />
          </div>
          <div class ="button-container">
            <el-button type="primary" :loading="loading" @click="loginHandler">Login</el-button>
          </div>
        </el-tab-pane>
        <el-tab-pane label="Create a account" name="second">
          <div>
            Username
            <el-input v-model="username" class="input" style="width: 240px" placeholder="Please input"/>
          </div>

          <div>
            Password
            <el-input
                class="password"
                v-model="password"
                style="width: 240px"
                type="password"
                placeholder="Please input password"
                show-password
            />
          </div>
          <div class ="button-container">
            <el-button type="primary" :loading="loading" @click="registerHandler">Create</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>

</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: #fafafa;
  padding: 0 2rem;
  padding-top: 20vh;
}



.demo-tabs > * {
  padding: 32px;
  color: #6b778c;
  font-size: 32px;
  font-weight: 600;
}
.input {
  margin-top: 16px;
  margin-bottom: 24px;
}
.button-container {
  text-align: right;
  margin-top: 16px;
}
.password {
  margin-left: 3px;
}
</style>
