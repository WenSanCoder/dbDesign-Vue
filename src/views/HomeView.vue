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
          <div class="profile-heading-main">
            <h2 class="section-title">{{ profileName }}</h2>
            <p class="profile-tip">{{ profileRoleText }}</p>
          </div>
          <el-tooltip content="编辑个人信息" placement="top">
            <el-button class="profile-edit-button" circle :icon="Edit" aria-label="编辑个人信息" @click="openProfileDialog" />
          </el-tooltip>
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item v-for="item in details" :key="item.label" :label="item.label">
            {{ item.value || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="plain-panel">
        <h2 class="section-title">公告通知</h2>
        <el-table :data="notices" border height="260" class="notice-table" @row-click="openNotice">
          <el-table-column label="标题" min-width="180">
            <template #default="{ row }">
              <span :class="{ 'important-notice-title': isImportantNotice(row) }">{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="发布时间" width="180" />
        </el-table>
      </section>

      <section v-if="isStudent" class="plain-panel class-notice-panel">
        <div class="class-notice-heading">
          <h2 class="section-title">教学班通知</h2>
          <span v-if="unreadClassNoticeCount" class="unread-summary">{{ unreadClassNoticeCount }} 条未读</span>
        </div>
        <el-table
          :data="classNotices"
          border
          height="280"
          class="notice-table"
          v-loading="classNoticeLoading"
          empty-text="暂无教学班通知"
          @row-click="openClassNotice"
        >
          <el-table-column label="状态" width="78">
            <template #default="{ row }">
              <el-tag v-if="!row.read_flag" type="danger" size="small">未读</el-tag>
              <span v-else class="read-status">已读</span>
            </template>
          </el-table-column>
          <el-table-column label="标题" min-width="240">
            <template #default="{ row }">
              <span :class="{ 'important-notice-title': isImportantNotice(row) }">{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="publisher_name" label="发布教师" width="130" />
          <el-table-column prop="created_at" label="发布时间" width="180" />
        </el-table>
      </section>
    </div>

    <el-dialog v-model="noticeDialogVisible" :title="selectedNotice?.title || '公告详情'" width="680px">
      <div v-if="selectedNotice" class="notice-detail">
        <div class="notice-meta">
          <span v-if="selectedNotice.publisher_name">发布人：{{ selectedNotice.publisher_name }}</span>
          <span>{{ selectedNotice.created_at || '-' }}</span>
        </div>
        <div class="notice-content">
          {{ selectedNotice.content || '-' }}
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="noticeDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="profileDialogVisible" title="修改个人信息" width="520px" destroy-on-close>
      <el-tabs v-model="profileTab">
        <el-tab-pane label="基本信息" name="basic">
          <div class="profile-editor-avatar">
            <AvatarUploader
              :model-value="profileAvatarPath"
              :user-id="session.user?.user_id"
              :display-name="session.user?.display_name || session.user?.username"
              :size="96"
              @uploaded="handleEditorAvatarUploaded"
            />
            <span>点击头像可裁剪并上传新头像</span>
          </div>
          <el-form label-width="90px">
            <el-form-item label="用户名"><el-input :model-value="session.user?.username" disabled /></el-form-item>
            <el-form-item label="联系方式"><el-input v-model="profileForm.phone" maxlength="30" placeholder="请输入联系电话" /></el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="修改密码" name="password">
          <el-form label-width="100px">
            <el-form-item label="原密码"><el-input v-model="profileForm.oldPassword" type="password" show-password autocomplete="current-password" /></el-form-item>
            <el-form-item label="新密码"><el-input v-model="profileForm.newPassword" type="password" show-password autocomplete="new-password" /></el-form-item>
            <el-form-item label="确认新密码"><el-input v-model="profileForm.confirmPassword" type="password" show-password autocomplete="new-password" /></el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="profileDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="profileSaving" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit } from '@element-plus/icons-vue'
import { apiGet, apiPost, apiPut } from '../api/http'
import { useSessionStore } from '../stores/session'
import AvatarUploader from '../components/AvatarUploader.vue'

const session = useSessionStore()
const data = ref<Record<string, any>>({})
const noticeDialogVisible = ref(false)
const profileDialogVisible = ref(false)
const profileSaving = ref(false)
const classNoticeLoading = ref(false)
const profileTab = ref('basic')
const profileAvatarPath = ref('')
const profileForm = reactive({ phone: '', oldPassword: '', newPassword: '', confirmPassword: '' })
const selectedNotice = ref<Record<string, any> | null>(null)
const classNotices = ref<Record<string, any>[]>([])
const isTeacher = computed(() => session.user?.role_code === 'TEACHER')
const isStudent = computed(() => session.user?.role_code === 'STUDENT')
const isManagementUser = computed(() => !isTeacher.value && !isStudent.value)
const notices = computed(() => data.value.notices || [])
const unreadClassNoticeCount = computed(() => classNotices.value.filter((row) => !row.read_flag).length)
const noticeCacheKey = computed(() => `dashboard_notices_${session.user?.role_code || 'guest'}`)
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
  const gradeYear = profile.grade_year ? `${profile.grade_year}级` : ''

  if (isManagementUser.value) {
    return session.user?.assigned_roles?.[0]?.role_name || session.user?.role_code || '管理用户'
  }

  if (isTeacher.value) {
    return [collegeName, '教师'].filter(Boolean).join(' ')
  }

  return [collegeName, majorName, gradeYear, className ? `${className}学生` : '学生'].filter(Boolean).join(' ')
})

const details = computed(() => {
  const term = data.value.term || {}
  const profile = data.value.profile || {}

  if (isManagementUser.value) {
    return [
      { label: '用户名', value: session.user?.username },
      { label: '当前学年', value: term.academic_year },
      { label: '当前学期', value: term.semester },
      { label: '联系电话', value: data.value.contact_phone || profile.phone || '0571-88880001' }
    ]
  }

  if (isTeacher.value) {
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
    { label: '入学年级', value: profile.grade_year ? `${profile.grade_year}级` : '' },
    { label: '行政班', value: profile.class_name },
    { label: '联系电话', value: profile.phone }
  ]
})

onMounted(() => {
  hydrateNoticeCache()
  void load()
})

async function load() {
  try {
    const role = session.user?.role_code
    let next: Record<string, any> = {}
    if (role === 'TEACHER') next = await apiGet('/dashboard/teacher', { teacherId: session.user?.related_id })
    else if (role === 'STUDENT') next = await apiGet('/dashboard/student', { studentId: session.user?.related_id })
    else next = await apiGet('/dashboard/admin')
    data.value = next
    persistNoticeCache(next.notices || [])
    if (role === 'STUDENT') void loadClassNotices()
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
}

function hydrateNoticeCache() {
  try {
    const raw = localStorage.getItem(noticeCacheKey.value)
    if (!raw) return
    const cached = JSON.parse(raw)
    if (Array.isArray(cached)) {
      data.value = {
        ...data.value,
        notices: cached
      }
    }
  } catch {
    // ignore broken local cache
  }
}

function persistNoticeCache(noticeRows: unknown[]) {
  try {
    localStorage.setItem(noticeCacheKey.value, JSON.stringify(noticeRows))
  } catch {
    // ignore storage failures
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

async function openProfileDialog() {
  if (!session.user?.user_id) return
  profileTab.value = 'basic'
  profileAvatarPath.value = avatarPath.value
  Object.assign(profileForm, { phone: '', oldPassword: '', newPassword: '', confirmPassword: '' })
  try {
    const contact = await apiGet<{ phone?: string }>(`/profile/${session.user.user_id}/contact`)
    profileForm.phone = contact.phone || ''
    profileDialogVisible.value = true
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
}

function handleEditorAvatarUploaded(path: string) {
  profileAvatarPath.value = path
  handleAvatarUploaded(path)
}

async function saveProfile() {
  const userId = session.user?.user_id
  if (!userId) return
  const changingPassword = profileTab.value === 'password'
  if (changingPassword) {
    if (!profileForm.oldPassword) {
      ElMessage.warning('请输入原密码')
      return
    }
    if (profileForm.newPassword.length < 6) {
      ElMessage.warning('新密码至少需要 6 位')
      return
    }
    if (profileForm.newPassword !== profileForm.confirmPassword) {
      ElMessage.warning('两次输入的新密码不一致')
      return
    }
  }
  profileSaving.value = true
  try {
    if (changingPassword) {
      await apiPost('/auth/change-password', {
        userId,
        oldPassword: profileForm.oldPassword,
        newPassword: profileForm.newPassword
      })
    } else {
      await apiPut(`/profile/${userId}/contact`, { phone: profileForm.phone })
      await load()
    }
    profileDialogVisible.value = false
    ElMessage.success(changingPassword ? '密码修改成功' : '个人信息已修改')
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    profileSaving.value = false
  }
}

function openNotice(row: Record<string, any>) {
  selectedNotice.value = row
  noticeDialogVisible.value = true
}

async function loadClassNotices() {
  const studentId = session.user?.related_id
  if (!studentId) return
  classNoticeLoading.value = true
  try {
    classNotices.value = await apiGet(`/governance/students/${studentId}/notices`)
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    classNoticeLoading.value = false
  }
}

function openClassNotice(row: Record<string, any>) {
  selectedNotice.value = row
  noticeDialogVisible.value = true
  if (row.read_flag) return
  row.read_flag = true
  const studentId = session.user?.related_id
  if (!studentId) return
  void apiPut(`/governance/students/${studentId}/notices/${row.notice_id}/read`).catch((error) => {
    row.read_flag = false
    ElMessage.error((error as Error).message)
  })
}

function isImportantNotice(row: Record<string, any> | null) {
  return row?.notice_type === 'important'
}
</script>

<style scoped>
.home-layout {
  display: grid;
  grid-template-columns: minmax(300px, 420px) minmax(420px, 1fr);
  gap: 14px;
  align-items: stretch;
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

.profile-heading-main {
  min-width: 0;
  flex: 1;
}

.profile-edit-button {
  flex: 0 0 auto;
}

.profile-editor-avatar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 4px 0 20px;
  color: #606266;
  font-size: 13px;
}

.notice-table :deep(.el-table__row) {
  cursor: pointer;
}

.class-notice-panel {
  grid-column: 1 / -1;
}

.class-notice-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
}

.unread-summary {
  color: #f56c6c;
  font-size: 13px;
}

.read-status {
  color: #909399;
  font-size: 13px;
}

.notice-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  color: #606266;
  font-size: 13px;
}

.notice-content {
  min-height: 120px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.important-notice-title {
  font-weight: 700;
}

@media (max-width: 900px) {
  .home-layout {
    grid-template-columns: 1fr;
  }
}
</style>
