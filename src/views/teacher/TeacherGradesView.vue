<template>
  <div class="page">
    <h1 class="page-title">成绩录入</h1>
    <section class="plain-panel">
      <div class="filter-row">
        <span>学年</span>
        <el-select v-model="filters.academicYear" placeholder="学年" clearable filterable style="width: 150px" @change="onTermFilterChange">
          <el-option v-for="year in academicYears" :key="year" :label="year" :value="year" />
        </el-select>
        <span>学期</span>
        <el-select v-model="filters.semester" placeholder="学期" clearable style="width: 110px" @change="onTermFilterChange">
          <el-option label="第1学期" :value="1" />
          <el-option label="第2学期" :value="2" />
          <el-option label="第3学期" :value="3" />
        </el-select>
        <span>教学班</span>
        <el-select v-model="selectedClassId" placeholder="请选择教学班" style="width: 280px" @change="onClassChange">
          <el-option v-for="item in classes" :key="item.teaching_class_id" :label="classLabel(item)" :value="item.teaching_class_id" />
        </el-select>
        <el-button type="primary" :disabled="!selectedClassId || gradeLocked" @click="save(false)">保存草稿</el-button>
        <el-button type="success" :disabled="!selectedClassId || gradeLocked" @click="save(true)">提交审批</el-button>
        <el-button :disabled="!selectedClassId" @click="loadStats">成绩统计</el-button>
        <el-tag v-if="selectedClass?.grade_batch_status" :type="batchStatusType(selectedClass.grade_batch_status)">{{ batchStatusLabel(selectedClass.grade_batch_status) }}</el-tag>
      </div>
      <div class="weight-row">
        <span>成绩占比</span>
        <el-input-number v-model="usualWeight" :min="0" :max="100" :step="5" controls-position="right" :disabled="gradeLocked" @change="syncExamWeight" />
        <span>平时分 %</span>
        <el-input-number v-model="examWeight" :min="0" :max="100" :step="5" controls-position="right" :disabled="gradeLocked" @change="syncUsualWeight" />
        <span>考试分 %</span>
        <el-tag :type="weightValid ? 'success' : 'danger'">合计 {{ weightTotal }}%</el-tag>
      </div>
    </section>
    <section class="plain-panel">
      <div class="grade-toolbar">
        <el-input
          v-model="gradeKeyword"
          clearable
          placeholder="按姓名或学号检索"
          style="width: 260px"
          @keyup.enter="searchGrades"
          @clear="searchGrades"
        />
        <el-button type="primary" :disabled="!selectedClassId" @click="searchGrades">查询</el-button>
      </div>
      <el-table :data="grades" border v-loading="gradeLoading">
        <el-table-column prop="student_no" label="学号" width="120" />
        <el-table-column prop="student_name" label="姓名" width="100" />
        <el-table-column prop="admin_class_name" label="行政班" width="120" />
        <el-table-column label="平时分" width="150">
          <template #default="{ row }"><el-input v-model="row.usual_score" inputmode="decimal" placeholder="请输入" :disabled="gradeLocked" /></template>
        </el-table-column>
        <el-table-column label="考试分" width="150">
          <template #default="{ row }"><el-input v-model="row.exam_score" inputmode="decimal" placeholder="请输入" :disabled="gradeLocked" /></template>
        </el-table-column>
        <el-table-column label="总评" width="100">
          <template #default="{ row }">{{ calcFinal(row) }}</template>
        </el-table-column>
        <el-table-column prop="grade_point" label="绩点" width="90" />
        <el-table-column label="备注" min-width="150">
          <template #default="{ row }"><el-input v-model="row.remark" placeholder="请输入" :disabled="gradeLocked" /></template>
        </el-table-column>
      </el-table>
      <div class="pagination-row">
        <el-pagination
          v-model:current-page="gradePage"
          v-model:page-size="gradePageSize"
          :total="gradeTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadGrades"
          @current-change="loadGrades"
        />
      </div>
    </section>

    <section v-if="stats" class="plain-panel">
      <h2 class="section-title">成绩统计</h2>
      <div class="metric-grid">
        <div class="metric-item"><div class="metric-label">参考人数</div><div class="metric-value">{{ stats.overview.grade_count || 0 }}</div></div>
        <div class="metric-item"><div class="metric-label">平均分</div><div class="metric-value">{{ stats.overview.avg_score || '-' }}</div></div>
        <div class="metric-item"><div class="metric-label">最高分</div><div class="metric-value">{{ stats.overview.max_score || '-' }}</div></div>
        <div class="metric-item"><div class="metric-label">及格率</div><div class="metric-value">{{ stats.overview.pass_rate || 0 }}%</div></div>
      </div>
      <el-table :data="stats.ranking" border style="margin-top: 14px">
        <el-table-column prop="rank_no" label="排名" width="80" />
        <el-table-column prop="student_no" label="学号" width="120" />
        <el-table-column prop="student_name" label="姓名" width="100" />
        <el-table-column prop="class_name" label="行政班" width="120" />
        <el-table-column prop="final_score" label="总评" width="100" />
        <el-table-column prop="grade_point" label="绩点" width="100" />
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiGet, apiPost } from '../../api/http'
import { useSessionStore } from '../../stores/session'

