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
      { label: '校区维护', path: '/admin/campuses', permission: 'admin.info.campuses' },
      { label: '学院管理', path: '/admin/colleges', permission: 'admin.info.colleges' },
      { label: '专业管理', path: '/admin/majors', permission: 'admin.info.majors' },
      { label: '学年学期维护', path: '/admin/terms', permission: 'admin.info.terms' },
      { label: '入学年级维护', path: '/admin/grade-years', permission: 'admin.info.grade-years' },
      { label: '教学楼维护', path: '/admin/buildings', permission: 'admin.info.buildings' },
      { label: '教室维护', path: '/admin/classrooms', permission: 'admin.info.classrooms' },
      { label: '教室占用查询', path: '/admin/room-schedules', permission: 'admin.info.room-schedules' },
      { label: '行政班管理', path: '/admin/admin-classes', permission: 'admin.info.admin-classes' },
      { label: '学生管理', path: '/admin/students', permission: 'admin.info.students' },
      { label: '教师管理', path: '/admin/teachers', permission: 'admin.info.teachers' },
      { label: '公告发布', path: '/admin/notices', permission: 'admin.info.notices' },
      { label: '用户管理', path: '/admin/user-management', permission: 'admin.info.users' }
    ], permission: 'admin.menu.info'
  },
  {
    title: '教学资源',
    children: [
      { label: '课程目录', path: '/admin/courses', permission: 'admin.resources.courses' },
      { label: '教学班管理', path: '/admin/teaching-classes', permission: 'admin.resources.teaching-classes' },
      { label: '选课规则', path: '/admin/selection-rules', permission: 'admin.resources.selection-rules' }
    ], permission: 'admin.menu.resources'
  },
  {
    title: '审批中心',
    children: [
      { label: '培养方案调整', path: '/admin/approvals/plan-adjustments', permission: 'admin.approvals.plan-adjustments' },
      { label: '转专业/转班', path: '/admin/approvals/program-changes', permission: 'admin.approvals.program-changes' },
      { label: '成绩审批', path: '/admin/approvals/grade-approvals', permission: 'admin.approvals.grade-approvals' }
    ], permission: 'admin.menu.approvals'
  },
  {
    title: '选课管理',
    children: [
      { label: '选课轮次', path: '/admin/rounds', permission: 'admin.selection.rounds' },
      { label: '抢课监控', path: '/admin/selection-monitor', permission: 'admin.selection.monitor' }
    ], permission: 'admin.menu.selection'
  },
  { title: '成绩查询', path: '/admin/grade-query', children: [], permission: 'admin.menu.grade-query' }
]

const studentMenus = [
  { title: '首页', path: '/', children: [] },
  {
    title: '选课',
    children: [
      { label: '抢课选课', path: '/student/select', permission: 'student.selection.select' },
      { label: '我的选课', path: '/student/selections', permission: 'student.selection.records' }
    ], permission: 'student.menu.selection'
  },
  { title: '课表查询', children: [{ label: '我的课表', path: '/student/schedule', permission: 'student.schedule.mine' }], permission: 'student.menu.schedule' },
  { title: '信息查询', children: [{ label: '我的成绩', path: '/student/grades', permission: 'student.info.grades' }, { label: '培养计划', path: '/student/training-plan', permission: 'student.info.training-plan' }, { label: '我的教务申请', path: '/student/governance', permission: 'student.info.governance' }], permission: 'student.menu.info' }
]

const teacherMenus = [
  { title: '首页', path: '/', children: [] },
  { title: '教学管理', children: [{ label: '我的教学班', path: '/teacher/classes', permission: 'teacher.teaching.classes' }], permission: 'teacher.menu.teaching' },
  { title: '成绩管理', children: [{ label: '成绩录入', path: '/teacher/grades', permission: 'teacher.grades.entry' }], permission: 'teacher.menu.grades' }
]

const menuGroups = computed(() => {
  const codes = session.user?.permission_codes || []
  const hasConfiguredMenus = codes.some((code) => code.includes('.menu.'))
  if (!hasConfiguredMenus) {
    if (session.user?.role_code === 'TEACHER') return teacherMenus
    if (session.user?.role_code === 'STUDENT') return studentMenus
    return session.user?.role_code === 'ADMIN' ? adminMenus : adminMenus.slice(0, 1)
  }
  const allMenus = [adminMenus[0], ...adminMenus.slice(1), ...teacherMenus.slice(1), ...studentMenus.slice(1)]
  return allMenus
    .filter((group) => !group.permission || codes.includes(group.permission))
    .map((group) => ({ ...group, children: group.children.filter((item) => !item.permission || codes.includes(item.permission)) }))
    .filter((group) => group.path || group.children.length)
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
