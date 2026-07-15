<template>
  <div class="page">
    <h1 class="page-title">{{ config.title }}</h1>

    <section class="plain-panel">
      <div class="toolbar">
        <el-button type="primary" @click="openCreate">新增</el-button>
        <el-button @click="load(true)">刷新</el-button>
        <AdminXlsxImportButton v-if="batchImportType" :import-type="batchImportType" @imported="load(true)" />
        <div v-if="isPagedResource" class="resource-search-controls">
          <el-input
            v-model="resourceKeyword"
            clearable
            size="small"
            :placeholder="resourceSearchPlaceholder"
            style="width: 220px"
            @keyup.enter="searchResources"
            @clear="searchResources"
          />
          <el-select
            v-if="showCampusSearch"
            v-model="resourceFilters.campusId"
            clearable
            filterable
            size="small"
            placeholder="选择校区"
            style="width: 150px"
            @change="onSearchCampusChange"
          >
            <el-option v-for="item in lookups.campuses || []" :key="item.campus_id" :label="item.campus_name" :value="item.campus_id" />
          </el-select>
          <el-select
            v-if="showCollegeSearch"
            v-model="resourceFilters.collegeId"
            clearable
            filterable
            size="small"
            placeholder="选择学院"
            style="width: 180px"
            @change="onSearchCollegeChange"
          >
            <el-option v-for="item in searchCollegeOptions" :key="item.college_id" :label="item.college_name" :value="item.college_id" />
          </el-select>
          <el-select
            v-if="resource === 'admin-classes'"
            v-model="resourceFilters.majorId"
            clearable
            filterable
            size="small"
            placeholder="选择专业"
            style="width: 190px"
          >
            <el-option v-for="item in searchMajorOptions" :key="item.major_id" :label="item.major_name" :value="item.major_id" />
          </el-select>
          <el-select
            v-if="resource === 'admin-classes'"
            v-model="resourceFilters.gradeYear"
            clearable
            filterable
            size="small"
            placeholder="选择年级"
            style="width: 130px"
          >
            <el-option v-for="item in lookups.gradeYears || []" :key="item.grade_year" :label="`${item.grade_year}级`" :value="item.grade_year" />
          </el-select>
          <el-select
            v-if="resource === 'classrooms'"
            v-model="resourceFilters.buildingId"
            clearable
            filterable
            size="small"
            placeholder="选择教学楼"
            style="width: 170px"
          >
            <el-option v-for="item in searchBuildingOptions" :key="item.building_id" :label="item.building_name" :value="item.building_id" />
          </el-select>
          <el-button :icon="Search" size="small" type="primary" @click="searchResources">查找</el-button>
          <el-button :icon="RefreshLeft" size="small" @click="resetResourceSearch">重置</el-button>
        </div>
        <div v-if="resource === 'teaching-classes'" class="term-sort-controls">
          <el-input v-model="teachingClassCourseKeyword" clearable size="small" placeholder="搜索课程" style="width: 220px" />
          <span class="toolbar-label">学期</span>
          <el-select v-model="selectedTeachingClassTermId" filterable size="small" style="width: 190px">
            <el-option v-for="term in termOptions" :key="term.term_id" :label="termLabel(term)" :value="term.term_id" />
          </el-select>
        </div>
        <div v-if="resource === 'terms'" class="term-sort-controls">
          <span class="toolbar-label">学年</span>
          <el-select v-model="termSort.academicYear" size="small" style="width: 110px">
            <el-option v-for="option in termSortOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
          <span class="toolbar-label">学期</span>
          <el-select v-model="termSort.semester" size="small" style="width: 110px">
            <el-option v-for="option in termSortOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </div>
      </div>

      <el-table
        v-if="resource === 'teaching-classes'"
        :data="pagedTeachingClassCourseGroups"
        border
        height="560"
        row-key="course_id"
        v-loading="loading"
        empty-text="无相关数据"
      >
        <el-table-column type="expand" width="52">
          <template #default="{ row }">
            <el-table :data="row.classes" border size="small" empty-text="无相关数据" class="nested-class-table">
              <el-table-column prop="class_code" label="教学班编号" width="120" />
              <el-table-column prop="class_name" label="教学班名称" min-width="180" />
              <el-table-column prop="course_name" label="课程" min-width="160" />
              <el-table-column prop="teacher_name" label="任课教师" width="120" />
              <el-table-column prop="campus_name" label="开班校区" width="120" />
              <el-table-column prop="academic_year" label="学年" width="120" />
              <el-table-column prop="semester" label="学期" width="80" />
              <el-table-column prop="capacity" label="容量" width="80" />
              <el-table-column prop="selected_count" label="已选" width="80" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row: classRow }">{{ displayValue('status', classRow.status) }}</template>
              </el-table-column>
              <el-table-column label="操作" fixed="right" width="270">
                <template #default="{ row: classRow }">
                  <el-button link type="primary" @click="openSchedule(classRow)">排课</el-button>
                  <el-button link type="primary" @click="openDefaultAdminClasses(classRow)">默认行政班</el-button>
                  <el-button link type="primary" @click="openEdit(classRow)">编辑</el-button>
                  <el-button link type="danger" @click="remove(classRow)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </el-table-column>
        <el-table-column prop="course_code" label="课程代码" width="140" />
        <el-table-column prop="course_name" label="课程名称" min-width="220" />
        <el-table-column prop="credit" label="学分" width="90" />
        <el-table-column prop="hours" label="学时" width="90" />
        <el-table-column label="教学班数" width="110">
          <template #default="{ row }">{{ row.classes.length }}</template>
        </el-table-column>
      </el-table>

      <el-table
        v-else-if="isHierarchyResource"
        :data="hierarchyGroups"
        border
        height="560"
        row-key="group_id"
        v-loading="loading"
        empty-text="无相关数据"
      >
        <el-table-column type="expand" width="52">
          <template #default="{ row: group }">
            <el-table :data="group.records" border size="small" empty-text="无相关数据" class="nested-class-table">
              <el-table-column
                v-for="column in config.columns"
                :key="column.prop"
                :prop="column.prop"
                :label="column.label"
                :width="column.width"
                min-width="130"
              >
                <template #default="{ row }">{{ displayValue(column.prop, row[column.prop]) }}</template>
              </el-table-column>
              <el-table-column label="操作" fixed="right" :width="operationColumnWidth">
                <template #default="{ row }">
                  <el-button v-if="resource === 'majors'" link type="primary" @click="openMajorPlan(row)">培养方案</el-button>
                  <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
                  <el-button link type="danger" @click="remove(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </el-table-column>
        <el-table-column prop="group_label" :label="hierarchyGroupLabel" min-width="240" />
        <el-table-column prop="group_detail" label="上级范围" min-width="180" />
        <el-table-column label="记录数" width="100">
          <template #default="{ row }">{{ row.records.length }}</template>
        </el-table-column>
      </el-table>

      <el-table v-else :data="displayRows" border height="560" v-loading="loading" empty-text="无相关数据">
        <el-table-column
          v-for="column in config.columns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
          min-width="130"
        >
          <template #default="{ row }">
            {{ displayValue(column.prop, row[column.prop]) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" :width="operationColumnWidth">
          <template #default="{ row }">
            <el-button v-if="resource === 'majors'" link type="primary" @click="openMajorPlan(row)">培养方案</el-button>
            <el-button v-if="resource === 'teaching-classes'" link type="primary" @click="openSchedule(row)">排课</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="isPagedResource"
        v-model:current-page="resourcePage"
        v-model:page-size="resourcePageSize"
        class="resource-pagination"
        :page-sizes="[10, 20, 50, 100]"
        :total="resourceTotal"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="load()"
        @size-change="onResourcePageSizeChange"
      />
      <el-pagination
        v-else-if="resource === 'teaching-classes'"
        v-model:current-page="teachingClassCoursePage"
        v-model:page-size="teachingClassCoursePageSize"
        class="resource-pagination"
        :page-sizes="[10, 20, 50]"
        :total="teachingClassCourseGroups.length"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="teachingClassCoursePage = 1"
      />
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑' : '新增'" width="640px">
      <el-form label-width="120px">
        <template v-for="field in visibleFields" :key="field.prop">
          <el-form-item :label="field.label">
            <el-select
              v-if="field.type === 'select'"
              v-model="form[field.prop]"
              clearable
              filterable
              placeholder="请选择"
              no-data-text="无相关数据"
              style="width: 100%"
              @change="onFieldChange(field)"
            >
              <el-option v-for="option in optionsFor(field)" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
            <el-switch v-else-if="field.type === 'boolean'" v-model="form[field.prop]" active-text="是" inactive-text="否" />
            <el-date-picker v-else-if="field.type === 'date'" v-model="form[field.prop]" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            <el-date-picker
              v-else-if="field.type === 'datetime'"
              v-model="form[field.prop]"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              placeholder="选择时间"
              style="width: 100%"
            />
            <el-input v-else-if="field.type === 'textarea'" v-model="form[field.prop]" type="textarea" :rows="3" placeholder="请输入" />
            <el-input v-else-if="field.type === 'password'" v-model="form[field.prop]" type="password" show-password placeholder="留空表示不修改" />
            <el-input v-else-if="field.type === 'number'" v-model="form[field.prop]" inputmode="decimal" placeholder="请输入" />
            <el-input v-else v-model="form[field.prop]" placeholder="请输入" />
          </el-form-item>
          <template v-if="resource === 'teaching-classes' && field.prop === 'course_id'">
            <el-form-item label="教学班名称">
              <el-input :model-value="generatedTeachingClassName" disabled />
            </el-form-item>
            <el-form-item label="学期">
              <el-input :model-value="selectedTeachingClassTermLabel" disabled />
            </el-form-item>
          </template>
          <template v-if="resource === 'admin-classes' && field.prop === 'class_no'">
            <el-form-item label="班级编码">
              <el-input :model-value="generatedAdminClassCode" disabled />
            </el-form-item>
            <el-form-item label="班级名称">
              <el-input :model-value="generatedAdminClassName" disabled />
            </el-form-item>
          </template>
        </template>
        <el-form-item v-if="resource === 'teaching-classes' && editingId" label="选课人数">
          <el-input :model-value="`${form.selected_count || 0} / 候补 ${form.waitlist_count || 0}`" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="scheduleDialogVisible"
      :title="`${scheduleTargetClass?.class_name || ''} 排课`"
      width="960px"
    >
      <el-form label-width="110px" v-loading="scheduleLoading">
        <el-form-item label="一周几节">
          <el-select v-model="scheduleSessionCount" style="width: 160px" @change="syncScheduleSessionRows">
            <el-option v-for="count in weeklySessionCountOptions" :key="count" :label="`${count}节`" :value="count" />
          </el-select>
        </el-form-item>
        <el-form-item label="校区">
          <el-select v-model="scheduleForm.campusId" filterable style="width: 220px" disabled>
            <el-option v-for="campus in lookups.campuses || []" :key="campus.campus_id" :label="campus.campus_name" :value="campus.campus_id" />
          </el-select>
        </el-form-item>
        <el-form-item label="周次">
          <div class="schedule-week-row">
            <el-input v-model="scheduleForm.startWeek" inputmode="numeric" placeholder="开始周" />
            <span>至</span>
            <el-input v-model="scheduleForm.endWeek" inputmode="numeric" placeholder="结束周" />
            <el-select v-model="scheduleForm.weekPattern" style="width: 130px">
              <el-option v-for="option in staticOptions.weekPattern" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
          </div>
        </el-form-item>

        <div class="schedule-session-list">
          <div v-for="(session, index) in scheduleSessions" :key="index" class="schedule-session-row">
            <div class="session-index">第 {{ index + 1 }} 节</div>
            <el-select v-model="session.weekday" placeholder="星期" style="width: 130px">
              <el-option v-for="option in staticOptions.weekdays" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
            <el-input v-model="session.startPeriod" inputmode="numeric" placeholder="开始课次" style="width: 110px" />
            <el-input v-model="session.endPeriod" inputmode="numeric" placeholder="结束课次" style="width: 110px" />
            <el-select v-model="session.classroomId" filterable placeholder="教室" style="flex: 1">
              <el-option
                v-for="room in filteredScheduleClassrooms"
                :key="room.classroom_id"
                :label="`${room.building_name || ''} ${room.room_name}（${room.capacity}人）`"
                :value="room.classroom_id"
              />
            </el-select>
          </div>
        </div>

        <div class="schedule-hour-summary">
          <el-tag :type="scheduleHourMatched ? 'success' : 'danger'">
            要求 {{ scheduleExpectedHours }} 学时 / 当前 {{ schedulePlannedHours }} 学时
          </el-tag>
          <span>计算方式：有效周数 {{ scheduleEffectiveWeeks }} × 每周课次 {{ scheduleWeeklyPeriods }}</span>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="scheduleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="scheduleSaving" @click="saveTeachingClassSchedule">保存排课</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="defaultClassDialogVisible"
      :title="`${defaultClassTarget?.class_name || ''} 默认行政班`"
      width="760px"
    >
      <div v-loading="defaultClassLoading">
        <div class="default-class-toolbar">
          <el-select v-model="defaultAdminClassId" filterable placeholder="选择行政班" style="width: 360px">
            <el-option
              v-for="item in defaultClassAvailableAdminClasses"
              :key="item.admin_class_id"
              :label="`${item.class_name}（${item.grade_year}级）`"
              :value="item.admin_class_id"
            />
          </el-select>
          <el-button type="primary" :loading="defaultClassSaving" @click="addDefaultAdminClass">添加</el-button>
        </div>
        <el-table :data="defaultClassAssignments" border height="320" empty-text="暂无默认行政班">
          <el-table-column prop="admin_class_name" label="行政班" min-width="180" />
          <el-table-column prop="grade_year" label="年级" width="100" />
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="removeDefaultAdminClass(row)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="defaultClassDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="planDialogVisible"
      :title="`${planMajor?.major_name || ''} 培养方案`"
      width="1080px"
      class="major-plan-dialog"
    >
      <div class="major-plan-layout" v-loading="planLoading">
        <aside class="plan-tree-pane">
          <el-select
            v-model="selectedPlanGradeYear"
            placeholder="选择年级"
            style="width: 100%; margin-bottom: 12px"
            @change="onPlanGradeChange"
          >
            <el-option v-for="grade in planGradeYears" :key="grade" :label="`${grade}级`" :value="grade" />
          </el-select>

          <div class="plan-summary">
            <div class="plan-summary-title">最低学分要求</div>
            <div>毕业要求：{{ planMajor?.min_graduate_credit || 0 }} 学分</div>
            <div :class="{ 'credit-risk': requirementTotal < Number(planMajor?.min_graduate_credit || 0) }">
              已配置：{{ requirementTotal }} 学分
            </div>
          </div>

          <el-tree
            :data="planTree"
            node-key="value"
            default-expand-all
            highlight-current
            :current-node-key="selectedPlanCategory"
            @node-click="onPlanTreeClick"
          />
        </aside>

        <section class="plan-editor-pane">
          <div class="plan-editor-title">
            <span>{{ courseTypeText(selectedPlanCategory) }}</span>
            <el-tag v-if="isLeafPlanCategory(selectedPlanCategory)" type="info">{{ selectedCategoryCourses.length }} 门课程</el-tag>
          </div>

          <el-alert
            v-if="!isLeafPlanCategory(selectedPlanCategory)"
            title="请选择左侧树中的具体课程类型后维护课程。"
            type="info"
            show-icon
            :closable="false"
          />
          <el-alert
            v-else-if="!selectedPlanGradeYear"
            title="暂无可用入学年级，请先在信息维护的入学年级维护中新增年级。"
            type="warning"
            show-icon
            :closable="false"
          />

          <template v-else>
            <div class="requirement-row">
              <el-input
                v-model="requirementForm.min_credit"
                inputmode="decimal"
                placeholder="最低要求学分"
                style="width: 180px"
                @change="saveRequirement"
              />
              <el-input v-model="requirementForm.remark" placeholder="备注" style="width: 320px" @change="saveRequirement" />
            </div>

            <el-form class="plan-course-form" inline>
              <el-form-item label="开课学期">
                <el-select v-model="planCourseForm.term_id" filterable style="width: 190px">
                  <el-option v-for="term in planTermOptions" :key="term.term_id" :label="termLabel(term)" :value="term.term_id" />
                </el-select>
              </el-form-item>
              <el-form-item label="课程检索">
                <el-input v-model="courseKeyword" clearable placeholder="输入课程名称或课程代码" style="width: 320px" />
              </el-form-item>
            </el-form>

            <el-table :data="filteredAvailableCourses" border height="220" empty-text="无相关数据">
              <el-table-column prop="course_code" label="课程代码" width="120" />
              <el-table-column prop="course_name" label="课程名称" min-width="180" />
              <el-table-column prop="credit" label="学分" width="80" />
              <el-table-column label="操作" width="90" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" :disabled="isCourseInCurrentPlan(row.course_id)" @click="addPlanCourse(row)">
                    {{ isCourseInCurrentPlan(row.course_id) ? '已添加' : '添加' }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="selected-course-title">已加入当前学期的课程</div>
            <el-table :data="selectedCategoryCourses" border height="260" empty-text="无相关数据">
              <el-table-column prop="course_code" label="课程代码" width="120" />
              <el-table-column prop="course_name" label="课程名称" min-width="160" />
              <el-table-column prop="credit" label="学分" width="80" />
              <el-table-column label="学年学期" width="180">
                <template #default="{ row }">{{ row.academic_year }} 第{{ row.semester }}学期</template>
              </el-table-column>
              <el-table-column prop="grade_year" label="年级" width="90" />
              <el-table-column label="操作" width="90" fixed="right">
                <template #default="{ row }">
                  <el-button link type="danger" @click="deletePlanCourse(row)">移除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </section>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RefreshLeft, Search } from '@element-plus/icons-vue'
import { apiDelete, apiGet, apiPost, apiPut } from '../../api/http'
import AdminXlsxImportButton from '../../components/admin/AdminXlsxImportButton.vue'
import { groupTeachingClasses, paginateItems } from '../../utils/courseClassHierarchy'

interface FieldConfig {
  prop: string
  label: string
  type?: 'text' | 'number' | 'select' | 'boolean' | 'date' | 'datetime' | 'textarea' | 'password'
  optionsKey?: string
  uiOnly?: boolean
}

interface ResourceConfig {
  title: string
  id: string
  columns: Array<{ prop: string; label: string; width?: string | number }>
  fields: FieldConfig[]
}

interface PageResult<T> {
  records: T[]
  total: number
  page: number
  pageSize: number
}

type SortDirection = 'asc' | 'desc'

const pagedResourceCache = new Map<string, PageResult<any>>()
const lookupCache = new Map<string, Record<string, any[]>>()

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

const planTree = [
  { label: '先修课程', value: 'prerequisite' },
  {
    label: '通识课程',
    value: 'general',
    children: [
      { label: '通识必修课程', value: 'general_required' },
      { label: '通识选修课程', value: 'general_elective' }
    ]
  },
  {
    label: '学科基础课程',
    value: 'discipline',
    children: [
      { label: '学科基础必修课程', value: 'discipline_required' },
      { label: '学科基础选修课程', value: 'discipline_elective' }
    ]
  },
  {
    label: '专业课程',
    value: 'major',
    children: [
      { label: '专业必修课程', value: 'major_required' },
      { label: '专业选修课程', value: 'major_elective' }
    ]
  },
  { label: '实践环节', value: 'practice' }
]

const route = useRoute()
const router = useRouter()
const rows = ref<any[]>([])
const lookups = ref<Record<string, any[]>>({})
const loading = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive<Record<string, any>>({})
const termSort = reactive({
  academicYear: 'desc' as SortDirection,
  semester: 'desc' as SortDirection
})
const selectedTeachingClassTermId = ref<number | undefined>()
const teachingClassCourseKeyword = ref('')
const teachingClassCoursePage = ref(1)
const teachingClassCoursePageSize = ref(10)
const resourceKeyword = ref('')
const resourcePage = ref(1)
const resourcePageSize = ref(10)
const resourceTotal = ref(0)
const resourceFilters = reactive({
  campusId: undefined as number | undefined,
  collegeId: undefined as number | undefined,
  majorId: undefined as number | undefined,
  buildingId: undefined as number | undefined,
  gradeYear: undefined as number | undefined
})
const scheduleDialogVisible = ref(false)
const scheduleLoading = ref(false)
const scheduleSaving = ref(false)
const scheduleTargetClass = ref<any>(null)
const scheduleSessionCount = ref(1)
const scheduleForm = reactive({
  campusId: undefined as number | undefined,
  startWeek: 1,
  endWeek: 16,
  weekPattern: 'all'
})
const scheduleSessions = ref<Array<Record<string, any>>>([createScheduleSession()])
const defaultClassDialogVisible = ref(false)
const defaultClassLoading = ref(false)
const defaultClassSaving = ref(false)
const defaultClassTarget = ref<any>(null)
const defaultClassAssignments = ref<any[]>([])
const allDefaultClassAssignments = ref<any[]>([])
const defaultAdminClassId = ref<number | undefined>()

const planDialogVisible = ref(false)
const planLoading = ref(false)
const planMajor = ref<any>(null)
const planRequirements = ref<any[]>([])
const planCourses = ref<any[]>([])
const selectedPlanCategory = ref('major_required')
const selectedPlanGradeYear = ref<number | undefined>()
const courseKeyword = ref('')
const requirementForm = reactive({ min_credit: '', remark: '' })
const planCourseForm = reactive({
  term_id: undefined as number | undefined
})

const configs: Record<string, ResourceConfig> = {
  campuses: {
    title: '校区维护',
    id: 'campus_id',
    columns: [
      { prop: 'campus_code', label: '校区编码' },
      { prop: 'campus_name', label: '校区名称' },
      { prop: 'status', label: '状态' },
      { prop: 'remark', label: '备注' }
    ],
    fields: [
      { prop: 'campus_code', label: '校区编码' },
      { prop: 'campus_name', label: '校区名称' },
      { prop: 'status', label: '状态', type: 'select', optionsKey: 'status' },
      { prop: 'remark', label: '备注', type: 'textarea' }
    ]
  },
  colleges: {
    title: '学院管理',
    id: 'college_id',
    columns: [
      { prop: 'college_code', label: '学院编码' },
      { prop: 'college_name', label: '学院名称' },
      { prop: 'campus_name', label: '所属校区' },
      { prop: 'contact_phone', label: '联系电话' },
      { prop: 'status', label: '状态' }
    ],
    fields: [
      { prop: 'college_code', label: '学院编码' },
      { prop: 'college_name', label: '学院名称' },
      { prop: 'campus_id', label: '所属校区', type: 'select', optionsKey: 'campuses' },
      { prop: 'contact_phone', label: '联系电话' },
      { prop: 'status', label: '状态', type: 'select', optionsKey: 'status' }
    ]
  },
  majors: {
    title: '专业管理',
    id: 'major_id',
    columns: [
      { prop: 'major_code', label: '专业编码' },
      { prop: 'major_name', label: '专业名称' },
      { prop: 'college_name', label: '所属学院' },
      { prop: 'campus_name', label: '所属校区' },
      { prop: 'duration_years', label: '学制' },
      { prop: 'degree_type', label: '学位类型' },
      { prop: 'min_graduate_credit', label: '最低毕业学分' },
      { prop: 'status', label: '状态' }
    ],
    fields: [
      { prop: 'major_code', label: '专业编码' },
      { prop: 'major_name', label: '专业名称' },
      { prop: 'college_id', label: '所属学院', type: 'select', optionsKey: 'colleges' },
      { prop: 'campus_id', label: '所属校区', type: 'select', optionsKey: 'campuses' },
      { prop: 'duration_years', label: '学制', type: 'number' },
      { prop: 'degree_type', label: '学位类型' },
      { prop: 'min_graduate_credit', label: '最低毕业学分', type: 'number' },
      { prop: 'status', label: '状态', type: 'select', optionsKey: 'status' }
    ]
  },
  'admin-classes': {
    title: '行政班管理',
    id: 'admin_class_id',
    columns: [
      { prop: 'class_code', label: '班级编码' },
      { prop: 'class_name', label: '班级名称' },
      { prop: 'college_name', label: '学院' },
      { prop: 'major_name', label: '专业' },
      { prop: 'grade_year', label: '年级' },
      { prop: 'head_teacher_name', label: '班主任' },
      { prop: 'status', label: '状态' }
    ],
    fields: [
      { prop: 'college_id', label: '学院', type: 'select', optionsKey: 'colleges', uiOnly: true },
      { prop: 'major_id', label: '专业', type: 'select', optionsKey: 'majors' },
      { prop: 'grade_year', label: '年级', type: 'select', optionsKey: 'gradeYears' },
      { prop: 'class_no', label: '班号', type: 'number', uiOnly: true },
      { prop: 'head_teacher_id', label: '班主任', type: 'select', optionsKey: 'teachers' },
      { prop: 'status', label: '状态', type: 'select', optionsKey: 'status' }
    ]
  },
  'grade-years': {
    title: '入学年级维护',
    id: 'grade_year_id',
    columns: [
      { prop: 'grade_year', label: '入学年级' },
      { prop: 'admission_academic_year', label: '入学学年' },
      { prop: 'graduation_academic_year', label: '毕业学年' },
      { prop: 'status', label: '状态' },
      { prop: 'remark', label: '备注' }
    ],
    fields: [
      { prop: 'grade_year', label: '入学年级', type: 'number' },
      { prop: 'admission_academic_year', label: '入学学年', type: 'select', optionsKey: 'academicYears' },
      { prop: 'graduation_academic_year', label: '毕业学年', type: 'select', optionsKey: 'academicYears' },
      { prop: 'status', label: '状态', type: 'select', optionsKey: 'status' },
      { prop: 'remark', label: '备注' }
    ]
  },
  notices: {
    title: '公告发布',
    id: 'notice_id',
    columns: [
      { prop: 'title', label: '标题' },
      { prop: 'publisher_name', label: '发布人' },
      { prop: 'created_at', label: '发布时间', width: 180 }
    ],
    fields: [
      { prop: 'notice_type', label: '公告级别', type: 'select', optionsKey: 'noticeType' },
      { prop: 'title', label: '标题' },
      { prop: 'content', label: '公告内容', type: 'textarea' }
    ]
  },
  students: {
    title: '学生管理',
    id: 'student_id',
    columns: [
      { prop: 'student_no', label: '学号' },
      { prop: 'student_name', label: '姓名' },
      { prop: 'gender', label: '性别' },
      { prop: 'class_name', label: '行政班' },
      { prop: 'phone', label: '联系电话' },
      { prop: 'status', label: '状态' },
      { prop: 'username', label: '登录账号' },
      { prop: 'account_status', label: '账号状态' }
    ],
    fields: [
      { prop: 'student_no', label: '学号' },
      { prop: 'student_name', label: '姓名' },
      { prop: 'gender', label: '性别', type: 'select', optionsKey: 'gender' },
      { prop: 'age', label: '年龄', type: 'number' },
      { prop: 'phone', label: '联系电话' },
      { prop: 'admin_class_id', label: '行政班', type: 'select', optionsKey: 'adminClasses' },
      { prop: 'region_id', label: '生源地', type: 'select', optionsKey: 'regions' },
      { prop: 'status', label: '状态', type: 'select', optionsKey: 'studentStatus' },
      { prop: 'username', label: '登录账号' },
      { prop: 'password_text', label: '登录密码', type: 'password' },
      { prop: 'account_status', label: '账号状态', type: 'select', optionsKey: 'accountStatus' }
    ]
  },
  teachers: {
    title: '教师管理',
    id: 'teacher_id',
    columns: [
      { prop: 'teacher_no', label: '工号' },
      { prop: 'teacher_name', label: '姓名' },
      { prop: 'gender', label: '性别' },
      { prop: 'title', label: '职称' },
      { prop: 'college_name', label: '学院' },
      { prop: 'phone', label: '联系电话' },
      { prop: 'status', label: '状态' },
      { prop: 'username', label: '登录账号' },
      { prop: 'account_status', label: '账号状态' }
    ],
    fields: [
      { prop: 'teacher_no', label: '工号' },
      { prop: 'teacher_name', label: '姓名' },
      { prop: 'gender', label: '性别', type: 'select', optionsKey: 'gender' },
      { prop: 'age', label: '年龄', type: 'number' },
      { prop: 'title', label: '职称', type: 'select', optionsKey: 'teacherTitle' },
      { prop: 'phone', label: '联系电话' },
      { prop: 'college_id', label: '学院', type: 'select', optionsKey: 'colleges' },
      { prop: 'status', label: '状态', type: 'select', optionsKey: 'teacherStatus' },
      { prop: 'username', label: '登录账号' },
      { prop: 'password_text', label: '登录密码', type: 'password' },
      { prop: 'account_status', label: '账号状态', type: 'select', optionsKey: 'accountStatus' }
    ]
  },
  terms: {
    title: '学年学期维护',
    id: 'term_id',
    columns: [
      { prop: 'academic_year', label: '学年' },
      { prop: 'semester', label: '学期' },
      { prop: 'start_date', label: '开始日期' },
      { prop: 'end_date', label: '结束日期' },
      { prop: 'is_current', label: '当前学期' }
    ],
    fields: [
      { prop: 'academic_year', label: '学年' },
      { prop: 'semester', label: '学期', type: 'select', optionsKey: 'semester' },
      { prop: 'start_date', label: '开始日期', type: 'date' },
      { prop: 'end_date', label: '结束日期', type: 'date' },
      { prop: 'is_current', label: '当前学期', type: 'boolean' }
    ]
  },
  courses: {
    title: '课程目录',
    id: 'course_id',
    columns: [
      { prop: 'course_code', label: '课程代码' },
      { prop: 'course_name', label: '课程名称' },
      { prop: 'college_name', label: '开课学院' },
      { prop: 'credit', label: '学分' },
      { prop: 'hours', label: '学时' },
      { prop: 'exam_type', label: '考核方式' },
      { prop: 'status', label: '状态' }
    ],
    fields: [
      { prop: 'course_code', label: '课程代码' },
      { prop: 'course_name', label: '课程名称' },
      { prop: 'college_id', label: '开课学院', type: 'select', optionsKey: 'colleges' },
      { prop: 'credit', label: '学分', type: 'number' },
      { prop: 'hours', label: '学时', type: 'number' },
      { prop: 'max_session_periods', label: '单次课最大课次', type: 'number' },
      { prop: 'exam_type', label: '考核方式', type: 'select', optionsKey: 'examType' },
      { prop: 'description', label: '课程简介', type: 'textarea' },
      { prop: 'status', label: '状态', type: 'select', optionsKey: 'status' }
    ]
  },
  'training-requirements': {
    title: '最低学分要求',
    id: 'requirement_id',
    columns: [
      { prop: 'major_name', label: '专业' },
      { prop: 'grade_year', label: '年级' },
      { prop: 'course_type', label: '课程类型' },
      { prop: 'min_credit', label: '最低学分' },
      { prop: 'remark', label: '备注' }
    ],
    fields: [
      { prop: 'major_id', label: '专业', type: 'select', optionsKey: 'majors' },
      { prop: 'grade_year', label: '年级', type: 'select', optionsKey: 'gradeYears' },
      { prop: 'course_type', label: '课程类型', type: 'select', optionsKey: 'courseType' },
      { prop: 'min_credit', label: '最低学分', type: 'number' },
      { prop: 'remark', label: '备注' }
    ]
  },
  'teaching-plans': {
    title: '培养方案课程',
    id: 'plan_id',
    columns: [
      { prop: 'major_name', label: '专业' },
      { prop: 'grade_year', label: '年级' },
      { prop: 'course_code', label: '课程代码' },
      { prop: 'course_name', label: '课程名称' },
      { prop: 'course_nature', label: '课程类型' },
      { prop: 'academic_year', label: '学年' },
      { prop: 'semester', label: '学期' }
    ],
    fields: [
      { prop: 'major_id', label: '专业', type: 'select', optionsKey: 'majors' },
      { prop: 'grade_year', label: '年级', type: 'select', optionsKey: 'gradeYears' },
      { prop: 'term_id', label: '开课学期', type: 'select', optionsKey: 'terms' },
      { prop: 'course_id', label: '课程', type: 'select', optionsKey: 'courses' },
      { prop: 'course_nature', label: '课程类型', type: 'select', optionsKey: 'courseType' }
    ]
  },
  'teaching-classes': {
    title: '教学班管理',
    id: 'teaching_class_id',
    columns: [
      { prop: 'class_code', label: '教学班编号' },
      { prop: 'class_name', label: '教学班名称' },
      { prop: 'course_name', label: '课程' },
      { prop: 'teacher_name', label: '任课教师' },
      { prop: 'campus_name', label: '开班校区' },
      { prop: 'academic_year', label: '学年' },
      { prop: 'semester', label: '学期' },
      { prop: 'capacity', label: '容量' },
      { prop: 'selected_count', label: '已选' },
      { prop: 'status', label: '状态' }
    ],
    fields: [
      { prop: 'course_id', label: '课程', type: 'select', optionsKey: 'courses' },
      { prop: 'class_code', label: '教学班编号' },
      { prop: 'teacher_id', label: '任课教师', type: 'select', optionsKey: 'teachers' },
      { prop: 'campus_id', label: '开班校区', type: 'select', optionsKey: 'campuses' },
      { prop: 'capacity', label: '容量', type: 'number' },
      { prop: 'status', label: '状态', type: 'select', optionsKey: 'classStatus' }
    ]
  },
  'class-schedules': {
    title: '上课安排',
    id: 'schedule_id',
    columns: [
      { prop: 'course_name', label: '课程' },
      { prop: 'class_name', label: '教学班' },
      { prop: 'teacher_name', label: '教师' },
      { prop: 'campus_name', label: '校区' },
      { prop: 'weekday', label: '星期' },
      { prop: 'start_period', label: '开始课次' },
      { prop: 'end_period', label: '结束课次' },
      { prop: 'weeks', label: '周次' },
      { prop: 'room_name', label: '教室' },
      { prop: 'building_name', label: '教学楼' }
    ],
    fields: [
      { prop: 'teaching_class_id', label: '教学班', type: 'select', optionsKey: 'teachingClasses' },
      { prop: 'weekday', label: '星期', type: 'select', optionsKey: 'weekdays' },
      { prop: 'start_period', label: '开始课次', type: 'number' },
      { prop: 'end_period', label: '结束课次', type: 'number' },
      { prop: 'start_week', label: '开始周', type: 'number' },
      { prop: 'end_week', label: '结束周', type: 'number' },
      { prop: 'week_pattern', label: '周次模式', type: 'select', optionsKey: 'weekPattern' },
      { prop: 'classroom_id', label: '教室', type: 'select', optionsKey: 'classrooms' },
      { prop: 'weeks', label: '周次显示' }
    ]
  },
  'class-default-classes': {
    title: '教学班默认行政班',
    id: 'assignment_id',
    columns: [
      { prop: 'course_name', label: '课程' },
      { prop: 'class_name', label: '教学班' },
      { prop: 'admin_class_name', label: '默认行政班' },
      { prop: 'grade_year', label: '年级' }
    ],
    fields: [
      { prop: 'teaching_class_id', label: '教学班', type: 'select', optionsKey: 'teachingClasses' },
      { prop: 'admin_class_id', label: '行政班', type: 'select', optionsKey: 'adminClasses' }
    ]
  },
  rounds: {
    title: '选课轮次',
    id: 'round_id',
    columns: [
      { prop: 'round_name', label: '轮次名称' },
      { prop: 'academic_year', label: '学年' },
      { prop: 'semester', label: '学期' },
      { prop: 'start_time', label: '开始时间', width: 180 },
      { prop: 'end_time', label: '结束时间', width: 180 },
      { prop: 'status', label: '状态' }
    ],
    fields: [
      { prop: 'term_id', label: '学期', type: 'select', optionsKey: 'terms' },
      { prop: 'round_name', label: '轮次名称' },
      { prop: 'start_time', label: '开始时间', type: 'datetime' },
      { prop: 'end_time', label: '结束时间', type: 'datetime' },
      { prop: 'status', label: '状态', type: 'select', optionsKey: 'roundManualStatus' },
      { prop: 'waitlist_enabled', label: '开启候补', type: 'boolean' }
    ]
  },
  buildings: {
    title: '教学楼维护',
    id: 'building_id',
    columns: [
      { prop: 'building_code', label: '楼宇编码' },
      { prop: 'building_name', label: '教学楼' },
      { prop: 'campus_name', label: '校区' },
      { prop: 'floor_count', label: '楼层数' },
      { prop: 'rooms_per_floor', label: '每层教室数' },
      { prop: 'large_room_count_per_floor', label: '每层大教室数' },
      { prop: 'small_room_capacity', label: '小教室容量' },
      { prop: 'large_room_capacity', label: '大教室容量' },
      { prop: 'status', label: '状态' }
    ],
    fields: [
      { prop: 'building_code', label: '楼宇编码' },
      { prop: 'building_name', label: '教学楼' },
      { prop: 'campus_id', label: '校区', type: 'select', optionsKey: 'campuses' },
      { prop: 'floor_count', label: '楼层数', type: 'number' },
      { prop: 'rooms_per_floor', label: '每层教室数', type: 'number' },
      { prop: 'large_room_count_per_floor', label: '每层大教室数', type: 'number' },
      { prop: 'small_room_capacity', label: '小教室容量', type: 'number' },
      { prop: 'large_room_capacity', label: '大教室容量', type: 'number' },
      { prop: 'status', label: '状态', type: 'select', optionsKey: 'status' },
      { prop: 'remark', label: '备注', type: 'textarea' }
    ]
  },
  classrooms: {
    title: '教室维护',
    id: 'classroom_id',
    columns: [
      { prop: 'campus_name', label: '校区' },
      { prop: 'building_name', label: '教学楼' },
      { prop: 'room_code', label: '教室编码' },
      { prop: 'room_name', label: '教室名称' },
      { prop: 'floor_no', label: '楼层' },
      { prop: 'room_no', label: '房间序号' },
      { prop: 'room_type', label: '教室类型' },
      { prop: 'capacity', label: '容量' },
      { prop: 'status', label: '状态' }
    ],
    fields: [
      { prop: 'campus_id', label: '校区', type: 'select', optionsKey: 'campuses', uiOnly: true },
      { prop: 'building_id', label: '教学楼', type: 'select', optionsKey: 'buildings' },
      { prop: 'room_code', label: '教室编码' },
      { prop: 'room_name', label: '教室名称' },
      { prop: 'floor_no', label: '楼层', type: 'number' },
      { prop: 'room_no', label: '房间序号', type: 'number' },
      { prop: 'room_type', label: '教室类型', type: 'select', optionsKey: 'roomType' },
      { prop: 'capacity', label: '容量', type: 'number' },
      { prop: 'status', label: '状态', type: 'select', optionsKey: 'status' },
      { prop: 'remark', label: '备注', type: 'textarea' }
    ]
  }
}

const staticOptions: Record<string, Array<{ label: string; value: any }>> = {
  status: [
    { label: '启用', value: 'enabled' },
    { label: '停用', value: 'disabled' }
  ],
  accountStatus: [
    { label: '启用', value: 'enabled' },
    { label: '停用', value: 'disabled' }
  ],
  gender: [
    { label: '男', value: '男' },
    { label: '女', value: '女' }
  ],
  studentStatus: [
    { label: '在读', value: 'active' },
    { label: '休学', value: 'suspended' },
    { label: '毕业', value: 'graduated' }
  ],
  teacherStatus: [
    { label: '在职', value: 'active' },
    { label: '停用', value: 'inactive' }
  ],
  teacherTitle: [
    { label: '助教', value: '助教' },
    { label: '讲师', value: '讲师' },
    { label: '特聘讲师', value: '特聘讲师' },
    { label: '副教授', value: '副教授' },
    { label: '教授', value: '教授' },
    { label: '硕士生导师', value: '硕士生导师' },
    { label: '博士生导师', value: '博士生导师' },
    { label: '实验师', value: '实验师' },
    { label: '高级实验师', value: '高级实验师' }
  ],
  noticeType: [
    { label: '普通', value: 'normal' },
    { label: '重要', value: 'important' }
  ],
  examType: [
    { label: '考试', value: 'exam' },
    { label: '考查', value: 'check' }
  ],
  courseType: courseTypeOptions,
  classStatus: [
    { label: '草稿', value: 'draft' },
    { label: '开放', value: 'open' },
    { label: '关闭', value: 'closed' }
  ],
  roundStatus: [
    { label: '未开始', value: 'not_started' },
    { label: '开放', value: 'open' },
    { label: '手动关闭', value: 'closed' },
    { label: '结束', value: 'ended' }
  ],
  roundManualStatus: [
    { label: '手动开放', value: 'open' },
    { label: '手动关闭', value: 'closed' }
  ],
  weekdays: [
    { label: '星期一', value: 1 },
    { label: '星期二', value: 2 },
    { label: '星期三', value: 3 },
    { label: '星期四', value: 4 },
    { label: '星期五', value: 5 },
    { label: '星期六', value: 6 },
    { label: '星期日', value: 7 }
  ],
  weekPattern: [
    { label: '每周', value: 'all' },
    { label: '单周', value: 'odd' },
    { label: '双周', value: 'even' }
  ],
  roomType: [
    { label: '小教室', value: 'small' },
    { label: '大教室', value: 'large' }
  ],
  semester: [
    { label: '第1学期', value: 1 },
    { label: '第2学期', value: 2 },
    { label: '第3学期', value: 3 }
  ]
}

const resource = computed(() => String(route.params.resource || 'colleges'))
const pagedResources = new Set(['colleges', 'majors', 'admin-classes', 'students', 'teachers', 'notices', 'courses', 'buildings', 'classrooms'])
const hierarchyResources = new Set(['colleges', 'majors', 'admin-classes'])
configs.students.columns.splice(4, 0, { prop: 'grade_year', label: '入学年级' })
configs.students.fields.splice(6, 0, { prop: 'grade_year', label: '入学年级', type: 'select', optionsKey: 'gradeYears' })

const config = computed(() => configs[resource.value] || configs.colleges)
const batchImportType = computed(() => ['admin-classes', 'buildings', 'teaching-classes'].includes(resource.value) ? resource.value : '')
const isPagedResource = computed(() => pagedResources.has(resource.value))
const isHierarchyResource = computed(() => hierarchyResources.has(resource.value))
const showCampusSearch = computed(() => ['colleges', 'majors', 'buildings', 'classrooms'].includes(resource.value))
const showCollegeSearch = computed(() => ['majors', 'admin-classes', 'courses'].includes(resource.value))
const resourceSearchPlaceholder = computed(() => {
  if (resource.value === 'students') return '学号 / 姓名'
  if (resource.value === 'teachers') return '工号 / 姓名'
  if (resource.value === 'courses') return '课程名称 / 课程代码'
  if (resource.value === 'notices') return '公告标题 / 发布人'
  return '输入名称或编码'
})
const searchCollegeOptions = computed(() => {
  const campusId = Number(resourceFilters.campusId || 0)
  return (lookups.value.colleges || []).filter((item) => !campusId || Number(item.campus_id) === campusId)
})
const searchMajorOptions = computed(() => {
  const collegeId = Number(resourceFilters.collegeId || 0)
  return (lookups.value.majors || []).filter((item) => !collegeId || Number(item.college_id) === collegeId)
})
const searchBuildingOptions = computed(() => {
  const campusId = Number(resourceFilters.campusId || 0)
  return (lookups.value.buildings || []).filter((item) => !campusId || Number(item.campus_id) === campusId)
})
const visibleFields = computed(() => config.value.fields)
const operationColumnWidth = computed(() => resource.value === 'majors' ? 220 : resource.value === 'teaching-classes' ? 190 : 150)
const termSortOptions = [
  { label: '降序', value: 'desc' },
  { label: '升序', value: 'asc' }
]
const displayRows = computed(() => {
  if (resource.value === 'teaching-classes') return teachingClassRows.value
  if (resource.value !== 'terms') return rows.value
  return [...rows.value].sort((a, b) => {
    const yearCompare = compareAcademicYear(a.academic_year, b.academic_year, termSort.academicYear)
    if (yearCompare !== 0) return yearCompare
    return compareNumberLike(a.semester, b.semester, termSort.semester)
  })
})
const termOptions = computed(() => lookups.value.terms || [])
const teachingClassRows = computed(() => {
  if (resource.value !== 'teaching-classes' || !selectedTeachingClassTermId.value) return rows.value
  return rows.value.filter((row) => Number(row.term_id) === Number(selectedTeachingClassTermId.value))
})
const teachingClassCourseGroups = computed(() => {
  return groupTeachingClasses(teachingClassRows.value, teachingClassCourseKeyword.value)
})
const pagedTeachingClassCourseGroups = computed(() => paginateItems(
  teachingClassCourseGroups.value,
  teachingClassCoursePage.value,
  teachingClassCoursePageSize.value
))
const hierarchyGroupLabel = computed(() => {
  if (resource.value === 'majors') return '所属学院'
  if (resource.value === 'classrooms') return '所属教学楼'
  if (resource.value === 'admin-classes') return '所属专业'
  return '所属校区'
})
const hierarchyGroups = computed(() => {
  const groups = new Map<string, any>()
  rows.value.forEach((row) => {
    const metadata = hierarchyMetadata(row)
    if (!groups.has(metadata.id)) {
      groups.set(metadata.id, {
        group_id: metadata.id,
        group_label: metadata.label,
        group_detail: metadata.detail,
        records: []
      })
    }
    groups.get(metadata.id).records.push(row)
  })
  return Array.from(groups.values())
})
const generatedTeachingClassName = computed(() => {
  if (resource.value !== 'teaching-classes') return ''
  const course = (lookups.value.courses || []).find((item) => Number(item.course_id) === Number(form.course_id))
  const term = termOptions.value.find((item) => Number(item.term_id) === Number(selectedTeachingClassTermId.value))
  const code = String(form.class_code || '').trim()
  if (!course || !term || !code) return ''
  return `${teachingClassTermPrefix(term)}${course.course_name}${code}班`
})
const selectedAdminClassMajor = computed(() => {
  if (resource.value !== 'admin-classes') return undefined
  return (lookups.value.majors || []).find((item) => Number(item.major_id) === Number(form.major_id))
})
const normalizedAdminClassNo = computed(() => {
  const classNo = Number(form.class_no || 0)
  return classNo > 0 ? classNo : undefined
})
const generatedAdminClassCode = computed(() => {
  const major = selectedAdminClassMajor.value
  const gradeYear = Number(form.grade_year || 0)
  const classNo = normalizedAdminClassNo.value
  if (!major || !gradeYear || !classNo) return ''
  return `${major.major_code}-${gradeYear}-${String(classNo).padStart(2, '0')}`
})
const generatedAdminClassName = computed(() => {
  const major = selectedAdminClassMajor.value
  const gradeYear = Number(form.grade_year || 0)
  const classNo = normalizedAdminClassNo.value
  if (!major || !gradeYear || !classNo) return ''
  return `${gradeYear}级${major.major_name}${classNo}班`
})
const selectedTeachingClassTermLabel = computed(() => {
  const term = termOptions.value.find((item) => Number(item.term_id) === Number(selectedTeachingClassTermId.value))
  return term ? termLabel(term) : '-'
})
const weeklySessionCountOptions = computed(() => [1, 2, 3, 4, 5, 6])
const scheduleExpectedHours = computed(() => Math.round(Number(scheduleTargetClass.value?.credit || 0) * 16))
const scheduleWeeklyPeriods = computed(() => scheduleSessions.value.reduce((sum, item) => {
  const start = Number(item.startPeriod || 0)
  const end = Number(item.endPeriod || 0)
  return sum + (start >= 1 && end >= start ? end - start + 1 : 0)
}, 0))
const scheduleEffectiveWeeks = computed(() => effectiveWeekCount(Number(scheduleForm.startWeek || 0), Number(scheduleForm.endWeek || 0), scheduleForm.weekPattern))
const schedulePlannedHours = computed(() => scheduleEffectiveWeeks.value * scheduleWeeklyPeriods.value)
const scheduleHourMatched = computed(() => scheduleExpectedHours.value > 0 && schedulePlannedHours.value === scheduleExpectedHours.value)
const filteredScheduleClassrooms = computed(() => {
  const campusId = Number(scheduleForm.campusId || 0)
  return (lookups.value.classrooms || []).filter((room) => !campusId || Number(room.campus_id) === campusId)
})
const defaultClassAvailableAdminClasses = computed(() => {
  const targetCourseId = Number(defaultClassTarget.value?.course_id || 0)
  const targetTermId = Number(defaultClassTarget.value?.term_id || 0)
  const targetTeachingClassId = Number(defaultClassTarget.value?.teaching_class_id || 0)
  const eligiblePlanKeys = new Set(
    (lookups.value.teachingPlans || [])
      .filter((item) => Number(item.course_id) === targetCourseId && Number(item.term_id) === targetTermId)
      .map((item) => `${Number(item.major_id)}:${Number(item.grade_year)}`)
  )
  const assignedIds = new Set(
    allDefaultClassAssignments.value
      .filter((item) => Number(item.teaching_class_id) === targetTeachingClassId
        || (Number(item.course_id) === targetCourseId && Number(item.term_id) === targetTermId))
      .map((item) => Number(item.admin_class_id))
  )
  return (lookups.value.adminClasses || [])
    .filter((item) => eligiblePlanKeys.has(`${Number(item.major_id)}:${Number(item.grade_year)}`))
    .filter((item) => !assignedIds.has(Number(item.admin_class_id)))
    .sort((a, b) => {
      const gradeCompare = Number(b.grade_year || 0) - Number(a.grade_year || 0)
      if (gradeCompare !== 0) return gradeCompare
      return String(a.class_name || '').localeCompare(String(b.class_name || ''), 'zh-Hans-CN')
    })
})
const planGradeYears = computed(() => {
  return (lookups.value.gradeYears || [])
    .filter((item) => item.status !== 'disabled')
    .map((item) => Number(item.grade_year))
    .filter(Boolean)
    .sort((a, b) => b - a)
})
const selectedPlanGrade = computed(() =>
  (lookups.value.gradeYears || []).find((item) => Number(item.grade_year) === Number(selectedPlanGradeYear.value))
)
const planTermOptions = computed(() => {
  const grade = selectedPlanGrade.value
  if (!grade) return []

  const admissionStartYear = academicYearStart(grade.admission_academic_year)
  const graduationStartYear = academicYearStart(grade.graduation_academic_year)
  if (!admissionStartYear || !graduationStartYear) return []

  return termOptions.value
    .filter((term) => {
      const termStartYear = academicYearStart(term.academic_year)
      const semester = Number(term.semester)
      if (!termStartYear || !semester) return false
      if (termStartYear < admissionStartYear || termStartYear > graduationStartYear) return false
      return !(termStartYear === graduationStartYear && semester > 2)
    })
    .sort((a, b) => {
      const yearCompare = compareAcademicYear(a.academic_year, b.academic_year, 'asc')
      if (yearCompare !== 0) return yearCompare
      return compareNumberLike(a.semester, b.semester, 'asc')
    })
})
const requirementTotal = computed(() => planRequirements.value.reduce((sum, item) => sum + Number(item.min_credit || 0), 0))
const selectedCategoryCourses = computed(() =>
  planCourses.value.filter((item) =>
    item.course_nature === selectedPlanCategory.value
    && Number(item.grade_year) === Number(selectedPlanGradeYear.value)
    && Number(item.term_id) === Number(planCourseForm.term_id)
  )
)
const availableCoursesForCategory = computed(() => [...(lookups.value.courses || [])].sort((a, b) => String(a.course_name || '').localeCompare(String(b.course_name || ''), 'zh-Hans-CN')))
const filteredAvailableCourses = computed(() => {
  const keyword = courseKeyword.value.trim().toLowerCase()
  if (!keyword) return availableCoursesForCategory.value
  return availableCoursesForCategory.value.filter((course) =>
    String(course.course_name || '').toLowerCase().includes(keyword)
    || String(course.course_code || '').toLowerCase().includes(keyword)
  )
})

watch(resource, () => {
  if (resource.value === 'class-default-classes') {
    router.replace('/admin/teaching-classes')
    return
  }
  resetResourceSearchState()
  loadLookups()
  load()
}, { immediate: true })
watch(selectedPlanCategory, syncRequirementForm)
watch([selectedTeachingClassTermId, teachingClassCourseKeyword], () => {
  teachingClassCoursePage.value = 1
})
watch(() => teachingClassCourseGroups.value.length, (total) => {
  const lastPage = Math.max(1, Math.ceil(total / teachingClassCoursePageSize.value))
  if (teachingClassCoursePage.value > lastPage) teachingClassCoursePage.value = lastPage
})
watch(() => scheduleForm.campusId, () => {
  const validIds = new Set(filteredScheduleClassrooms.value.map((room) => Number(room.classroom_id)))
  scheduleSessions.value.forEach((session) => {
    if (session.classroomId && !validIds.has(Number(session.classroomId))) {
      session.classroomId = undefined
    }
  })
})

function resourcePageCacheKey() {
  return JSON.stringify({
    resource: resource.value,
    page: resourcePage.value,
    pageSize: resourcePageSize.value,
    keyword: resourceKeyword.value.trim(),
    campusId: resourceFilters.campusId ?? null,
    collegeId: resourceFilters.collegeId ?? null,
    majorId: resourceFilters.majorId ?? null,
    buildingId: resourceFilters.buildingId ?? null,
    gradeYear: resourceFilters.gradeYear ?? null
  })
}

function invalidateResourceCache(resourceName = resource.value) {
  Array.from(pagedResourceCache.keys()).forEach((key) => {
    if (key.includes(`"resource":"${resourceName}"`)) {
      pagedResourceCache.delete(key)
    }
  })
}

async function load(forceRefresh = false) {
  loading.value = true
  try {
    if (isPagedResource.value) {
      const cacheKey = resourcePageCacheKey()
      if (!forceRefresh && pagedResourceCache.has(cacheKey)) {
        const cachedPage = pagedResourceCache.get(cacheKey)!
        rows.value = cachedPage.records || []
        resourceTotal.value = Number(cachedPage.total || 0)
        return
      }
      const page = await apiGet<PageResult<any>>(`/admin/${resource.value}`, {
        paged: true,
        page: resourcePage.value,
        pageSize: resourcePageSize.value,
        keyword: resourceKeyword.value.trim() || undefined,
        campusId: resourceFilters.campusId,
        collegeId: resourceFilters.collegeId,
        majorId: resourceFilters.majorId,
        buildingId: resourceFilters.buildingId,
        gradeYear: resourceFilters.gradeYear
      })
      rows.value = page.records || []
      resourceTotal.value = Number(page.total || 0)
      pagedResourceCache.set(cacheKey, page)
      return
    }
    rows.value = await apiGet<any[]>(`/admin/${resource.value}`)
    resourceTotal.value = rows.value.length
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    loading.value = false
  }
}

function searchResources() {
  resourcePage.value = 1
  load(true)
}

function resetResourceSearch() {
  resetResourceSearchState()
  load(true)
}

function resetResourceSearchState() {
  resourceKeyword.value = ''
  resourcePage.value = 1
  resourceTotal.value = 0
  resourceFilters.campusId = undefined
  resourceFilters.collegeId = undefined
  resourceFilters.majorId = undefined
  resourceFilters.buildingId = undefined
  resourceFilters.gradeYear = undefined
}

function onResourcePageSizeChange() {
  resourcePage.value = 1
  load(true)
}

function onSearchCampusChange() {
  const collegeIds = new Set(searchCollegeOptions.value.map((item) => Number(item.college_id)))
  const buildingIds = new Set(searchBuildingOptions.value.map((item) => Number(item.building_id)))
  if (resourceFilters.collegeId && !collegeIds.has(Number(resourceFilters.collegeId))) {
    resourceFilters.collegeId = undefined
    resourceFilters.majorId = undefined
  }
  if (resourceFilters.buildingId && !buildingIds.has(Number(resourceFilters.buildingId))) {
    resourceFilters.buildingId = undefined
  }
}

function onSearchCollegeChange() {
  const majorIds = new Set(searchMajorOptions.value.map((item) => Number(item.major_id)))
  if (resourceFilters.majorId && !majorIds.has(Number(resourceFilters.majorId))) {
    resourceFilters.majorId = undefined
  }
}

function hierarchyMetadata(row: Record<string, any>) {
  if (resource.value === 'majors') {
    return {
      id: `college-${row.college_id}`,
      label: row.college_name || '未维护学院',
      detail: row.campus_name || '-'
    }
  }
  if (resource.value === 'classrooms') {
    return {
      id: `building-${row.building_id}`,
      label: row.building_name || '未维护教学楼',
      detail: row.campus_name || '-'
    }
  }
  if (resource.value === 'admin-classes') {
    return {
      id: `major-${row.major_id}`,
      label: row.major_name || '未维护专业',
      detail: row.college_name || '-'
    }
  }
  return {
    id: `campus-${row.campus_id}`,
    label: row.campus_name || '未维护校区',
    detail: '-'
  }
}

function lookupRequestParams() {
  return {
    includeTeachers: ['admin-classes', 'teaching-classes'].includes(resource.value),
    includeBuildings: ['classrooms'].includes(resource.value),
    includeClassrooms: ['class-schedules', 'teaching-classes'].includes(resource.value)
  }
}

async function loadLookups(forceRefresh = false) {
  try {
    const params = lookupRequestParams()
    const cacheKey = JSON.stringify(params)
    if (!forceRefresh && lookupCache.has(cacheKey)) {
      lookups.value = lookupCache.get(cacheKey)!
      ensureTeachingClassTerm()
      return
    }
    lookups.value = await apiGet<Record<string, any[]>>('/lookups', params)
    lookupCache.set(cacheKey, lookups.value)
    ensureTeachingClassTerm()
  } catch {
    lookups.value = {}
  }
}

function ensureTeachingClassTerm() {
  if (selectedTeachingClassTermId.value || !termOptions.value.length) return
  const currentTerm = termOptions.value.find((item) => item.is_current)
  selectedTeachingClassTermId.value = currentTerm?.term_id || termOptions.value[0]?.term_id
}

function optionsFor(field: FieldConfig) {
  const key = field.optionsKey || ''
  if (staticOptions[key]) return staticOptions[key]

  let list = lookups.value[key] || []
  if (resource.value === 'admin-classes' && field.prop === 'major_id' && form.college_id) {
    list = list.filter((item) => Number(item.college_id) === Number(form.college_id))
  }
  if (key === 'buildings' && form.campus_id) {
    list = list.filter((item) => Number(item.campus_id) === Number(form.campus_id))
  }

  return list.map((item) => ({
    value: optionValue(key, item),
    label: optionLabel(key, item)
  }))
}

function optionValue(key: string, item: Record<string, any>) {
  const map: Record<string, string> = {
    campuses: 'campus_id',
    colleges: 'college_id',
    majors: 'major_id',
    adminClasses: 'admin_class_id',
    gradeYears: 'grade_year',
    regions: 'region_id',
    teachers: 'teacher_id',
    courses: 'course_id',
    terms: 'term_id',
    academicYears: 'academic_year',
    teachingClasses: 'teaching_class_id',
    buildings: 'building_id',
    classrooms: 'classroom_id',
    rounds: 'round_id',
    weekdays: 'value',
    weekPattern: 'value'
  }
  return item[map[key]]
}

function optionLabel(key: string, item: Record<string, any>) {
  if (key === 'campuses') return item.campus_name
  if (key === 'colleges') return item.college_name
  if (key === 'majors') return `${item.major_code || ''} ${item.major_name}`.trim()
  if (key === 'adminClasses') return `${item.class_name}（${item.grade_year}级）`
  if (key === 'gradeYears') return `${item.grade_year}级`
  if (key === 'academicYears') return `${item.academic_year}学年`
  if (key === 'regions') return item.region_name
  if (key === 'teachers') return item.teacher_name
  if (key === 'courses') return `${item.course_code} ${item.course_name}`
  if (key === 'terms') return termLabel(item)
  if (key === 'teachingClasses') return `${item.class_code} ${item.class_name}`
  if (key === 'buildings') return item.building_name
  if (key === 'classrooms') return `${item.room_name}（${item.capacity}人）`
  if (key === 'rounds') return item.round_name
  if (key === 'weekdays' || key === 'weekPattern') return item.label
  return String(item.name || item.label || '')
}

function displayValue(prop: string, value: any) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? '是' : '否'

  const field = config.value.fields.find((item) => item.prop === prop)
  const optionKey = resource.value === 'rounds' && prop === 'status'
    ? 'roundStatus'
    : field?.optionsKey || optionKeyByColumn(prop)
  const options = optionKey ? staticOptions[optionKey] : undefined
  const option = options?.find((item) => item.value === value)
  return option?.label || value
}

function compareAcademicYear(a: any, b: any, direction: SortDirection) {
  const startYearDiff = academicYearStart(a) - academicYearStart(b)
  if (startYearDiff !== 0) return applySortDirection(startYearDiff, direction)
  return applySortDirection(String(a || '').localeCompare(String(b || ''), 'zh-Hans-CN'), direction)
}

function academicYearStart(value: any) {
  const match = String(value || '').match(/\d{4}/)
  return match ? Number(match[0]) : 0
}

function compareNumberLike(a: any, b: any, direction: SortDirection) {
  return applySortDirection(Number(a || 0) - Number(b || 0), direction)
}

function applySortDirection(value: number, direction: SortDirection) {
  return direction === 'asc' ? value : -value
}

function optionKeyByColumn(prop: string) {
  const map: Record<string, string> = {
    status: resource.value === 'students' ? 'studentStatus' : resource.value === 'teachers' ? 'teacherStatus' : resource.value === 'teaching-classes' ? 'classStatus' : resource.value === 'rounds' ? 'roundStatus' : 'status',
    account_status: 'accountStatus',
    gender: 'gender',
    exam_type: 'examType',
    course_type: 'courseType',
    course_nature: 'courseType',
    title: 'teacherTitle',
    weekday: 'weekdays',
    week_pattern: 'weekPattern',
    room_type: 'roomType',
    semester: 'semester',
    notice_type: 'noticeType'
  }
  return map[prop]
}

function onFieldChange(field: FieldConfig) {
  if (resource.value === 'admin-classes' && field.prop === 'college_id') {
    form.major_id = undefined
  }
  if (resource.value === 'majors' && field.prop === 'college_id') {
    const college = (lookups.value.colleges || []).find((item) => Number(item.college_id) === Number(form.college_id))
    if (college?.campus_id) form.campus_id = college.campus_id
  }
  if (resource.value === 'classrooms' && field.prop === 'campus_id') {
    form.building_id = undefined
  }
  if (resource.value === 'students' && field.prop === 'admin_class_id') {
    const clazz = (lookups.value.adminClasses || []).find((item) => Number(item.admin_class_id) === Number(form.admin_class_id))
    if (clazz?.grade_year) form.grade_year = clazz.grade_year
  }
  if (resource.value === 'admin-classes' && field.prop === 'major_id') {
    form.college_id = inferCollegeIdByMajor(Number(form.major_id))
  }
}

function resetForm() {
  Object.keys(form).forEach((key) => delete form[key])
  config.value.fields.forEach((field) => {
    if (field.type === 'boolean') form[field.prop] = false
  })
  if (resource.value === 'courses') {
    form.max_session_periods = 4
  }
  if (resource.value === 'colleges' || resource.value === 'majors') {
    form.campus_id = defaultCampusId()
  }
  if (resource.value === 'class-schedules') {
    form.start_week = 1
    form.end_week = 16
    form.week_pattern = 'all'
    form.weeks = '1-16周'
  }
  if (resource.value === 'teaching-classes') {
    ensureTeachingClassTerm()
    form.term_id = selectedTeachingClassTermId.value
    form.status = 'open'
  }
  if (resource.value === 'rounds') {
    form.status = 'open'
  }
  if (resource.value === 'buildings') {
    form.campus_id = defaultCampusId()
    form.floor_count = 6
    form.rooms_per_floor = 16
    form.large_room_count_per_floor = 2
    form.small_room_capacity = 60
    form.large_room_capacity = 120
    form.status = 'enabled'
  }
  if (resource.value === 'classrooms') {
    form.campus_id = defaultCampusId()
    form.room_type = 'small'
    form.capacity = 60
    form.status = 'enabled'
  }
  if (resource.value === 'admin-classes') {
    form.class_no = 1
    form.status = 'enabled'
  }
  if (resource.value === 'teaching-plans') {
    form.grade_year = new Date().getFullYear()
  }
  if (resource.value === 'training-requirements') {
    form.grade_year = new Date().getFullYear()
  }
  if (resource.value === 'grade-years') {
    const currentYear = new Date().getFullYear()
    const academicYears = lookups.value.academicYears || []
    form.grade_year = currentYear
    form.admission_academic_year = academicYears.find((item) => String(item.academic_year || '').startsWith(String(currentYear)))?.academic_year
    form.graduation_academic_year = academicYears.find((item) => String(item.academic_year || '').startsWith(String(currentYear + 3)))?.academic_year
    form.status = 'enabled'
  }
  if (resource.value === 'notices') {
    form.notice_type = 'normal'
  }
  if (resource.value === 'campuses') {
    form.status = 'enabled'
  }
}

function openCreate() {
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

function openEdit(row: Record<string, any>) {
  editingId.value = row[config.value.id]
  resetForm()
  config.value.fields.forEach((field) => {
    if (field.prop === 'college_id' && resource.value === 'admin-classes') {
      form.college_id = row.college_id || inferCollegeIdByMajor(row.major_id)
      return
    }
    form[field.prop] = row[field.prop]
  })
  if (resource.value === 'teaching-classes') {
    form.term_id = selectedTeachingClassTermId.value || row.term_id
    form.class_name = row.class_name
    form.selected_count = row.selected_count
    form.waitlist_count = row.waitlist_count
  }
  if (resource.value === 'admin-classes') {
    form.class_no = parseAdminClassNo(row.class_code) || 1
  }
  if (resource.value === 'rounds') {
    form.status = row.status === 'closed' ? 'closed' : 'open'
  }
  dialogVisible.value = true
}

function inferCollegeIdByMajor(majorId: number) {
  return (lookups.value.majors || []).find((item) => Number(item.major_id) === Number(majorId))?.college_id
}

function parseAdminClassNo(classCode: any) {
  const match = String(classCode || '').match(/-(\d+)$/)
  return match ? Number(match[1]) : undefined
}

function defaultCampusId() {
  const campuses = lookups.value.campuses || []
  return campuses.find((item) => item.campus_code === 'PINGFENG')?.campus_id || campuses[0]?.campus_id
}

function buildPayload() {
  const payload: Record<string, any> = {}
  config.value.fields.forEach((field) => {
    if (field.uiOnly) return
    const value = form[field.prop]
    payload[field.prop] = value === '' ? null : value
  })
  if (resource.value === 'teaching-classes') {
    payload.term_id = selectedTeachingClassTermId.value
    payload.class_name = generatedTeachingClassName.value
    if (!editingId.value) {
      payload.selected_count = 0
      payload.waitlist_count = 0
    }
  }
  if (resource.value === 'admin-classes') {
    payload.class_no = Number(form.class_no || 0)
    payload.class_code = generatedAdminClassCode.value
    payload.class_name = generatedAdminClassName.value
  }
  return payload
}

async function openSchedule(row: Record<string, any>) {
  scheduleTargetClass.value = row
  scheduleForm.campusId = row.campus_id ? Number(row.campus_id) : defaultCampusId()
  scheduleForm.startWeek = 1
  scheduleForm.endWeek = 16
  scheduleForm.weekPattern = 'all'
  scheduleSessionCount.value = 1
  scheduleSessions.value = [createScheduleSession()]
  scheduleDialogVisible.value = true
  await loadTeachingClassSchedule(row.teaching_class_id)
}

function createScheduleSession(row?: Record<string, any>) {
  return {
    weekday: row?.weekday ? Number(row.weekday) : undefined,
    startPeriod: row?.start_period ? Number(row.start_period) : undefined,
    endPeriod: row?.end_period ? Number(row.end_period) : undefined,
    classroomId: row?.classroom_id ? Number(row.classroom_id) : undefined
  }
}

async function loadTeachingClassSchedule(teachingClassId: number) {
  scheduleLoading.value = true
  try {
    const schedules = await apiGet<any[]>(`/admin/teaching-classes/${teachingClassId}/schedules`)
    if (schedules.length) {
      const first = schedules[0]
      scheduleForm.startWeek = Number(first.start_week || 1)
      scheduleForm.endWeek = Number(first.end_week || 16)
      scheduleForm.weekPattern = first.week_pattern || 'all'
      scheduleSessions.value = schedules.map((item) => createScheduleSession(item))
      scheduleSessionCount.value = scheduleSessions.value.length
    }
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    scheduleLoading.value = false
  }
}

function syncScheduleSessionRows() {
  const nextCount = Number(scheduleSessionCount.value || 1)
  const nextRows = [...scheduleSessions.value]
  while (nextRows.length < nextCount) nextRows.push(createScheduleSession())
  scheduleSessions.value = nextRows.slice(0, nextCount)
}

async function saveTeachingClassSchedule() {
  if (!scheduleTargetClass.value?.teaching_class_id) return
  if (!scheduleHourMatched.value) {
    ElMessage.error(`排课总学时 ${schedulePlannedHours.value} 与课程要求 ${scheduleExpectedHours.value} 不一致`)
    return
  }
  scheduleSaving.value = true
  try {
    await apiPost(`/admin/teaching-classes/${scheduleTargetClass.value.teaching_class_id}/schedules`, {
      startWeek: Number(scheduleForm.startWeek),
      endWeek: Number(scheduleForm.endWeek),
      weekPattern: scheduleForm.weekPattern,
      sessions: scheduleSessions.value.map((item) => ({
        weekday: Number(item.weekday),
        startPeriod: Number(item.startPeriod),
        endPeriod: Number(item.endPeriod),
        classroomId: Number(item.classroomId)
      }))
    })
    ElMessage.success('排课保存成功')
    scheduleDialogVisible.value = false
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    scheduleSaving.value = false
  }
}

async function openDefaultAdminClasses(row: Record<string, any>) {
  defaultClassTarget.value = row
  defaultAdminClassId.value = undefined
  defaultClassDialogVisible.value = true
  await loadDefaultAdminClassAssignments()
}

async function loadDefaultAdminClassAssignments() {
  if (!defaultClassTarget.value?.teaching_class_id) return
  defaultClassLoading.value = true
  try {
    const assignments = await apiGet<any[]>('/admin/class-default-classes')
    allDefaultClassAssignments.value = assignments
    defaultClassAssignments.value = assignments.filter((item) =>
      Number(item.teaching_class_id) === Number(defaultClassTarget.value.teaching_class_id)
    )
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    defaultClassLoading.value = false
  }
}

async function addDefaultAdminClass() {
  if (!defaultClassTarget.value?.teaching_class_id || !defaultAdminClassId.value) {
    ElMessage.warning('请选择行政班')
    return
  }
  defaultClassSaving.value = true
  try {
    await apiPost('/admin/class-default-classes', {
      teaching_class_id: defaultClassTarget.value.teaching_class_id,
      admin_class_id: defaultAdminClassId.value
    })
    ElMessage.success('默认行政班添加成功')
    defaultAdminClassId.value = undefined
    await loadDefaultAdminClassAssignments()
    await load(true)
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    defaultClassSaving.value = false
  }
}

async function removeDefaultAdminClass(row: Record<string, any>) {
  try {
    await ElMessageBox.confirm(
      '移除后，该行政班当前已在本教学班中的所有学生都会一起退课，确定继续吗？',
      '移除并批量退课',
      { type: 'warning', confirmButtonText: '确认移除', cancelButtonText: '取消' }
    )
    await apiDelete(`/admin/class-default-classes/${row.assignment_id}`)
    ElMessage.success('默认行政班已移除，班内学生已退课')
    await loadDefaultAdminClassAssignments()
    await load(true)
  } catch (error) {
    if (error instanceof Error && error.message !== 'cancel') ElMessage.error(error.message)
  }
}

function effectiveWeekCount(startWeek: number, endWeek: number, weekPattern: string) {
  if (!startWeek || !endWeek || startWeek > endWeek) return 0
  let count = 0
  for (let week = startWeek; week <= endWeek; week += 1) {
    if (weekPattern === 'odd' && week % 2 === 0) continue
    if (weekPattern === 'even' && week % 2 !== 0) continue
    count += 1
  }
  return count
}

async function save() {
  try {
    const payload = buildPayload()
    if (editingId.value) await apiPut(`/admin/${resource.value}/${editingId.value}`, payload)
    else await apiPost(`/admin/${resource.value}`, payload)
    invalidateResourceCache()
    lookupCache.clear()
    ElMessage.success('保存成功')
    dialogVisible.value = false
    await load(true)
    await loadLookups(true)
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
}

async function remove(row: Record<string, any>) {
  try {
    await ElMessageBox.confirm('确定删除该记录吗？', '删除确认', { type: 'warning' })
    await apiDelete(`/admin/${resource.value}/${row[config.value.id]}`)
    invalidateResourceCache()
    lookupCache.clear()
    ElMessage.success('删除成功')
    await load(true)
    await loadLookups(true)
  } catch (error) {
    if (error instanceof Error && error.message !== 'cancel') ElMessage.error(error.message)
  }
}

async function openMajorPlan(row: Record<string, any>) {
  planMajor.value = row
  selectedPlanCategory.value = 'major_required'
  courseKeyword.value = ''
  await loadLookups()
  selectedPlanGradeYear.value = planGradeYears.value[0]
  resetPlanCourseForm()
  planDialogVisible.value = true
  await loadPlanData()
}

async function loadPlanData() {
  if (!planMajor.value) return
  planLoading.value = true
  try {
    const [requirements, plans] = await Promise.all([
      apiGet<any[]>('/admin/training-requirements'),
      apiGet<any[]>('/admin/teaching-plans')
    ])
    const majorId = Number(planMajor.value.major_id)
    const gradeYear = Number(selectedPlanGradeYear.value)
    planRequirements.value = requirements.filter((item) => Number(item.major_id) === majorId && Number(item.grade_year) === gradeYear)
    planCourses.value = plans.filter((item) => Number(item.major_id) === majorId && Number(item.grade_year) === gradeYear)
    syncRequirementForm()
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    planLoading.value = false
  }
}

function onPlanTreeClick(node: any) {
  selectedPlanCategory.value = node.value
  courseKeyword.value = ''
}

async function onPlanGradeChange() {
  courseKeyword.value = ''
  resetPlanCourseForm()
  await loadPlanData()
}

function syncRequirementForm() {
  const current = planRequirements.value.find((item) => item.course_type === selectedPlanCategory.value && Number(item.grade_year) === Number(selectedPlanGradeYear.value))
  requirementForm.min_credit = current ? String(current.min_credit ?? '') : ''
  requirementForm.remark = current?.remark || ''
}

async function saveRequirement() {
  if (!planMajor.value || !selectedPlanGradeYear.value || !isLeafPlanCategory(selectedPlanCategory.value)) return
  try {
    const current = planRequirements.value.find((item) => item.course_type === selectedPlanCategory.value && Number(item.grade_year) === Number(selectedPlanGradeYear.value))
    const payload = {
      major_id: planMajor.value.major_id,
      grade_year: selectedPlanGradeYear.value,
      course_type: selectedPlanCategory.value,
      min_credit: requirementForm.min_credit || 0,
      remark: requirementForm.remark || null
    }
    if (current) await apiPut(`/admin/training-requirements/${current.requirement_id}`, payload)
    else await apiPost('/admin/training-requirements', payload)
    await loadPlanData()
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
}

async function addPlanCourse(course: any) {
  if (!planMajor.value || !selectedPlanGradeYear.value || !isLeafPlanCategory(selectedPlanCategory.value)) return
  if (!planCourseForm.term_id || !course?.course_id) {
    ElMessage.warning('请选择开课学期和课程')
    return
  }
  try {
    await apiPost('/admin/teaching-plans', {
      major_id: planMajor.value.major_id,
      grade_year: selectedPlanGradeYear.value,
      term_id: planCourseForm.term_id,
      course_id: course.course_id,
      course_nature: selectedPlanCategory.value
    })
    ElMessage.success('培养方案课程已添加')
    await loadPlanData()
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
}

function isCourseInCurrentPlan(courseId: number) {
  return selectedCategoryCourses.value.some((item) => Number(item.course_id) === Number(courseId))
}

async function deletePlanCourse(row: any) {
  try {
    await ElMessageBox.confirm('确定从培养方案中移除该课程吗？', '移除确认', { type: 'warning' })
    await apiDelete(`/admin/teaching-plans/${row.plan_id}`)
    ElMessage.success('已移除')
    await loadPlanData()
  } catch (error) {
    if (error instanceof Error && error.message !== 'cancel') ElMessage.error(error.message)
  }
}

function resetPlanCourseForm() {
  planCourseForm.term_id = planTermOptions.value[0]?.term_id
}

function isLeafPlanCategory(value: string) {
  return courseTypeOptions.some((item) => item.value === value)
}

function courseTypeText(value: string) {
  if (value === 'general') return '通识课程'
  if (value === 'discipline') return '学科基础课程'
  if (value === 'major') return '专业课程'
  return courseTypeOptions.find((item) => item.value === value)?.label || value
}

function termLabel(term: any) {
  return `${term.academic_year} 第${term.semester}学期`
}

function teachingClassTermPrefix(term: any) {
  const startYear = String(term.academic_year || '').match(/\d{4}/)?.[0] || ''
  const semester = String(term.semester || '').padStart(2, '0')
  return `${startYear}${semester}`
}

function courseLabel(course: any) {
  return `${course.course_code} ${course.course_name}（${course.credit}学分）`
}
</script>

<style scoped>
.major-plan-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
  min-height: 520px;
}

.plan-tree-pane {
  border-right: 1px solid #dcdfe6;
  padding-right: 14px;
}

.plan-summary {
  margin-bottom: 14px;
  padding: 12px;
  background: #f7f9fb;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  line-height: 1.8;
  color: #606266;
}

.plan-summary-title,
.plan-editor-title {
  color: #1f2d3d;
  font-weight: 600;
}

.credit-risk {
  color: #e6a23c;
}

.plan-editor-pane {
  min-width: 0;
}

.plan-editor-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 16px;
}

.requirement-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.plan-course-form {
  padding: 12px 0 2px;
  border-top: 1px solid #ebeef5;
}

.selected-course-title {
  margin: 14px 0 8px;
  color: #1f2d3d;
  font-weight: 600;
}

.term-sort-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.resource-search-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  min-width: 0;
}

.resource-pagination {
  justify-content: flex-end;
  margin-top: 14px;
}

.toolbar-label {
  color: #606266;
  font-size: 13px;
}

.nested-class-table {
  margin: 8px 16px 12px;
  width: calc(100% - 32px);
}

.schedule-week-row,
.schedule-session-row,
.schedule-hour-summary {
  display: flex;
  align-items: center;
  gap: 10px;
}

.schedule-week-row {
  width: 100%;
}

.schedule-week-row .el-input {
  width: 120px;
}

.schedule-session-list {
  display: grid;
  gap: 10px;
}

.schedule-session-row {
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fafafa;
}

.session-index {
  width: 72px;
  color: #303133;
  font-weight: 600;
}

.schedule-hour-summary {
  margin-top: 14px;
  color: #606266;
}

.default-class-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

@media (max-width: 1100px) {
  .resource-search-controls {
    width: 100%;
    flex-wrap: wrap;
    margin-left: 0;
  }
}
</style>