const session = useSessionStore()
const route = useRoute()
const teacherId = session.user?.related_id || 1
const classes = ref<any[]>([])
const grades = ref<any[]>([])
const terms = ref<any[]>([])
const selectedClassId = ref<number | null>(route.query.classId ? Number(route.query.classId) : null)
const stats = ref<any>(null)
const usualWeight = ref(30)
const examWeight = ref(70)
const gradeLoading = ref(false)
const gradeKeyword = ref('')
const gradePage = ref(1)
const gradePageSize = ref(10)
const gradeTotal = ref(0)
const filters = reactive({
  academicYear: '',
  semester: undefined as number | undefined
})

const academicYears = computed(() => Array.from(new Set(terms.value.map((item) => item.academic_year))).filter(Boolean))
const selectedClass = computed(() => classes.value.find((item) => item.teaching_class_id === selectedClassId.value))
const gradeLocked = computed(() => ['submitted', 'approved'].includes(selectedClass.value?.grade_batch_status))

onMounted(async () => {
  await loadLookups()
  await loadClasses()
  if (selectedClassId.value) await loadGrades()
})

async function loadLookups() {
  try {
    const lookups = await apiGet<Record<string, any[]>>('/lookups')
    terms.value = lookups.terms || []
    applyCurrentTermFilters()
  } catch {
    terms.value = []
  }
}

