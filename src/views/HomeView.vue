<template>
  <div class="page">
    <h1 class="page-title">首页</h1>
    <div class="home-layout">
      <section class="plain-panel">
        <div class="profile-heading">
          <AvatarUploader
            :model-value="avatarPath"
            :user-id="session.user?.user_id"
            :display-name="session.user?.display_name || session.user?.username"
            @uploaded="handleAvatarUploaded"
          />
          <div>
            <h2 class="section-title">{{ profileName }}</h2>
            <p class="profile-tip">{{ profileRoleText }}</p>
          </div>
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item v-for="item in details" :key="item.label" :label="item.label">
            {{ item.value || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="plain-panel">
        <h2 class="section-title">公告通知</h2>
        <el-table :data="notices" border height="260">
          <el-table-column prop="title" label="标题" min-width="180" />
          <el-table-column prop="notice_type" label="类型" width="120" />
          <el-table-column prop="created_at" label="发布时间" width="180" />
        </el-table>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { apiGet } from '../api/http'
import { useSessionStore } from '../stores/session'
import AvatarUploader from '../components/AvatarUploader.vue'

const session = useSessionStore()
const data = ref<Record<string, any>>({})
const notices = computed(() => data.value.notices || [])
const avatarPath = computed(() => session.user?.avatar_path || data.value.profile?.avatar_path || '')
const profileName = computed(() => {
  const profile = data.value.profile || {}
  return session.user?.display_name || profile.teacher_name || profile.student_name || session.user?.username || '用户'
})
const profileRoleText = computed(() => {
  const profile = data.value.profile || {}
  const collegeName = profile.college_name || ''
  const majorName = profile.major_name || ''
  const className = profile.class_name || ''

  if (session.user?.role_code === 'ADMIN') {
    return '教务管理员'
  }

  if (session.user?.role_code === 'TEACHER') {
    return [collegeName, '教师'].filter(Boolean).join(' ')
  }

  return [collegeName, majorName, className ? `${className}学生` : '学生'].filter(Boolean).join(' ')
})

const details = computed(() => {
  const term = data.value.term || {}
  const profile = data.value.profile || {}

  if (session.user?.role_code === 'ADMIN') {
    return [
      { label: '用户名', value: session.user?.username },
      { label: '当前学年', value: term.academic_year },
      { label: '当前学期', value: term.semester },
      { label: '联系电话', value: data.value.contact_phone || profile.phone || '0571-88880001' }
    ]
  }

  if (session.user?.role_code === 'TEACHER') {
    return [
      { label: '用户名', value: session.user?.username },
      { label: '姓名', value: session.user?.display_name },
      { label: '学院', value: profile.college_name },
      { label: '职称', value: profile.title },
      { label: '联系电话', value: profile.phone }
    ]
  }

  return [
    { label: '用户名', value: session.user?.username },
    { label: '姓名', value: session.user?.display_name },
    { label: '当前学年', value: term.academic_year },
    { label: '当前学期', value: term.semester },
    { label: '学院', value: profile.college_name },
    { label: '专业', value: profile.major_name },
    { label: '行政班', value: profile.class_name },
    { label: '联系电话', value: profile.phone }
  ]
})

onMounted(load)

async function load() {
  try {
    const role = session.user?.role_code
    if (role === 'ADMIN') data.value = await apiGet('/dashboard/admin')
    if (role === 'TEACHER') data.value = await apiGet('/dashboard/teacher', { teacherId: session.user?.related_id })
    if (role === 'STUDENT') data.value = await apiGet('/dashboard/student', { studentId: session.user?.related_id })
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
}

function handleAvatarUploaded(path: string) {
  session.updateAvatarPath(path)
  data.value = {
    ...data.value,
    profile: {
      ...(data.value.profile || {}),
      avatar_path: path
    }
  }
}
</script>

<style scoped>
.home-layout {
  display: grid;
  grid-template-columns: minmax(300px, 420px) minmax(420px, 1fr);
  gap: 14px;
  align-items: start;
}

.section-title {
  margin: 0 0 12px;
  font-size: 16px;
}

.profile-heading {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.profile-heading .section-title {
  margin-bottom: 6px;
}

.profile-tip {
  margin: 0;
  color: #606266;
  font-size: 13px;
}

@media (max-width: 900px) {
  .home-layout {
    grid-template-columns: 1fr;
  }
}
</style>
