<template>
  <div class="page">
    <h1 class="page-title">抢课选课</h1>

    <section class="plain-panel" v-loading="loading">
      <el-alert
        v-if="roundInfo"
        class="round-alert"
        type="info"
        :closable="false"
        show-icon
        :title="`${roundInfo.academic_year} 第${roundInfo.semester}学期：${roundInfo.round_name}`"
      />

      <el-empty
        v-if="!courses.length && !loading"
        description="当前没有开放的抢课轮次，或本学期暂无可选课程"
      />

      <el-table
        v-else
        :data="courses"
        border
        row-key="course_id"
        class="course-table"
      >
        <el-table-column type="expand" width="46">
          <template #default="{ row: course }">
            <el-table :data="course.teachingClasses || []" border class="class-table">
              <el-table-column prop="class_code" label="教学班编号" width="120" />
              <el-table-column prop="class_name" label="教学班名称" min-width="190" />
              <el-table-column prop="teacher_name" label="任课教师" width="110" />
              <el-table-column label="上课安排" min-width="300">
                <template #default="{ row }">
                  <div v-if="row.schedules?.length" class="schedule-line">
                    {{ scheduleLine(row.schedules) }}
                  </div>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="容量" width="120">
                <template #default="{ row }">
                  {{ Number(row.selected_count || 0) }} / {{ Number(row.capacity || 0) }}
                </template>
              </el-table-column>
              <el-table-column label="候补" width="80">
                <template #default="{ row }">{{ Number(row.waitlist_count || 0) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="110" fixed="right">
                <template #default="{ row }">
                  <el-button
                    size="small"
                    :type="actionButtonType(course, row)"
                    :plain="isSelected(row)"
                    :disabled="actionDisabled(course, row)"
                    @click="handleAction(course, row)"
                  >
                    {{ actionText(course, row) }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </el-table-column>
        <el-table-column prop="course_code" label="课程代码" width="130" />
        <el-table-column prop="course_name" label="课程名称" min-width="220" />
        <el-table-column label="课程门类" width="150">
          <template #default="{ row }">{{ courseTypeText(row.course_type) }}</template>
        </el-table-column>
        <el-table-column prop="credit" label="学分" width="80" />
        <el-table-column prop="hours" label="学时" width="80" />
        <el-table-column label="教学班数" width="100">
          <template #default="{ row }">{{ row.teachingClasses?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="当前状态" width="180">
          <template #default="{ row }">
            <el-tag v-if="row.selected_course_teaching_class_id" type="success">
              已选 {{ row.selected_course_class_name || '' }}
            </el-tag>
            <el-tag v-else>可选</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiGet, apiPost } from '../../api/http'
import { useSessionStore } from '../../stores/session'

const session = useSessionStore()
const courses = ref<any[]>([])
const loading = ref(false)
const studentId = session.user?.related_id || 1
const weekdays = ['一', '二', '三', '四', '五', '六', '日']

const roundInfo = computed(() => {
  const first = courses.value[0]
  if (!first) return null
  return {
    round_name: first.round_name,
    academic_year: first.academic_year,
    semester: first.semester
  }
})

onMounted(load)

async function load() {
  loading.value = true
  try {
    courses.value = await apiGet<any[]>(`/student/${studentId}/available-courses`)
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    loading.value = false
  }
}

function isSelected(row: any) {
  return row.selection_status === 'selected'
}

function isProcessing(row: any) {
  return row.selection_status === 'processing'
}

function isWaiting(row: any) {
  return row.waitlist_status === 'waiting'
}

function selectedOtherClass(course: any, row: any) {
  const selectedClassId = Number(row.selected_course_teaching_class_id || course.selected_course_teaching_class_id || 0)
  return selectedClassId > 0 && selectedClassId !== Number(row.teaching_class_id)
}

function actionText(course: any, row: any) {
  if (isSelected(row)) return '退选'
  if (isProcessing(row)) return '处理中'
  if (isWaiting(row)) return '候补中'
  if (Number(row.remaining_count || 0) <= 0) return '候补'
  return '选课'
}

function actionButtonType(course: any, row: any) {
  if (isSelected(row)) return 'danger'
  if (isProcessing(row)) return 'info'
  if (isWaiting(row) || Number(row.remaining_count || 0) <= 0) return 'warning'
  return 'primary'
}

function actionDisabled(course: any, row: any) {
  return isProcessing(row) || isWaiting(row)
}

async function handleAction(course: any, row: any) {
  if (isSelected(row)) {
    await drop(row)
    return
  }
  if (selectedOtherClass(course, row)) {
    await ElMessageBox.alert(
      `你已选中 ${course.selected_course_class_name || '本课程其他教学班'}，如需改选请先退选原教学班。`,
      '需要先退选'
    )
    return
  }
  if (Number(row.remaining_count || 0) <= 0) {
    await waitlist(row)
    return
  }
  await select(row)
}

async function select(row: any) {
  try {
    await apiPost(`/student/${studentId}/select`, {
      teachingClassId: row.teaching_class_id,
      roundId: row.round_id
    })
    ElMessage.success('选课成功')
    await load()
  } catch (error) {
    await showBusinessError(error)
  }
}

async function waitlist(row: any) {
  try {
    await apiPost(`/student/${studentId}/waitlist`, {
      teachingClassId: row.teaching_class_id,
      roundId: row.round_id
    })
    ElMessage.success('已加入候补队列')
    await load()
  } catch (error) {
    await showBusinessError(error)
  }
}

async function drop(row: any) {
  try {
    await ElMessageBox.confirm('退选后如需重新选课，需要重新选课或候补。确定退选吗？', '退选确认', {
      type: 'warning'
    })
    await apiPost(`/student/${studentId}/drop/${row.selection_id}`)
    ElMessage.success('退选成功')
    await load()
  } catch (error) {
    if (error instanceof Error && error.message !== 'cancel') ElMessage.error(error.message)
  }
}

async function showBusinessError(error: unknown) {
  const message = error instanceof Error ? error.message : '操作失败'
  if (message.includes('冲突') || message.includes('退选') || message.includes('候补')) {
    await ElMessageBox.alert(message, '无法操作')
  } else {
    ElMessage.error(message)
  }
}

function scheduleText(item: any) {
  const dayText = weekdays[Number(item.weekday) - 1] || item.weekday
  const weekText = item.weeks || `第${item.start_week}-${item.end_week}周`
  const patternText = item.week_pattern === 'odd' ? '单周' : item.week_pattern === 'even' ? '双周' : ''
  return `周${dayText} 第${item.start_period}-${item.end_period}节 ${weekText}${patternText ? ` ${patternText}` : ''} ${item.classroom || ''}`
}

function scheduleLine(schedules: any[]) {
  return schedules.map(scheduleText).join('；')
}

function courseTypeText(type: string) {
  const map: Record<string, string> = {
    general_elective: '通识选修课程',
    discipline_elective: '学科基础选修课程',
    major_elective: '专业选修课程'
  }
  return map[type] || type || '-'
}
</script>

<style scoped>
.round-alert {
  margin-bottom: 12px;
}

.course-table {
  width: 100%;
}

.class-table {
  margin: 8px 0;
}

.schedule-line {
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
