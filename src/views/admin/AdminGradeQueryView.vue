<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">成绩查询</h1>
        <p class="page-subtitle">按课程查看教学班及学生成绩。</p>
      </div>
    </div>

    <section class="plain-panel">
      <div class="filter-row grade-filter-row">
        <el-input v-model="filters.keyword" clearable placeholder="课程名称或课程编号" style="width: 240px" @keyup.enter="search" />
        <el-select v-model="filters.collegeId" clearable filterable placeholder="学院" style="width: 190px" @change="onCollegeChange">
          <el-option v-for="item in lookups.colleges" :key="item.college_id" :label="item.college_name" :value="item.college_id" />
        </el-select>
        <el-select v-model="filters.majorId" clearable filterable placeholder="专业" style="width: 190px">
          <el-option v-for="item in filteredMajors" :key="item.major_id" :label="item.major_name" :value="item.major_id" />
        </el-select>
        <el-select v-model="filters.teacherId" clearable filterable placeholder="任课教师" style="width: 170px">
          <el-option v-for="item in filteredTeachers" :key="item.teacher_id" :label="`${item.teacher_no} ${item.teacher_name}`" :value="item.teacher_id" />
        </el-select>
        <el-select v-model="filters.academicYear" clearable placeholder="学年" style="width: 140px">
          <el-option v-for="item in lookups.academicYears" :key="item.academic_year" :label="item.academic_year" :value="item.academic_year" />
        </el-select>
        <el-select v-model="filters.semester" clearable placeholder="学期" style="width: 120px">
          <el-option label="第1学期" :value="1" /><el-option label="第2学期" :value="2" /><el-option label="第3学期" :value="3" />
        </el-select>
        <el-button type="primary" @click="search">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </div>
    </section>

    <section class="plain-panel">
      <el-table :data="courses" border row-key="course_id" v-loading="loading" @expand-change="handleExpand">
        <el-table-column type="expand" width="52">
          <template #default="{ row }">
            <div class="class-section" v-loading="classPage(row.course_id).loading">
              <el-table :data="classPage(row.course_id).records" border size="small" empty-text="该筛选条件下暂无教学班">
                <el-table-column prop="class_code" label="教学班编号" width="130" />
                <el-table-column prop="class_name" label="教学班名称" min-width="220" />
                <el-table-column prop="teacher_name" label="任课教师" width="120" />
                <el-table-column prop="academic_year" label="学年" width="120" />
                <el-table-column label="学期" width="80"><template #default="scope">第{{ scope.row.semester }}学期</template></el-table-column>
                <el-table-column prop="capacity" label="容量" width="80" />
                <el-table-column prop="selected_count" label="选课人数" width="95" />
                <el-table-column prop="grade_count" label="已录成绩" width="95" />
                <el-table-column label="成绩审批" width="100"><template #default="scope"><el-tag :type="gradeBatchStatusType(scope.row.grade_batch_status)">{{ gradeBatchStatusLabel(scope.row.grade_batch_status) }}</el-tag></template></el-table-column>
                <el-table-column label="状态" width="90"><template #default="scope"><el-tag :type="classStatusType(scope.row.status)">{{ classStatusLabel(scope.row.status) }}</el-tag></template></el-table-column>
                <el-table-column label="操作" width="110" fixed="right"><template #default="scope"><el-button link type="primary" :icon="View" @click="openGrades(row, scope.row)">查看成绩</el-button></template></el-table-column>
              </el-table>
              <div class="nested-pagination">
                <el-pagination v-model:current-page="classPage(row.course_id).page" v-model:page-size="classPage(row.course_id).pageSize" :total="classPage(row.course_id).total" :page-sizes="[5, 10, 20]" layout="total, sizes, prev, pager, next" small @current-change="loadClasses(row.course_id)" @size-change="loadClasses(row.course_id, true)" />
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="course_code" label="课程编号" width="140" />
        <el-table-column prop="course_name" label="课程名称" min-width="220" />
        <el-table-column prop="college_name" label="开课学院" min-width="190" />
        <el-table-column prop="credit" label="学分" width="80" />
        <el-table-column prop="hours" label="学时" width="80" />
        <el-table-column prop="teaching_class_count" label="教学班数" width="100" />
        <el-table-column prop="student_count" label="选课人数" width="100" />
        <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === 'enabled' ? 'success' : 'info'">{{ accountStatusLabel(row.status) }}</el-tag></template></el-table-column>
      </el-table>
      <div class="pagination-row">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @current-change="loadCourses" @size-change="onCourseSizeChange" />
      </div>
    </section>

    <AdminGradeSheetDrawer v-model="gradeDrawer" :teaching-class-id="activeClass?.teaching_class_id" :batch-id="activeClass?.grade_batch_id" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { View } from '@element-plus/icons-vue'
