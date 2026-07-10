<template>
  <div class="page">
    <h1 class="page-title">培养计划查询</h1>

    <section class="plain-panel">
      <div class="filter-row">
        <el-select v-model="filters.academicYear" placeholder="全部学年" clearable filterable style="width: 160px" @change="load">
          <el-option v-for="year in academicYears" :key="year" :label="year" :value="year" />
        </el-select>
        <el-select v-model="filters.semester" placeholder="全部学期" clearable style="width: 120px" @change="load">
          <el-option label="第1学期" :value="1" />
          <el-option label="第2学期" :value="2" />
          <el-option label="第3学期" :value="3" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
    </section>

    <section class="plain-panel" v-loading="loading">
      <el-empty v-if="!groupedPlans.length && !loading" description="无相关数据" />

      <div v-for="group in groupedPlans" :key="group.type" class="plan-group">
        <div class="plan-group-title">
          <span>{{ courseTypeText(group.type) }}</span>
          <el-tag size="small" type="info">{{ group.rows.length }} 门课程</el-tag>
        </div>
        <el-table :data="group.rows" border empty-text="无相关数据">
          <el-table-column prop="academic_year" label="学年" width="120" />
          <el-table-column prop="semester" label="学期" width="80" />
          <el-table-column prop="course_code" label="课程代码" width="120" />
          <el-table-column prop="course_name" label="课程名称" min-width="180" />
          <el-table-column prop="credit" label="学分" width="80" />
          <el-table-column prop="hours" label="学时" width="80" />
          <el-table-column label="考核方式" width="100">
            <template #default="{ row }">{{ examTypeText(row.exam_type) }}</template>
          </el-table-column>
        </el-table>
      </div>
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
  { label: '通识必修课程', value: 'general_required' },
  { label: '通识选修课程', value: 'general_elective' },
  { label: '学科基础必修课程', value: 'discipline_required' },
  { label: '学科基础选修课程', value: 'discipline_elective' },
  { label: '专业必修课程', value: 'major_required' },
  { label: '专业选修课程', value: 'major_elective' },
  { label: '实践环节', value: 'practice' }
]

const courseTypeOrder = courseTypeOptions.map((item) => item.value)
const session = useSessionStore()
const rows = ref<any[]>([])
const terms = ref<any[]>([])
const loading = ref(false)
const filters = reactive({
  academicYear: '',
  semester: undefined as number | undefined
})

const academicYears = computed(() => {
  const years = terms.value
    .map((item) => normalizeAcademicYear(item.academic_year))
    .filter(Boolean)
  return Array.from(new Set(years)).sort(compareAcademicYearDesc)
})

const groupedPlans = computed(() => {
  const map = new Map<string, any[]>()
  rows.value.forEach((row) => {
    const type = row.course_type || 'catalog'
    if (!map.has(type)) map.set(type, [])
    map.get(type)?.push(row)
  })
  return Array.from(map.entries())
    .map(([type, groupRows]) => ({ type, rows: groupRows }))
    .sort((a, b) => courseTypeRank(a.type) - courseTypeRank(b.type))
})

onMounted(async () => {
  await loadLookups()
  await load()
})

async function loadLookups() {
  try {
    const data = await apiGet<any[]>(`/student/${session.user?.related_id || 1}/training-plan/terms`)
    terms.value = data.map((item) => ({
      ...item,
      academic_year: normalizeAcademicYear(item.academic_year)
    }))
  } catch {
    terms.value = []
  }
}

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.academicYear) params.set('academicYear', filters.academicYear)
    if (filters.semester) params.set('semester', String(filters.semester))
    const query = params.toString()
    const data = await apiGet<any[]>(`/student/${session.user?.related_id || 1}/training-plan${query ? `?${query}` : ''}`)
    rows.value = data.map((item) => ({
      ...item,
      academic_year: normalizeAcademicYear(item.academic_year)
    }))
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    loading.value = false
  }
}

async function resetFilters() {
  filters.academicYear = ''
  filters.semester = undefined
  await load()
}

function courseTypeText(value: string) {
  return courseTypeOptions.find((item) => item.value === value)?.label || value || '-'
}

function courseTypeRank(value: string) {
  const index = courseTypeOrder.indexOf(value)
  return index >= 0 ? index : 999
}

function examTypeText(value: string) {
  if (value === 'exam') return '考试'
  if (value === 'check') return '考查'
  return value || '-'
}

function normalizeAcademicYear(value: unknown) {
  const text = String(value || '').trim()
  const years = text.match(/\d{4}/g)
  if (years && years.length >= 2) return `${years[0]}/${years[1]}`
  return text.replace(/\s+/g, '')
}

function compareAcademicYearDesc(a: string, b: string) {
  return academicYearStart(b) - academicYearStart(a)
}

function academicYearStart(value: string) {
  const match = value.match(/\d{4}/)
  return match ? Number(match[0]) : 0
}
</script>

<style scoped>
.plan-group {
  margin-bottom: 18px;
}

.plan-group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-bottom: 0;
  background: #f7f9fb;
  font-weight: 600;
}
</style>
