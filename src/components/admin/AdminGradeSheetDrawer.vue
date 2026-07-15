<template>
  <el-drawer v-model="visible" :title="drawerTitle" size="82%" destroy-on-close>
    <div v-loading="loading" class="grade-sheet">
      <div class="sheet-meta">
        <el-tag :type="batchStatusType(batch.status)">{{ batchStatusLabel(batch.status) }}</el-tag>
        <span v-if="batch.submission_no">第 {{ batch.submission_no }} 次提交</span>
        <span v-if="batch.submitter_name">提交教师：{{ batch.submitter_name }}</span>
        <span v-if="batch.submitted_at">提交时间：{{ batch.submitted_at }}</span>
        <span v-if="batch.reviewer_name">审批人：{{ batch.reviewer_name }}</span>
      </div>

      <div class="statistics-strip">
        <div><span>选课学生</span><strong>{{ statistics.student_count || 0 }}</strong></div>
        <div><span>已有成绩</span><strong>{{ statistics.graded_count || 0 }}</strong></div>
        <div><span>无成绩</span><strong :class="{ danger: Number(statistics.missing_grade_count) > 0 }">{{ statistics.missing_grade_count || 0 }}</strong></div>
        <div><span>平均分</span><strong>{{ valueOrDash(statistics.average_score) }}</strong></div>
        <div><span>最高分</span><strong>{{ valueOrDash(statistics.highest_score) }}</strong></div>
        <div><span>最低分</span><strong>{{ valueOrDash(statistics.lowest_score) }}</strong></div>
        <div><span>及格率</span><strong>{{ percent(statistics.pass_rate) }}</strong></div>
        <div><span>挂科率</span><strong :class="{ danger: Number(statistics.fail_rate) > 0 }">{{ percent(statistics.fail_rate) }}</strong></div>
      </div>

      <div class="sheet-toolbar">
        <el-input v-model="keyword" clearable placeholder="学号、姓名或行政班" style="width:260px" @keyup.enter="search" @clear="search" />
        <el-button type="primary" @click="search">查询</el-button>
      </div>

      <el-table :data="records" border height="calc(100vh - 360px)">
        <el-table-column prop="student_no" label="学号" width="140" />
        <el-table-column prop="student_name" label="姓名" width="110" />
        <el-table-column prop="admin_class_name" label="行政班" min-width="180" />
        <el-table-column prop="usual_score" label="平时分" width="90" />
        <el-table-column prop="exam_score" label="考试分" width="90" />
        <el-table-column prop="final_score" label="总评" width="90" />
        <el-table-column prop="grade_point" label="绩点" width="80" />
        <el-table-column label="结果" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.final_score == null" type="warning">无成绩</el-tag>
            <el-tag v-else-if="Number(row.final_score) >= 60" type="success">通过</el-tag>
            <el-tag v-else type="danger">未通过</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" />
      </el-table>
      <div class="pagination-row">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[20,50,100]" layout="total, sizes, prev, pager, next" @current-change="load" @size-change="changeSize" />
      </div>

      <div v-if="batch.review_reason" class="review-note">审批意见：{{ batch.review_reason }}</div>
      <div v-if="reviewable && batch.status === 'submitted'" class="review-actions">
        <el-input v-model="reviewReason" maxlength="500" show-word-limit placeholder="填写审批意见；退回时建议说明原因" />
        <el-button type="danger" plain :loading="reviewing" @click="review('returned')">退回修改</el-button>
        <el-button type="success" :loading="reviewing" :disabled="Number(statistics.missing_grade_count) > 0" @click="review('approved')">审批通过</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiGet, apiPut } from '../../api/http'
import { useSessionStore } from '../../stores/session'

const props = withDefaults(defineProps<{ modelValue:boolean; teachingClassId?:number; batchId?:number; reviewable?:boolean }>(), { reviewable:false })
const emit = defineEmits<{ 'update:modelValue':[value:boolean]; reviewed:[] }>()
const session = useSessionStore()
const visible = computed({ get:() => props.modelValue, set:(value:boolean) => emit('update:modelValue', value) })
const loading = ref(false)
const reviewing = ref(false)
const records = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const reviewReason = ref('')
const teachingClass = reactive<any>({})
const batch = reactive<any>({})
const statistics = reactive<any>({})
const drawerTitle = computed(() => teachingClass.class_name ? `${teachingClass.course_name} - ${teachingClass.class_name} - 成绩单` : '教学班成绩单')

