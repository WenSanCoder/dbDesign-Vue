<template>
  <div class="login-page">
    <div class="login-header">
      <img class="login-logo" :src="logoUrl" alt="浙江工业大学" />
      <span>浙江工业大学反方教务管理系统</span>
    </div>
    <div class="login-box">
      <div class="login-avatar">
        <el-avatar :size="68" :src="cachedAvatarUrl || undefined">{{ loginAvatarText }}</el-avatar>
      </div>
      <h1>用户登录</h1>
      <el-form label-position="top" @submit.prevent="login">
        <el-form-item label="账号">
          <el-input v-model="form.username" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            autocomplete="current-password"
            placeholder="请输入密码"
          />
        </el-form-item>
        <el-button type="primary" class="login-button" :loading="loading" @click="login">登录</el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { apiPost } from '../api/http'
import { useSessionStore, type SessionUser } from '../stores/session'
import { getCachedAvatar, resolveAvatarUrl } from '../utils/avatar'

const router = useRouter()
const session = useSessionStore()
const loading = ref(false)
const logoUrl = new URL('../../static/zjut.png', import.meta.url).href
const lastLoginStorageKey = 'edu-system-last-login'
const form = reactive(readLastLogin())
const cachedAvatarUrl = computed(() => resolveAvatarUrl(getCachedAvatar(form.username)))
const loginAvatarText = computed(() => (form.username || '用户').slice(0, 1).toUpperCase())

async function login() {
  loading.value = true
  try {
    const credentials = {
      username: form.username.trim(),
      password: form.password
    }
    const user = await apiPost<SessionUser>('/auth/login', credentials)
    form.username = credentials.username
    localStorage.setItem(lastLoginStorageKey, JSON.stringify(credentials))
    session.setUser(user)
    router.push('/')
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    loading.value = false
  }
}

function readLastLogin() {
  try {
    const cached = JSON.parse(localStorage.getItem(lastLoginStorageKey) || 'null') as Record<string, unknown> | null
    return {
      username: typeof cached?.username === 'string' ? cached.username : '',
      password: typeof cached?.password === 'string' ? cached.password : ''
    }
  } catch {
    return { username: '', password: '' }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #eef2f5;
}

.login-header {
  height: 66px;
  padding: 0 90px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #0787cf;
  color: #fff;
  font-size: 24px;
  font-weight: 600;
}

.login-logo {
  width: 42px;
  height: 42px;
  object-fit: contain;
  background: #fff;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.login-box {
  width: 420px;
  margin: 84px auto 0;
  padding: 28px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.login-avatar {
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
}

.login-box h1 {
  margin: 0 0 22px;
  font-size: 22px;
  font-weight: 600;
}

.login-button {
  width: 100%;
}
</style>