import { apiGet } from '../../api/http'
import AdminGradeSheetDrawer from '../../components/admin/AdminGradeSheetDrawer.vue'

const loading = ref(false)
const courses = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const lookups = reactive<any>({ colleges: [], majors: [], teachers: [], academicYears: [] })
const filters = reactive<any>({ collegeId: undefined, majorId: undefined, teacherId: undefined, academicYear: '', semester: undefined, keyword: '' })
const classPages = reactive<Record<number, any>>({})
const gradeDrawer = ref(false)
const activeClass = ref<any>(null)

const filteredMajors = computed(() => lookups.majors.filter((item: any) => !filters.collegeId || item.college_id === filters.collegeId))
const filteredTeachers = computed(() => lookups.teachers.filter((item: any) => !filters.collegeId || item.college_id === filters.collegeId))

onMounted(async () => { await loadLookups(); await loadCourses() })

async function loadLookups() {
  try { Object.assign(lookups, await apiGet('/admin/grade-query/lookups')) }
  catch (error) { ElMessage.error((error as Error).message) }
}

async function loadCourses() {
  loading.value = true
  try {
    const result = await apiGet<any>('/admin/grade-query/courses', { ...filters, page: page.value, pageSize: pageSize.value })
    courses.value = result.records || []
    total.value = Number(result.total || 0)
  } catch (error) { ElMessage.error((error as Error).message) }
  finally { loading.value = false }
}

function classPage(courseId: number) {
  if (!classPages[courseId]) classPages[courseId] = { records: [], total: 0, page: 1, pageSize: 5, loading: false, loaded: false }
  return classPages[courseId]
}

async function handleExpand(row: any, expandedRows: any[]) {
  if (expandedRows.some((item) => item.course_id === row.course_id) && !classPage(row.course_id).loaded) await loadClasses(row.course_id)
}

async function loadClasses(courseId: number, resetPage = false) {
  const state = classPage(courseId)
  if (resetPage) state.page = 1
  state.loading = true
  try {
    const result = await apiGet<any>(`/admin/grade-query/courses/${courseId}/classes`, { academicYear: filters.academicYear || undefined, semester: filters.semester, teacherId: filters.teacherId, page: state.page, pageSize: state.pageSize })
    state.records = result.records || []; state.total = Number(result.total || 0); state.loaded = true
  } catch (error) { ElMessage.error((error as Error).message) }
  finally { state.loading = false }
}

async function openGrades(course: any, teachingClass: any) {
  activeClass.value = { ...teachingClass, course_name:course.course_name }; gradeDrawer.value = true
}

async function search() { page.value = 1; Object.keys(classPages).forEach((key) => delete classPages[Number(key)]); await loadCourses() }
async function reset() { Object.assign(filters, { collegeId: undefined, majorId: undefined, teacherId: undefined, academicYear: '', semester: undefined, keyword: '' }); await search() }
async function onCourseSizeChange() { page.value = 1; await loadCourses() }
function onCollegeChange() {
  if (!filteredMajors.value.some((item: any) => item.major_id === filters.majorId)) filters.majorId = undefined
  if (!filteredTeachers.value.some((item: any) => item.teacher_id === filters.teacherId)) filters.teacherId = undefined
}
function accountStatusLabel(value: string) { return ({ enabled: '启用', disabled: '停用' } as Record<string, string>)[value] || value || '-' }
function classStatusLabel(value: string) { return ({ draft: '草稿', open: '开放', closed: '关闭' } as Record<string, string>)[value] || value || '-' }
function classStatusType(value: string) { return value === 'open' ? 'success' : value === 'draft' ? 'warning' : 'info' }
function gradeBatchStatusLabel(value:string) { return ({ submitted:'待审批', approved:'已通过', returned:'已退回', cancelled:'已取消' } as Record<string,string>)[value] || '未提交' }
function gradeBatchStatusType(value:string) { return value === 'approved' ? 'success' : value === 'submitted' ? 'warning' : value === 'returned' ? 'danger' : 'info' }
</script>

<style scoped>
.page-head { display:flex; justify-content:space-between; align-items:flex-start; }
.page-subtitle { margin:4px 0 0; color:#64748b; font-size:14px; }
.grade-filter-row { flex-wrap:wrap; }
.class-section { padding:12px 16px; background:#f8fafc; }
.nested-pagination,.pagination-row { display:flex; justify-content:flex-end; margin-top:12px; }
</style>
