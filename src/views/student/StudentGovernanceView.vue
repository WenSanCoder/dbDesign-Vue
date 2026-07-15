<template>
  <div class="page">
    <div class="page-head"><div><h1 class="page-title">我的教务申请</h1><p class="page-subtitle">申请挂科重修、转班，并查看教学班通知。</p></div><el-button @click="loadAll">刷新</el-button></div>
    <el-tabs v-model="tab">
      <el-tab-pane label="培养方案调整" name="adjustment">
        <div class="toolbar"><el-button type="primary" :disabled="!retakeOptions.length" @click="openRetake">申请挂科重修</el-button><span v-if="!retakeOptions.length" class="muted">当前没有可申请重修的已审批挂科成绩</span></div>
        <el-table :data="adjustments" border class="table">
          <el-table-column prop="course_code" label="课程编号" width="120" />
          <el-table-column prop="course_name" label="课程" min-width="180" />
          <el-table-column label="调整类型" width="110"><template #default="{ row }">{{ adjustmentTypeLabel(row.adjustment_type) }}</template></el-table-column>
          <el-table-column label="原成绩" width="90"><template #default="{ row }">{{ row.source_final_score ?? '-' }}</template></el-table-column>
          <el-table-column label="目标学期" width="150"><template #default="{ row }">{{ row.academic_year ? `${row.academic_year} 第${row.semester}学期` : '-' }}</template></el-table-column>
          <el-table-column prop="reason" label="申请原因" min-width="220" />
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
          <el-table-column prop="created_at" label="提交时间" width="180" />
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="转班申请" name="program">
        <el-button type="primary" @click="programDialog=true">提交转班申请</el-button>
        <el-table :data="programChanges" border class="table">
          <el-table-column prop="from_class_name" label="原行政班" min-width="160" /><el-table-column prop="to_class_name" label="目标行政班" min-width="160" />
          <el-table-column prop="reason" label="原因" min-width="220" /><el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="教学班通知" name="notice">
        <el-table :data="notices" border class="table"><el-table-column prop="title" label="标题" /><el-table-column prop="publisher_name" label="发布人" /><el-table-column prop="created_at" label="时间" /><el-table-column prop="read_flag" label="状态"><template #default="scope"><el-tag v-if="scope.row.read_flag" type="info">已读</el-tag><el-button v-else link type="primary" @click="readNotice(scope.row.notice_id)">标记已读</el-button></template></el-table-column></el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="retakeDialog" title="挂科重修申请" width="620px">
      <el-form label-width="100px">
        <el-form-item label="挂科课程" required><el-select v-model="retakeForm.sourceGradeId" filterable style="width:100%" @change="retakeForm.targetTermId=undefined"><el-option v-for="item in retakeOptions" :key="item.source_grade_id" :label="`${item.course_code} ${item.course_name}（${item.final_score}分）`" :value="item.source_grade_id" /></el-select></el-form-item>
        <el-form-item label="原修读学期"><el-input :model-value="selectedRetake ? `${selectedRetake.source_academic_year} 第${selectedRetake.source_semester}学期` : ''" disabled /></el-form-item>
        <el-form-item label="重修学期" required><el-select v-model="retakeForm.targetTermId" filterable style="width:100%"><el-option v-for="item in availableRetakeTerms" :key="item.term_id" :label="`${item.academic_year} 第${item.semester}学期`" :value="item.term_id" /></el-select></el-form-item>
        <el-form-item label="申请原因" required><el-input v-model="retakeForm.reason" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="说明挂科情况和重修计划" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="retakeDialog=false">取消</el-button><el-button type="primary" @click="submitRetake">提交申请</el-button></template>
    </el-dialog>

    <el-dialog v-model="programDialog" title="转班申请" width="560px">
      <el-form label-width="100px"><el-form-item label="目标班级" required><el-select v-model="programForm.toAdminClassId" filterable style="width:100%"><el-option v-for="item in lookups.adminClasses" :key="item.admin_class_id" :label="`${item.class_code} ${item.class_name}`" :value="item.admin_class_id" /></el-select></el-form-item><el-form-item label="生效学期" required><el-select v-model="programForm.effectiveTermId" style="width:100%"><el-option v-for="item in lookups.terms" :key="item.term_id" :label="`${item.academic_year} 第${item.semester}学期`" :value="item.term_id" /></el-select></el-form-item><el-form-item label="原因" required><el-input v-model="programForm.reason" type="textarea" /></el-form-item></el-form>
      <template #footer><el-button @click="programDialog=false">取消</el-button><el-button type="primary" @click="submitProgram">提交</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { apiGet, apiPost, apiPut } from '../../api/http'