watch(() => [props.modelValue, props.teachingClassId, props.batchId], async ([open]) => {
  if (!open || !props.teachingClassId) return
  page.value = 1; keyword.value = ''; reviewReason.value = ''; await load()
})

async function load() {
  if (!props.teachingClassId) return
  loading.value = true
  try {
    const result = await apiGet<any>(`/admin/grade-query/classes/${props.teachingClassId}/grades`, { batchId:props.batchId, keyword:keyword.value || undefined, page:page.value, pageSize:pageSize.value })
    records.value = result.records || []; total.value = Number(result.total || 0)
    Object.keys(teachingClass).forEach((key) => delete teachingClass[key]); Object.assign(teachingClass, result.teachingClass || {})
    Object.keys(batch).forEach((key) => delete batch[key]); Object.assign(batch, result.batch || {})
    Object.keys(statistics).forEach((key) => delete statistics[key]); Object.assign(statistics, result.statistics || {})
  } catch (error) { ElMessage.error((error as Error).message) }
  finally { loading.value = false }
}

async function search() { page.value = 1; await load() }
async function changeSize() { page.value = 1; await load() }
async function review(decision:'approved'|'returned') {
  if (!batch.batch_id) return
  if (decision === 'returned' && !reviewReason.value.trim()) { ElMessage.error('退回成绩时请填写原因'); return }
  const action = decision === 'approved' ? '通过' : '退回'
  try {
    await ElMessageBox.confirm(`确认${action}这份教学班成绩单？`, '成绩审批', { type:decision === 'approved' ? 'info' : 'warning' })
    reviewing.value = true
    await apiPut(`/governance/grade-batches/${batch.batch_id}/review?reviewerUserId=${session.user?.user_id}`, { decision, reason:reviewReason.value })
    ElMessage.success(`成绩已${action}`); emit('reviewed'); await load()
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error((error as Error).message) }
  finally { reviewing.value = false }
}
function valueOrDash(value:any) { return value == null ? '-' : value }
function percent(value:any) { return value == null ? '-' : `${value}%` }
function batchStatusLabel(value:string) { return ({ submitted:'待审批', approved:'已通过', returned:'已退回', cancelled:'已取消', draft:'草稿' } as Record<string,string>)[value] || '尚未提交' }
function batchStatusType(value:string) { return value === 'approved' ? 'success' : value === 'submitted' ? 'warning' : value === 'returned' ? 'danger' : 'info' }
</script>

<style scoped>
.grade-sheet { min-height:300px; }
.sheet-meta { display:flex; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:14px; color:#64748b; font-size:13px; }
.statistics-strip { display:grid; grid-template-columns:repeat(8,minmax(90px,1fr)); border:1px solid #e5e7eb; margin-bottom:14px; }
.statistics-strip>div { padding:10px 12px; border-right:1px solid #e5e7eb; }
.statistics-strip>div:last-child { border-right:0; }
.statistics-strip span { display:block; color:#64748b; font-size:12px; }
.statistics-strip strong { display:block; margin-top:4px; font-size:18px; color:#1f2937; }
.statistics-strip .danger { color:#dc2626; }
.sheet-toolbar { display:flex; gap:8px; margin-bottom:12px; }
.pagination-row { display:flex; justify-content:flex-end; margin-top:12px; }
.review-note { margin-top:14px; padding:10px 12px; background:#f8fafc; color:#475569; }
.review-actions { display:grid; grid-template-columns:minmax(260px,1fr) auto auto; gap:10px; margin-top:14px; }
@media (max-width:1000px) { .statistics-strip { grid-template-columns:repeat(4,1fr); } .statistics-strip>div { border-bottom:1px solid #e5e7eb; } }
</style>
