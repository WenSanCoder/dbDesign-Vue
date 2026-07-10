<template>
  <div class="page">
    <h1 class="page-title">我的成绩</h1>

    <section class="plain-panel">
      <div class="filter-row">
        <el-select v-model="filters.academicYear" placeholder="学年" clearable filterable style="width: 160px" @change="load">
          <el-option v-for="year in academicYears" :key="year" :label="year" :value="year" />
        </el-select>
        <el-select v-model="filters.semester" placeholder="学期" clearable style="width: 120px" @change="load">
          <el-option label="第1学期" :value="1" />
          <el-option label="第2学期" :value="2" />
          <el-option label="第3学期" :value="3" />
        </el-select>
        <el-select v-model="filters.courseId" placeholder="课程" clearable filterable style="width: 220px" @change="load">
          <el-option v-for="course in courses" :key="course.course_id" :label="`${course.course_code} ${course.course_name}`" :value="course.course_id" />
        </el-select>
        <el-select v-model="filters.courseType" placeholder="课程类型" clearable style="width: 180px" @change="load">
          <el-option v-for="type in courseTypeOptions" :key="type.value" :label="type.label" :value="type.value" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
    </section>

    <section class="plain-panel">
      <el-table :data="rows" border v-loading="loading" empty-text="无相关数据">
        <el-table-column prop="academic_year" label="学年" width="120" />
        <el-table-column prop="semester" label="学期" width="80" />
        <el-table-column prop="course_code" label="课程代码" width="110" />
        <el-table-column prop="course_name" label="课程名称" min-width="150" />
        <el-table-column label="课程类型" width="140">
          <template #default="{ row }">{{ courseTypeText(row.course_type) }}</template>
        </el-table-column>
        <el-table-column prop="credit" label="学分" width="80" />
        <el-table-column prop="usual_score" label="平时分" width="90" />
        <el-table-column prop="exam_score" label="考试分" width="90" />
        <el-table-column prop="final_score" label="总评" width="90" />
        <el-table-column prop="grade_point" label="绩点" width="90" />
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { apiGet } from '../../api/http'
import { useSessionStore } from '../../stores/session'

const courseTypeOptions = [
  { label: '先修课程', value: 'prerequisite' },
  { label: '通识必修', value: 'general_required' },
  { label: '通识选修', value: 'general_elective' },
  { label: '学科基础必修', value: 'discipline_required' },
  { label: '学科基础选修', value: 'discipline_elective' },
  { label: '专业必修', value: 'major_required' },
  { label: '专业选修', value: 'major_elective' },
  { label: '实践环节', value: 'practice' }
]

const session = useSessionStore()
const rows = ref<any[]>([])
const terms = ref<any[]>([])
const courses = ref<any[]>([])
const loading = ref(false)
const filters = reactive({
  academicYear: '',
  semester: undefined as number | undefined,
  courseId: undefined as number | undefined,
  courseType: ''
})

const academicYears = computed(() => Array.from(new Set(terms.value.map((item) => item.academic_year))).filter(Boolean))

onMounted(async () => {
  await loadLookups()
  await load()
})

async function loadLookups() {
  try {
    const lookups = await apiGet<Record<string, any[]>>('/lookups')
    terms.value = lookups.terms || []
    courses.value = lookups.courses || []
    applyCurrentTermFilters()
  } catch {
    terms.value = []
    courses.value = []
  }
}

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.academicYear) params.set('academicYear', filters.academicYear)
    if (filters.semester) params.set('semester', String(filters.semester))
    if (filters.courseId) params.set('courseId', String(filters.courseId))
    if (filters.courseType) params.set('courseType', filters.courseType)
    const query = params.toString()
    rows.value = await apiGet(`/student/${session.user?.related_id || 1}/grades${query ? `?${query}` : ''}`)
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    loading.value = false
  }
}

async function resetFilters() {
  applyCurrentTermFilters()
  filters.courseId = undefined
  filters.courseType = ''
  await load()
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

function courseTypeText(value: string) {
  return courseTypeOptions.find((item) => item.value === value)?.label || value || '-'
}
</script>