import { useSessionStore } from '../../stores/session'

const session = useSessionStore()
const tab = ref('adjustment')
const adjustments = ref<any[]>([]); const programChanges = ref<any[]>([]); const notices = ref<any[]>([]); const retakeOptions = ref<any[]>([])
const lookups = reactive<any>({ terms:[], adminClasses:[] })
const retakeDialog = ref(false); const programDialog = ref(false)
const retakeForm = reactive<any>({ sourceGradeId:undefined, targetTermId:undefined, reason:'' })
const programForm = reactive<any>({ toAdminClassId:undefined, effectiveTermId:undefined, reason:'' })
const selectedRetake = computed(() => retakeOptions.value.find((item) => item.source_grade_id === retakeForm.sourceGradeId))
const availableRetakeTerms = computed(() => {
  const today = new Date().toISOString().slice(0,10)
  return lookups.terms.filter((term:any) => (!selectedRetake.value?.source_end_date || String(term.end_date) > String(selectedRetake.value.source_end_date)) && String(term.end_date) >= today)
})

async function loadAll() {
  const id = session.user?.related_id; if (!id) return
  try {
    const [adjustmentRows, changeRows, noticeRows, options, lookupData] = await Promise.all([
      apiGet<any[]>(`/governance/plan-adjustments?studentId=${id}`), apiGet<any[]>(`/governance/program-changes?studentId=${id}`),
      apiGet<any[]>(`/governance/students/${id}/notices`), apiGet<any[]>(`/governance/students/${id}/retake-options`), apiGet<any>('/governance/lookups')
    ])
    adjustments.value=adjustmentRows; programChanges.value=changeRows; notices.value=noticeRows; retakeOptions.value=options; Object.assign(lookups,lookupData)
  } catch (error) { ElMessage.error((error as Error).message) }
}
function openRetake() { Object.assign(retakeForm,{ sourceGradeId:undefined,targetTermId:undefined,reason:'' }); retakeDialog.value=true }
async function submitRetake() {
  const id=session.user?.related_id; if(!id)return
  try { await apiPost(`/governance/students/${id}/plan-adjustments`,{ ...retakeForm, adjustmentType:'RETAKE' }); retakeDialog.value=false; await loadAll(); ElMessage.success('重修申请已提交') }
  catch(error){ ElMessage.error((error as Error).message) }
}
async function submitProgram(){const id=session.user?.related_id;if(!id)return;try{await apiPost(`/governance/students/${id}/program-changes`,programForm);programDialog.value=false;await loadAll();ElMessage.success('申请已提交')}catch(error){ElMessage.error((error as Error).message)}}
async function readNotice(id:number){const studentId=session.user?.related_id;if(!studentId)return;await apiPut(`/governance/students/${studentId}/notices/${id}/read`);await loadAll()}
function adjustmentTypeLabel(value:string){return ({RETAKE:'挂科重修',ADD:'增补',REPLACE:'替换',EXEMPT:'免修','补修':'补修'} as Record<string,string>)[value]||value}
function statusLabel(value:string){return ({PENDING:'待审批',APPROVED:'已通过',REJECTED:'已拒绝',CANCELLED:'已取消'} as Record<string,string>)[value]||value}
function statusType(value:string){return value==='APPROVED'?'success':value==='PENDING'?'warning':value==='REJECTED'?'danger':'info'}
onMounted(loadAll)
</script>

<style scoped>
.page-head{display:flex;justify-content:space-between;align-items:flex-start}.page-subtitle{margin:4px 0 0;color:#64748b;font-size:14px}.toolbar{display:flex;align-items:center;gap:12px}.muted{color:#94a3b8;font-size:13px}.table{margin-top:14px}
</style>
