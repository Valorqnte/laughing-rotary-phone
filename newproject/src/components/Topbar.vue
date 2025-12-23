<template>
  <el-header class="topbar">
    <img class="logo" :src="src" :alt="alt" />
    <span class="title"></span>
    <el-button type="danger" @click="logoutUser" :disabled="!user">Logout</el-button>
  </el-header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const { user, logout } = useAuthStore()

const logoutUser = () => {
  logout()
  router.push({ name: 'Login' })
}

defineProps({
  src: { type: String, default: new URL('../assets/logo.png', import.meta.url).href },
  alt: { type: String, default: 'Logo' }
})
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
}

/* Ensure page content doesn't hide under the fixed topbar */
body {
  padding-top: 56px;
}

*, *::before, *::after {
  box-sizing: border-box;
}
</style>

<style scoped>
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;

  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 12px;
  background: #226f8b;
  border-bottom: 1px solid #eaeaea;
}

.logo {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px; /* use 50% for a circle */
}

.title {
  color: white;
  font-size: 20px;

}
</style>
