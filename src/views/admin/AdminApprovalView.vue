<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">{{ pageConfig.title }}</h1>
        <p class="page-subtitle">{{ pageConfig.description }}</p>
      </div>
      <div class="page-actions">
        <AdminXlsxImportButton v-if="type === 'program-changes'" import-type="program-changes" :operator-user-id="session.user?.user_id" @imported="load" />
        <el-button type="primary" :loading="loading" @click="load">刷新</el-button>
      </div>
    </div>

    <section class="plain-panel">
      <el-table :data="rows" border v-loading="loading">
        <template v-if="type === 'plan-adjustments'">
          <el-table-column prop="student_name" label="学生" min-width="120" />
          <el-table-column prop="course_name" label="课程" min-width="180" />
          <el-table-column prop="course_nature" label="课程性质" width="130" />
          <el-table-column label="调整类型" width="130"><template #default="{ row }">{{ adjustmentTypeLabel(row.adjustment_type) }}</template></el-table-column>
          <el-table-column label="原成绩" width="90"><template #default="{ row }">{{ row.source_final_score ?? '-' }}</template></el-table-column>
          <el-table-column label="目标学期" width="150"><template #default="{ row }">{{ row.academic_year ? `${row.academic_year} 第${row.semester}学期` : '-' }}</template></el-table-column>
          <el-table-column prop="reason" label="申请原因" min-width="220" />
        </template>
        <template v-else-if="type === 'program-changes'">
          <el-table-column prop="student_name" label="学生" min-width="120" />
          <el-table-column prop="from_class_name" label="原班级" min-width="160" />
          <el-table-column prop="to_class_name" label="目标班级" min-width="160" />
          <el-table-column prop="reason" label="申请原因" min-width="220" />
        </template>
        <template v-else>
          <el-table-column prop="course_name" label="课程" min-width="180" />
          <el-table-column prop="class_name" label="教学班" min-width="200" />
          <el-table-column prop="teacher_name" label="任课教师" width="120" />
          <el-table-column prop="academic_year" label="学年" width="120" />
          <el-table-column prop="semester" label="学期" width="70" />
          <el-table-column prop="submission_no" label="提交批次" width="100" />
          <el-table-column prop="student_count" label="学生数" width="85" />
          <el-table-column prop="missing_grade_count" label="无成绩" width="85" />
          <el-table-column prop="submitted_at" label="提交时间" width="180" />
          <el-table-column prop="review_reason" label="审核意见" min-width="220" />
        </template>

        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="type === 'grade-approvals'" link type="primary" @click="openGradeSheet(row)">查看成绩单</el-button>
            <template v-else-if="isPending(row.status)">
              <el-button link type="primary" @click="decide(row, approveDecision)">通过</el-button>
              <el-button link type="danger" @click="decide(row, rejectDecision)">拒绝</el-button>
            </template>
            <span v-else class="muted">已处理</span>
          </template>
        </el-table-column>
      </el-table>
    </section>
    <AdminGradeSheetDrawer v-model="gradeSheetVisible" :teaching-class-id="activeGradeBatch?.teaching_class_id" :batch-id="activeGradeBatch?.batch_id" reviewable @reviewed="load" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiGet, apiPut } from '../../api/http'
import { useSessionStore } from '../../stores/session'
import AdminGradeSheetDrawer from '../../components/admin/AdminGradeSheetDrawer.vue'
import AdminXlsxImportButton from '../../components/admin/AdminXlsxImportButton.vue'

type ApprovalType = 'plan-adjustments' | 'program-changes' | 'grade-approvals'

const props = defineProps<{ type: ApprovalType }>()
const session = useSessionStore()
const loading = ref(false)
const rows = ref<any[]>([])
const gradeSheetVisible = ref(false)
const activeGradeBatch = ref<any>(null)

const pageConfig = computed(() => ({
  'plan-adjustments': {
    title: '培养方案调整',
    description: '审核学生培养方案中的课程增补、替换与修读调整申请。',
    endpoint: '/governance/plan-adjustments'
  },
  'program-changes': {
    title: '转专业/转班',
    description: '审核学生转专业或转入其他行政班的申请。',
    endpoint: '/governance/program-changes'
  },
  'grade-approvals': {
    title: '成绩审批',
    description: '审核教师提交的教学班成绩批次。',
    endpoint: '/governance/grade-batches'
  }
})[props.type])

const type = computed(() => props.type)
const approveDecision = computed(() => props.type === 'grade-approvals' ? 'approved' : 'APPROVED')
const rejectDecision = computed(() => props.type === 'grade-approvals' ? 'returned' : 'REJECTED')

onMounted(load)
watch(() => props.type, load)

async function load() {
  loading.value = true
  try {
    rows.value = await apiGet<any[]>(pageConfig.value.endpoint)
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    loading.value = false
  }
}

async function decide(row: any, decision: string) {
  const passed = decision === 'APPROVED' || decision === 'approved'
  const action = passed ? '通过' : props.type === 'grade-approvals' ? '退回' : '拒绝'
  try {
    await ElMessageBox.confirm(`确认${action}该申请？`, '审批确认', { type: passed ? 'info' : 'warning' })
    if (props.type === 'plan-adjustments') {
      await apiPut(`/governance/plan-adjustments/${row.adjustment_id}/decision?approverUserId=${session.user?.user_id}`, { decision })
    } else if (props.type === 'program-changes') {
      await apiPut(`/governance/program-changes/${row.program_change_id}/decision?approverUserId=${session.user?.user_id}`, { decision })
    } else {
      await apiPut(`/governance/grade-batches/${row.batch_id}/review?reviewerUserId=${session.user?.user_id}`, { decision })
    }
    await load()
    ElMessage.success(`已${action}`)
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error((error as Error).message)
  }
}

function openGradeSheet(row:any) { activeGradeBatch.value = row; gradeSheetVisible.value = true }

function isPending(status: string) {
  return status === 'PENDING' || status === 'submitted'
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: '待审批',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
    CANCELLED: '已取消',
    draft: '草稿',
    submitted: '待审批',
    returned: '已退回',
    approved: '已通过',
    cancelled: '已取消'
  }
  return labels[status] || status || '-'
}

function statusTagType(status: string) {
  if (status === 'APPROVED' || status === 'approved') return 'success'
  if (status === 'REJECTED' || status === 'returned') return 'danger'
  if (isPending(status)) return 'warning'
  return 'info'
}
function adjustmentTypeLabel(value:string) { return ({ RETAKE:'挂科重修', ADD:'增补课程', REPLACE:'替换课程', EXEMPT:'免修', '补修':'补修' } as Record<string,string>)[value] || value || '-' }
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-subtitle {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 14px;
}

.muted {
  color: #94a3b8;
  font-size: 13px;
}
.page-actions { display:flex; align-items:center; gap:10px; }

@media (max-width: 760px) {
  .page-head {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
