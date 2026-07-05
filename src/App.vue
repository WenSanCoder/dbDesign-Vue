<template>
  <router-view v-if="route.path === '/login'" />
  <div v-else class="app-shell">
    <header class="system-header">
      <div class="brand">
        <img class="brand-logo" :src="logoUrl" alt="浙江工业大学" />
        <span class="brand-text">浙江工业大学反方教务管理系统</span>
      </div>
      <div class="header-clock">
        <span class="greeting-text">{{ greetingText }}</span>
        <span class="time-text">{{ utc8TimeText }}</span>
      </div>
      <div class="header-actions">
        <el-select model-value="中文" size="small" style="width: 82px">
          <el-option label="中文" value="中文" />
        </el-select>
        <div class="user-badge">{{ session.user?.display_name || session.user?.username }}</div>
        <el-button size="small" plain @click="logout">退出</el-button>
      </div>
    </header>

    <nav class="top-nav">
      <template v-for="group in menuGroups" :key="group.title">
        <el-dropdown v-if="group.children.length" trigger="hover" @command="go">
          <button class="nav-item" type="button">{{ group.title }}<span class="arrow">▼</span></button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="item in group.children" :key="item.path" :command="item.path">
                {{ item.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <button v-else class="nav-item" type="button" @click="go(group.path || '/')">{{ group.title }}</button>
      </template>
    </nav>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from './stores/session'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const logoUrl = new URL('../static/zjut.png', import.meta.url).href
const utc8Now = ref(getUtc8Date())
let timer: number | undefined

const adminMenus = [
  { title: '首页', path: '/', children: [] },
  {
    title: '信息维护',
    children: [
      { label: '学院管理', path: '/admin/colleges' },
      { label: '专业管理', path: '/admin/majors' },
      { label: '行政班管理', path: '/admin/admin-classes' },
      { label: '学生管理', path: '/admin/students' },
      { label: '教师管理', path: '/admin/teachers' }
    ]
  },
  {
    title: '教学资源',
    children: [
      { label: '学期管理', path: '/admin/terms' },
      { label: '课程目录', path: '/admin/courses' },
      { label: '教学班管理', path: '/admin/teaching-classes' }
    ]
  },
  {
    title: '选课管理',
    children: [
      { label: '选课轮次', path: '/admin/rounds' },
      { label: '选课记录', path: '/student/selections' }
    ]
  }
]

const studentMenus = [
  { title: '首页', path: '/', children: [] },
  {
    title: '选课',
    children: [
      { label: '抢课选课', path: '/student/select' },
      { label: '我的选课', path: '/student/selections' }
    ]
  },
  { title: '课表查询', children: [{ label: '我的课表', path: '/student/schedule' }] },
  { title: '信息查询', children: [{ label: '我的成绩', path: '/student/grades' }] }
]

const teacherMenus = [
  { title: '首页', path: '/', children: [] },
  { title: '教学管理', children: [{ label: '我的教学班', path: '/teacher/classes' }] },
  { title: '成绩管理', children: [{ label: '成绩录入', path: '/teacher/grades' }] }
]

const menuGroups = computed(() => {
  if (session.user?.role_code === 'ADMIN') return adminMenus
  if (session.user?.role_code === 'TEACHER') return teacherMenus
  return studentMenus
})

const greetingText = computed(() => {
  const hour = utc8Now.value.getHours()
  const greeting = hour < 11 ? '早上好' : hour < 18 ? '中午好' : '晚上好'
  return `${greeting}，${session.user?.display_name || session.user?.username || '用户'}`
})

const utc8TimeText = computed(() => formatDateTime(utc8Now.value))

onMounted(() => {
  timer = window.setInterval(() => {
    utc8Now.value = getUtc8Date()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})

function go(path: string) {
  router.push(path)
}

function logout() {
  session.logout()
  router.push('/login')
}

function getUtc8Date() {
  const now = new Date()
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60_000
  return new Date(utcTime + 8 * 60 * 60_000)
}

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
}
</script>

<style scoped>
.app-shell {
  min-height: 100%;
  background: #f3f5f7;
}

.system-header {
  height: 58px;
  display: grid;
  grid-template-columns: auto minmax(220px, 1fr) auto;
  align-items: center;
  padding: 0 88px;
  background: #0787cf;
  color: #fff;
}

.header-clock {
  justify-self: center;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 13px;
  white-space: nowrap;
}

.greeting-text {
  font-weight: 600;
}

.time-text {
  font-variant-numeric: tabular-nums;
  opacity: 0.92;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 600;
}

.brand-logo {
  width: 42px;
  height: 42px;
  object-fit: contain;
  background: #fff;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-badge {
  min-width: 34px;
  height: 34px;
  padding: 0 10px;
  border-radius: 17px;
  background: #e6f6fb;
  color: #126899;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.top-nav {
  height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 88px;
  background: #fff;
  border-bottom: 1px solid #dcdfe6;
}

.nav-item {
  height: 44px;
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: #333;
  font-size: 14px;
  cursor: pointer;
}

.nav-item:hover {
  color: #0787cf;
  background: #f5f9fc;
}

.arrow {
  margin-left: 4px;
  color: #606266;
  font-size: 10px;
}

.main-content {
  min-height: calc(100vh - 102px);
}

@media (max-width: 900px) {
  .system-header,
  .top-nav {
    padding: 0 16px;
  }

  .brand-text {
    font-size: 18px;
  }

  .system-header {
    grid-template-columns: 1fr auto;
  }

  .header-clock {
    display: none;
  }
}
</style>
