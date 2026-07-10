<template>
  <div class="page">
    <h1 class="page-title">我的课表</h1>

    <section class="plain-panel no-print">
      <div class="filter-row schedule-filter">
        <el-select v-model="academicYear" placeholder="学年" filterable style="width: 180px" @change="load">
          <el-option v-for="year in academicYears" :key="year" :label="year" :value="year" />
        </el-select>
        <el-select v-model="semester" placeholder="学期" style="width: 120px" @change="load">
          <el-option :label="'第1学期'" :value="1" />
          <el-option :label="'第2学期'" :value="2" />
          <el-option :label="'第3学期'" :value="3" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button @click="exportPdf">导出PDF</el-button>
      </div>
    </section>

    <section class="plain-panel">
      <div class="schedule-title">
        {{ displayName }}（{{ academicYear || '-' }}-{{ semester || '-' }}）课表
      </div>

      <div class="schedule-scroll">
        <div class="schedule-board">
          <div class="schedule-cell schedule-head schedule-grid-item" :style="gridStyle(1, 1)">节次</div>
          <div class="schedule-cell schedule-head schedule-grid-item" :style="gridStyle(2, 1)">时间</div>
          <div v-for="(day, index) in days" :key="day" class="schedule-cell schedule-head schedule-grid-item" :style="gridStyle(index + 3, 1)">
            {{ day }}
          </div>

          <template v-for="period in periodSlots" :key="period.period_no">
            <div class="schedule-cell schedule-head period-no schedule-grid-item" :style="gridStyle(1, period.period_no + 1)">
              第{{ period.period_no }}节
            </div>
            <div class="schedule-cell schedule-head period-time schedule-grid-item" :style="gridStyle(2, period.period_no + 1)">
              {{ period.start }}-{{ period.end }}
            </div>
            <div
              v-for="dayNo in 7"
              :key="`${period.period_no}-${dayNo}`"
              class="schedule-cell schedule-empty-cell schedule-grid-item"
              :style="gridStyle(dayNo + 2, period.period_no + 1)"
            />
          </template>

          <div
            v-for="(item, index) in scheduleBlocks"
            :key="scheduleBlockKey(item, index)"
            class="schedule-course-block"
            :style="courseBlockStyle(item)"
          >
            <strong>{{ item.course_name }}</strong>
            <span>{{ item.teaching_class_name }}</span>
            <span>{{ item.teacher_name }} {{ item.classroom }}</span>
            <span>{{ item.week_text || item.weeks || `${item.start_week || 1}-${item.end_week || 16}周` }}</span>
            <span>第{{ item.start_period }}-{{ item.end_period }}节</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { apiGet } from '../../api/http'
import { useSessionStore } from '../../stores/session'

const session = useSessionStore()
const rows = ref<any[]>([])
const terms = ref<any[]>([])
const academicYear = ref('')
const semester = ref<number | null>(null)
const days = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
const periodSlots = [
  { period_no: 1, start: '08:00', end: '08:45' },
  { period_no: 2, start: '08:55', end: '09:40' },
  { period_no: 3, start: '09:55', end: '10:40' },
  { period_no: 4, start: '10:50', end: '11:35' },
  { period_no: 5, start: '11:45', end: '12:30' },
  { period_no: 6, start: '13:30', end: '14:15' },
  { period_no: 7, start: '14:25', end: '15:10' },
  { period_no: 8, start: '15:25', end: '16:10' },
  { period_no: 9, start: '16:20', end: '17:05' },
  { period_no: 10, start: '18:30', end: '19:15' },
  { period_no: 11, start: '19:25', end: '20:10' },
  { period_no: 12, start: '20:25', end: '21:10' }
]

const displayName = computed(() => session.user?.display_name || session.user?.username || '学生')
const academicYears = computed(() => Array.from(new Set(terms.value.map((item) => item.academic_year))).filter(Boolean))

const scheduleBlocks = computed(() => {
  const seen = new Set<string>()
  return rows.value.filter((item) => {
    const key = [
      item.teaching_class_id,
      item.weekday,
      item.start_period,
      item.end_period,
      item.start_week,
      item.end_week,
      item.week_pattern,
      item.classroom
    ].join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return Number(item.weekday) >= 1 && Number(item.weekday) <= 7
  })
})

onMounted(async () => {
  await loadTerms()
  await load()
})

async function loadTerms() {
  try {
    const lookups = await apiGet<Record<string, any[]>>('/lookups')
    terms.value = lookups.terms || []
    const current = inferCurrentTerm(terms.value)
    if (current) {
      academicYear.value = current.academic_year
      semester.value = Number(current.semester)
    }
  } catch {
    terms.value = []
  }
}

async function load() {
  try {
    const params = new URLSearchParams()
    if (academicYear.value) params.set('academicYear', academicYear.value)
    if (semester.value) params.set('semester', String(semester.value))
    const query = params.toString()
    rows.value = await apiGet(`/student/${session.user?.related_id || 1}/schedule${query ? `?${query}` : ''}`)
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
}

function inferCurrentTerm(list: any[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const byDate = list.find((item) => {
    const start = parseDate(item.start_date)
    const end = parseDate(item.end_date)
    return start && end && today >= start && today <= end
  })
  return byDate || list.find((item) => item.is_current) || list[0]
}

function parseDate(value: string | undefined) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function gridStyle(column: number, row: number) {
  return {
    gridColumn: String(column),
    gridRow: String(row)
  }
}

function courseBlockStyle(item: any) {
  const startPeriod = clampPeriod(Number(item.start_period))
  const endPeriod = clampPeriod(Number(item.end_period))
  const rowStart = Math.min(startPeriod, endPeriod) + 1
  const rowEnd = Math.max(startPeriod, endPeriod) + 2
  return {
    gridColumn: String(Number(item.weekday) + 2),
    gridRow: `${rowStart} / ${rowEnd}`
  }
}

function clampPeriod(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.min(12, Math.max(1, value))
}

function scheduleBlockKey(item: any, index: number) {
  return [
    item.teaching_class_id,
    item.weekday,
    item.start_period,
    item.end_period,
    item.start_week,
    item.end_week,
    item.week_pattern,
    item.classroom,
    index
  ].join('-')
}

function exportPdf() {
  window.print()
}
</script>

<style scoped>
.schedule-scroll {
  width: 100%;
  overflow-x: auto;
}

.schedule-board {
  display: grid;
  grid-template-columns: 72px 92px repeat(7, minmax(170px, 1fr));
  grid-template-rows: 46px repeat(12, 86px);
  min-width: 1360px;
  border-top: 1px solid #dcdfe6;
  border-left: 1px solid #dcdfe6;
  position: relative;
}

.schedule-grid-item {
  min-height: 0;
}

.schedule-empty-cell {
  background: #fff;
}

.schedule-course-block {
  z-index: 2;
  align-self: stretch;
  justify-self: stretch;
  margin: 7px;
  border-left: 3px solid #0b88cf;
  background: #f2f9fd;
  color: #1f2d3d;
  padding: 8px;
  line-height: 1.45;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  font-size: 13px;
}

.schedule-course-block strong {
  font-size: 13px;
}

@media print {
  .schedule-scroll {
    overflow: visible;
  }

  .schedule-board {
    min-width: 0;
    grid-template-columns: 54px 74px repeat(7, minmax(92px, 1fr));
    grid-template-rows: 36px repeat(12, 64px);
  }

  .schedule-course-block {
    margin: 4px;
    padding: 5px;
    font-size: 10px;
  }
}
</style>
