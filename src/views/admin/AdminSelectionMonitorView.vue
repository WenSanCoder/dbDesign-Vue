<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page-title">抢课监控</h1>
      <el-button type="primary" :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
    </div>

    <el-alert
      v-if="!loading && !currentRound"
      title="当前时间没有进行中的抢课轮次"
      type="info"
      show-icon
      :closable="false"
      class="round-empty"
    />

    <section class="plain-panel monitor-panel">
      <div class="section-head">
        <h2 class="section-title">教学班容量监控</h2>
        <div class="section-tools">
          <el-input
            v-model="capacityKeyword"
            clearable
            placeholder="课程名称 / 学号"
            @keyup.enter="searchCapacity"
            @clear="searchCapacity"
          />
          <el-button :icon="Search" aria-label="搜索容量监控" @click="searchCapacity" />
          <span class="section-count">{{ courseGroups.length }} 门课程</span>
        </div>
      </div>
      <el-table
        :data="pagedCourseGroups"
        border
        row-key="course_id"
        v-loading="loading"
        empty-text="当前轮次暂无教学班"
      >
        <el-table-column type="expand" width="52">
          <template #default="{ row }">
            <el-table :data="row.classes" border size="small" class="nested-class-table" empty-text="暂无教学班">
              <el-table-column prop="class_code" label="教学班编号" width="130" />
              <el-table-column prop="class_name" label="教学班名称" min-width="180" />
              <el-table-column prop="teacher_name" label="任课教师" width="110" />
              <el-table-column prop="capacity" label="容量" width="80" />
              <el-table-column prop="selected_count" label="已选" width="80" />
              <el-table-column prop="remaining_count" label="剩余" width="80" />
              <el-table-column prop="waitlist_count" label="候补" width="80" />
              <el-table-column label="状态" width="100">
                <template #default="{ row: classRow }">
                  <el-tag :type="classState(classRow).type" size="small">{{ classState(classRow).text }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" fixed="right" width="180">
                <template #default="{ row: classRow }">
                  <el-button link type="primary" @click="openDrawer(classRow, 'selections')">选课记录</el-button>
                  <el-button link type="warning" @click="openDrawer(classRow, 'waitlist')">候补队列</el-button>
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
      <el-pagination
        v-model:current-page="coursePage"
        v-model:page-size="coursePageSize"
        class="monitor-pagination"
        :page-sizes="[10, 20, 50]"
        :total="courseGroups.length"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="coursePage = 1"
      />
    </section>

    <section class="plain-panel monitor-panel">
      <div class="section-head">
        <h2 class="section-title">候补队列</h2>
        <div class="section-tools">
          <el-input
            v-model="waitlistKeyword"
            clearable
            placeholder="课程名称 / 学号"
            @keyup.enter="searchWaitlist"
            @clear="searchWaitlist"
          />
          <el-button :icon="Search" aria-label="搜索候补队列" @click="searchWaitlist" />
          <span class="section-count">{{ waitlistGroups.length }} 门课程</span>
        </div>
      </div>
      <el-table
        :data="pagedWaitlistGroups"
        border
        row-key="course_id"
        v-loading="loading"
        empty-text="当前轮次暂无候补队列"
      >
        <el-table-column type="expand" width="52">
          <template #default="{ row }">
            <el-table :data="row.classes" border size="small" class="nested-class-table" empty-text="暂无候补队列">
              <el-table-column prop="class_code" label="教学班编号" width="130" />
              <el-table-column prop="class_name" label="教学班名称" min-width="200" />
              <el-table-column prop="teacher_name" label="任课教师" width="120" />
              <el-table-column prop="waitlist_count" label="排队人数" width="100" />
              <el-table-column label="操作" fixed="right" width="120">
                <template #default="{ row: classRow }">
                  <el-button link type="primary" @click="openDrawer(classRow, 'waitlist')">查看候补</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </el-table-column>
        <el-table-column prop="course_code" label="课程代码" width="140" />
        <el-table-column prop="course_name" label="课程名称" min-width="220" />
        <el-table-column prop="credit" label="学分" width="90" />
        <el-table-column prop="hours" label="学时" width="90" />
        <el-table-column label="候补教学班数" width="140">
          <template #default="{ row }">{{ row.classes.length }}</template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="waitlistPage"
        v-model:page-size="waitlistPageSize"
        class="monitor-pagination"
        :page-sizes="[10, 20, 50]"
        :total="waitlistGroups.length"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="waitlistPage = 1"
      />
    </section>

    <el-drawer v-model="drawerVisible" :title="drawerTitle" size="760px">
      <el-table :data="drawerRows" border v-loading="drawerLoading" empty-text="暂无记录">
        <template v-if="drawerType === 'selections'">
          <el-table-column prop="student_no" label="学号" width="130" />
          <el-table-column prop="student_name" label="姓名" width="110" />
          <el-table-column prop="admin_class_name" label="行政班" min-width="140" />
          <el-table-column prop="status" label="状态" width="110">
            <template #default="{ row }">{{ statusLabel(row.status) }}</template>
          </el-table-column>
          <el-table-column prop="selected_at" label="选课时间" width="180" />
        </template>
        <template v-else>
          <el-table-column prop="queue_no" label="排队序号" width="100" />
          <el-table-column prop="student_no" label="学号" width="130" />
          <el-table-column prop="student_name" label="姓名" width="110" />
          <el-table-column prop="admin_class_name" label="行政班" min-width="140" />
          <el-table-column prop="waited_at" label="候补时间" width="180" />
        </template>
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { apiGet } from '../../api/http'
import { groupTeachingClasses, paginateItems } from '../../utils/courseClassHierarchy'

const loading = ref(false)
const overview = ref<Record<string, any>>({})
const capacityKeyword = ref('')
const waitlistKeyword = ref('')
const coursePage = ref(1)
const coursePageSize = ref(10)
const waitlistPage = ref(1)
const waitlistPageSize = ref(10)
const drawerVisible = ref(false)
const drawerLoading = ref(false)
const drawerRows = ref<any[]>([])
const drawerType = ref<'selections' | 'waitlist'>('selections')
const activeClass = ref<Record<string, any> | null>(null)

const currentRound = computed(() => overview.value.round || null)
const classes = computed<any[]>(() => overview.value.classes || [])
const courseGroups = computed(() => groupTeachingClasses(
  classes.value.filter((item) => Number(item.capacity_match) === 1)
))
const pagedCourseGroups = computed(() => paginateItems(courseGroups.value, coursePage.value, coursePageSize.value))
const waitlistGroups = computed(() => groupTeachingClasses(
  classes.value.filter((item) => Number(item.waitlist_count || 0) > 0 && Number(item.waitlist_match) === 1)
))
const pagedWaitlistGroups = computed(() => paginateItems(
  waitlistGroups.value,
  waitlistPage.value,
  waitlistPageSize.value
))

const drawerTitle = computed(() => {
  const className = activeClass.value ? `${activeClass.value.class_code} ${activeClass.value.course_name}` : ''
  const typeText = drawerType.value === 'selections' ? '选课记录' : '候补队列'
  return `${className} - ${typeText}`
})

watch([() => courseGroups.value.length, coursePageSize], ([total]) => {
  coursePage.value = clampPage(coursePage.value, Number(total), coursePageSize.value)
})
watch([() => waitlistGroups.value.length, waitlistPageSize], ([total]) => {
  waitlistPage.value = clampPage(waitlistPage.value, Number(total), waitlistPageSize.value)
})

onMounted(load)

async function load() {
  loading.value = true
  try {
    overview.value = await apiGet<Record<string, any>>('/admin/selection-monitor/overview', {
      capacityKeyword: capacityKeyword.value.trim(),
      waitlistKeyword: waitlistKeyword.value.trim()
    })
    coursePage.value = 1
    waitlistPage.value = 1
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    loading.value = false
  }
}

function searchCapacity() {
  coursePage.value = 1
  load()
}

function searchWaitlist() {
  waitlistPage.value = 1
  load()
}

async function openDrawer(row: Record<string, any>, type: 'selections' | 'waitlist') {
  activeClass.value = row
  drawerType.value = type
  drawerRows.value = []
  drawerVisible.value = true
  drawerLoading.value = true
  try {
    drawerRows.value = await apiGet<any[]>(`/admin/selection-monitor/classes/${row.teaching_class_id}/${type}`)
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    drawerLoading.value = false
  }
}

function classState(row: Record<string, any>) {
  if (row.status !== 'open') return { text: statusLabel(row.status), type: 'info' as const }
  if (Number(row.remaining_count || 0) <= 0) return { text: '已满', type: 'danger' as const }
  if (Number(row.waitlist_count || 0) > 0) return { text: '候补中', type: 'warning' as const }
  return { text: '可选', type: 'success' as const }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    processing: '处理中',
    selected: '已选',
    dropped: '已退课',
    waiting: '候补中',
    failed: '失败',
    open: '开放',
    closed: '关闭',
    draft: '草稿'
  }
  return map[status] || status || '-'
}

function clampPage(page: number, total: number, pageSize: number) {
  return Math.min(page, Math.max(1, Math.ceil(total / pageSize)))
}
</script>

<style scoped>
.page-head,
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.round-empty,
.monitor-panel + .monitor-panel {
  margin-top: 16px;
}

.section-head {
  margin-bottom: 12px;
}

.section-title {
  margin: 0;
}

.section-count {
  color: #606266;
  font-size: 13px;
  white-space: nowrap;
}

.section-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-tools .el-input {
  width: 220px;
}

.nested-class-table {
  margin: 8px 16px 12px;
  width: calc(100% - 32px);
}

.monitor-pagination {
  justify-content: flex-end;
  margin-top: 14px;
}

@media (max-width: 760px) {
  .page-head,
  .section-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .section-tools {
    width: 100%;
    flex-wrap: wrap;
  }

  .monitor-pagination {
    justify-content: flex-start;
    overflow-x: auto;
  }
}
</style>