async function loadClasses() {
  try {
    const params: Record<string, unknown> = {}
    if (filters.academicYear) params.academicYear = filters.academicYear
    if (filters.semester) params.semester = filters.semester
    classes.value = await apiGet(`/teacher/${teacherId}/classes`, params)
    if (!selectedClassId.value && classes.value.length) selectedClassId.value = classes.value[0].teaching_class_id
    if (selectedClassId.value) await loadGrades()
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
}

async function onTermFilterChange() {
  selectedClassId.value = null
  grades.value = []
  stats.value = null
  gradeKeyword.value = ''
  gradePage.value = 1
  gradeTotal.value = 0
  await loadClasses()
}

async function onClassChange() {
  gradePage.value = 1
  grades.value = []
  stats.value = null
  await loadGrades()
}

function classLabel(item: any) {
  const term = item.academic_year && item.semester ? `${item.academic_year}-${item.semester}` : ''
  return [item.course_name, term, item.class_name].filter(Boolean).join(' - ')
}

function applyCurrentTermFilters() {
  const current = inferCurrentTerm(terms.value)
  filters.academicYear = current?.academic_year || ''
  filters.semester = current ? Number(current.semester) : undefined
}

function inferCurrentTerm(list: any[]) {
  const today = getUtc8Today()
  const byDate = list.find((item) => {
    const start = parseDate(item.start_date)
    const end = parseDate(item.end_date)
    return start && end && today >= start && today <= end
  })
  return byDate || list.find((item) => item.is_current) || list[0]
}

function getUtc8Today() {
  const now = new Date()
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60_000
  const utc8 = new Date(utcTime + 8 * 60 * 60_000)
  utc8.setHours(0, 0, 0, 0)
  return utc8
}

function parseDate(value: string | undefined) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

async function loadGrades() {
  if (!selectedClassId.value) return
  gradeLoading.value = true
  try {
    const page = await apiGet<any>(`/teacher/${teacherId}/classes/${selectedClassId.value}/grades`, {
      keyword: gradeKeyword.value || undefined,
      page: gradePage.value,
      pageSize: gradePageSize.value
    })
    grades.value = page.records || []
    gradeTotal.value = Number(page.total || 0)
    const firstGrade = grades.value.find((row) => row.usual_weight !== undefined && row.exam_weight !== undefined)
    usualWeight.value = Number(firstGrade?.usual_weight ?? 30)
    examWeight.value = Number(firstGrade?.exam_weight ?? 70)
    stats.value = null
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    gradeLoading.value = false
  }
}

async function searchGrades() {
  gradePage.value = 1
  await loadGrades()
}

const weightTotal = computed(() => Number(usualWeight.value || 0) + Number(examWeight.value || 0))
const weightValid = computed(() => Math.abs(weightTotal.value - 100) < 0.001)

function syncExamWeight() {
  examWeight.value = 100 - Number(usualWeight.value || 0)
}

function syncUsualWeight() {
  usualWeight.value = 100 - Number(examWeight.value || 0)
}

function calcFinal(row: any) {
  if (row.usual_score === '' || row.usual_score === null || row.usual_score === undefined) return '-'
  if (row.exam_score === '' || row.exam_score === null || row.exam_score === undefined) return '-'
  const usual = Number(row.usual_score ?? 0)
  const exam = Number(row.exam_score ?? 0)
  return (usual * Number(usualWeight.value || 0) / 100 + exam * Number(examWeight.value || 0) / 100).toFixed(2)
}

async function save(submit: boolean) {
  if (!selectedClassId.value) return
  try {
    if (!weightValid.value) {
      ElMessage.error('平时分和考试分占比之和必须为 100%')
      return
    }
    if (submit) await ElMessageBox.confirm('提交后进入管理员审批，审批通过前学生不可查询且成绩暂不计入学分。确定提交吗？', '提交确认', { type: 'warning' })
    const body = {
      grades: grades.value.map((row) => ({
        selectionId: row.selection_id,
        usualScore: row.usual_score === '' ? null : Number(row.usual_score),
        examScore: row.exam_score === '' ? null : Number(row.exam_score),
        usualWeight: Number(usualWeight.value || 0),
        examWeight: Number(examWeight.value || 0),
        remark: row.remark
      }))
    }
    const url = submit
      ? `/teacher/${teacherId}/classes/${selectedClassId.value}/grades/submit`
      : `/teacher/${teacherId}/classes/${selectedClassId.value}/grades`
    await apiPost(url, body)
    ElMessage.success(submit ? '成绩已提交审批' : '草稿已保存')
    if (submit) await loadClasses(); else await loadGrades()
  } catch (error) {
    if (error instanceof Error) ElMessage.error(error.message)
  }
}
function batchStatusLabel(value:string) { return ({ submitted:'待审批', approved:'已通过并锁定', returned:'已退回修改', cancelled:'已取消' } as Record<string,string>)[value] || value }
function batchStatusType(value:string) { return value === 'approved' ? 'success' : value === 'submitted' ? 'warning' : value === 'returned' ? 'danger' : 'info' }

async function loadStats() {
  if (!selectedClassId.value) return
  try {
    stats.value = await apiGet(`/teacher/${teacherId}/classes/${selectedClassId.value}/grade-statistics`)
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
}
</script>

<style scoped>
.section-title {
  margin: 0 0 12px;
  font-size: 16px;
}

.weight-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  color: #606266;
}

.grade-toolbar {
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
