<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">选课规则</h1>
        <p class="page-subtitle">按专业和年级维护专业选修课程的学分与数量要求。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="load">刷新</el-button>
    </div>

    <section class="plain-panel">
      <div class="toolbar">
        <el-button type="primary" @click="openRuleDialog">新增规则</el-button>
        <el-button @click="openImport">批量导入 XLSX</el-button>
        <input ref="importInput" class="hidden-file" type="file" accept=".xlsx" @change="importRules" />
      </div>

      <el-table :data="rules" border v-loading="loading">
        <el-table-column prop="major_name" label="专业" min-width="180" />
        <el-table-column prop="grade_year" label="年级" width="100" />
        <el-table-column label="课程类别" width="130">
          <template #default="{ row }">{{ categoryLabel(row.category_code) }}</template>
        </el-table-column>
        <el-table-column prop="required_credits" label="要求学分" width="110" />
        <el-table-column prop="max_courses_per_term" label="每学期最多课程" width="150" />
        <el-table-column prop="remark" label="备注" min-width="180" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" @click="removeRule(row.rule_id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="ruleDialog" title="新增选课规则" width="480px">
      <el-form label-width="130px">
        <el-form-item label="专业" required>
          <el-select v-model="ruleForm.majorId" filterable clearable placeholder="搜索专业名称" style="width: 100%">
            <el-option
              v-for="item in lookups.majors"
              :key="item.major_id"
              :label="`${item.major_name}（${item.major_code}）`"
              :value="item.major_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="年级" required>
          <el-select v-model="ruleForm.gradeYear" filterable clearable placeholder="选择已添加的年级" style="width: 100%">
            <el-option v-for="item in lookups.gradeYears" :key="item.grade_year" :label="`${item.grade_year}级`" :value="item.grade_year" />
          </el-select>
        </el-form-item>
        <el-form-item label="要求学分" required>
          <el-input-number v-model="ruleForm.requiredCredits" :min="0" :precision="1" :controls="false" placeholder="请输入要求学分" style="width: 100%" />
        </el-form-item>
        <el-form-item label="每学期最多课程" required>
          <el-input-number v-model="ruleForm.maxCoursesPerTerm" :min="1" :controls="false" placeholder="请输入课程数量" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="ruleForm.remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="createRule">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiDelete, apiGet, apiPost, apiPostForm } from '../../api/http'

const DEFAULT_CATEGORY_CODE = 'major_elective'

const loading = ref(false)
const saving = ref(false)
const ruleDialog = ref(false)
const rules = ref<any[]>([])
const lookups = reactive<{ majors: any[]; gradeYears: any[] }>({ majors: [], gradeYears: [] })
const importInput = ref<HTMLInputElement | null>(null)
const ruleForm = reactive<{
  majorId: number | undefined
  gradeYear: number | undefined
  requiredCredits: number | undefined
  maxCoursesPerTerm: number | undefined
  remark: string
}>({ majorId: undefined, gradeYear: undefined, requiredCredits: undefined, maxCoursesPerTerm: undefined, remark: '' })

onMounted(load)

async function load() {
  loading.value = true
  try {
    const [ruleRows, lookupRows] = await Promise.all([
      apiGet<any[]>('/governance/selection-rules'),
      apiGet<any>('/governance/lookups')
    ])
    rules.value = ruleRows
    lookups.majors = lookupRows.majors || []
    lookups.gradeYears = lookupRows.gradeYears || []
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    loading.value = false
  }
}

function openRuleDialog() {
  Object.assign(ruleForm, {
    majorId: undefined,
    gradeYear: undefined,
    requiredCredits: undefined,
    maxCoursesPerTerm: undefined,
    remark: ''
  })
  ruleDialog.value = true
}

function openImport() {
  importInput.value?.click()
}

async function importRules(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const form = new FormData()
    form.append('file', file)
    const result = await apiPostForm<{ imported: number; skipped: number }>('/governance/selection-rules/import', form)
    ElMessage.success(`成功导入 ${result.imported} 条规则`)
    await load()
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    input.value = ''
  }
}

async function createRule() {
  if (ruleForm.majorId == null || ruleForm.gradeYear == null || ruleForm.requiredCredits == null || ruleForm.maxCoursesPerTerm == null) {
    ElMessage.warning('请完整填写专业、年级、要求学分和每学期最多课程')
    return
  }
  saving.value = true
  try {
    await apiPost('/governance/selection-rules', { ...ruleForm, categoryCode: DEFAULT_CATEGORY_CODE })
    ruleDialog.value = false
    await load()
    ElMessage.success('规则已保存')
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    saving.value = false
  }
}

async function removeRule(id: number) {
  try {
    await ElMessageBox.confirm('确认删除该规则？', '提示', { type: 'warning' })
    await apiDelete(`/governance/selection-rules/${id}`)
    await load()
    ElMessage.success('规则已删除')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error((error as Error).message)
  }
}

function categoryLabel(code: string) {
  return code === DEFAULT_CATEGORY_CODE ? '专业选修' : code || '-'
}
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

.hidden-file {
  display: none;
}

@media (max-width: 760px) {
  .page-head {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
