<template>
  <div class="page">
    <h1 class="page-title">我的教学班</h1>
    <section class="plain-panel">
      <el-table :data="rows" border v-loading="loading">
        <el-table-column prop="class_code" label="教学班编号" width="130" />
        <el-table-column prop="class_name" label="教学班名称" min-width="160" />
        <el-table-column prop="course_name" label="课程" min-width="150" />
        <el-table-column prop="credit" label="学分" width="80" />
        <el-table-column prop="schedule_text" label="上课安排" min-width="220" />
        <el-table-column label="容量" width="110">
          <template #default="{ row }">{{ row.selected_count }} / {{ row.capacity }}</template>
        </el-table-column>
        <el-table-column label="操作" width="310" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="showStudents(row)">学生名单</el-button>
            <el-button size="small" type="primary" @click="goGrades(row)">成绩录入</el-button>
            <el-button size="small" type="success" :icon="Bell" @click="openNoticeDialog(row)">发通知</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="studentDialog" title="学生名单" width="920px">
      <div class="dialog-toolbar">
        <el-input
          v-model="studentKeyword"
          clearable
          placeholder="按姓名或学号检索"
          style="width: 260px"
          @keyup.enter="searchStudents"
          @clear="searchStudents"
        />
        <el-button type="primary" @click="searchStudents">查询</el-button>
      </div>
      <el-table :data="students" border v-loading="studentLoading">
        <el-table-column prop="student_no" label="学号" width="120" />
        <el-table-column prop="student_name" label="姓名" width="100" />
        <el-table-column label="性别" width="80">
          <template #default="{ row }">{{ genderText(row.gender) }}</template>
        </el-table-column>
        <el-table-column prop="college_name" label="学院" min-width="160" />
        <el-table-column prop="major_name" label="专业" min-width="150" />
        <el-table-column prop="admin_class_name" label="行政班" width="120" />
        <el-table-column prop="selected_at" label="选课时间" width="180" />
      </el-table>
      <div class="pagination-row">
        <el-pagination
          v-model:current-page="studentPage"
          v-model:page-size="studentPageSize"
          :total="studentTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadStudents"
          @current-change="loadStudents"
        />
      </div>
    </el-dialog>

    <el-dialog v-model="noticeDialog" title="发布教学班通知" width="620px" destroy-on-close>
      <el-form label-width="88px">
        <el-form-item label="教学班">
          <el-input :model-value="noticeTarget?.class_name || '-'" disabled />
        </el-form-item>
        <el-form-item label="通知级别" required>
          <el-radio-group v-model="noticeForm.noticeType">
            <el-radio-button value="normal">普通</el-radio-button>
            <el-radio-button value="important">重要</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="noticeForm.title" maxlength="200" show-word-limit placeholder="请输入通知标题" />
        </el-form-item>
        <el-form-item label="正文" required>
          <el-input
            v-model="noticeForm.content"
            type="textarea"
            :rows="7"
            maxlength="2000"
            show-word-limit
            resize="vertical"
            placeholder="请输入面向全班学生的通知内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="noticeDialog = false">取消</el-button>
        <el-button type="primary" :loading="noticePublishing" @click="publishNotice">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Bell } from '@element-plus/icons-vue'
import { apiGet, apiPost } from '../../api/http'
import { useSessionStore } from '../../stores/session'

const session = useSessionStore()
const router = useRouter()
const rows = ref<any[]>([])
const students = ref<any[]>([])
const loading = ref(false)
const studentLoading = ref(false)
const studentDialog = ref(false)
const currentStudentClassId = ref<number | null>(null)
const studentKeyword = ref('')
const studentPage = ref(1)
const studentPageSize = ref(10)
const studentTotal = ref(0)
const noticeDialog = ref(false)
const noticePublishing = ref(false)
const noticeTarget = ref<any | null>(null)
const noticeForm = reactive({ noticeType: 'normal', title: '', content: '' })
const teacherId = session.user?.related_id || 1

onMounted(load)

async function load() {
  loading.value = true
  try {
    rows.value = await apiGet(`/teacher/${teacherId}/classes`)
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    loading.value = false
  }
}

async function showStudents(row: any) {
  currentStudentClassId.value = Number(row.teaching_class_id)
  studentKeyword.value = ''
  studentPage.value = 1
  studentDialog.value = true
  await loadStudents()
}

async function searchStudents() {
  studentPage.value = 1
  await loadStudents()
}

async function loadStudents() {
  if (!currentStudentClassId.value) return
  studentLoading.value = true
  try {
    const page = await apiGet<any>(`/teacher/${teacherId}/classes/${currentStudentClassId.value}/students`, {
      keyword: studentKeyword.value || undefined,
      page: studentPage.value,
      pageSize: studentPageSize.value
    })
    students.value = page.records || []
    studentTotal.value = Number(page.total || 0)
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    studentLoading.value = false
  }
}

function goGrades(row: any) {
  router.push({ path: '/teacher/grades', query: { classId: row.teaching_class_id } })
}

function openNoticeDialog(row: any) {
  noticeTarget.value = row
  Object.assign(noticeForm, { noticeType: 'normal', title: '', content: '' })
  noticeDialog.value = true
}

async function publishNotice() {
  const teachingClassId = Number(noticeTarget.value?.teaching_class_id)
  if (!teachingClassId) return
  if (!noticeForm.title.trim()) {
    ElMessage.warning('请输入通知标题')
    return
  }
  if (!noticeForm.content.trim()) {
    ElMessage.warning('请输入通知正文')
    return
  }
  noticePublishing.value = true
  try {
    await apiPost(`/governance/teachers/${teacherId}/classes/${teachingClassId}/notices`, {
      noticeType: noticeForm.noticeType,
      title: noticeForm.title.trim(),
      content: noticeForm.content.trim()
    })
    noticeDialog.value = false
    ElMessage.success('通知已发送给全班学生')
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    noticePublishing.value = false
  }
}

function genderText(value: string) {
  if (value === 'male') return '男'
  if (value === 'female') return '女'
  return value || '-'
}
</script>

<style scoped>
.dialog-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
