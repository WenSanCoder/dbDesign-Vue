<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">抢课监控</h1>
        <p class="page-subtitle">实时查看选课请求、教学班容量、候补队列和异常请求。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="load">刷新</el-button>
    </div>

    <section class="plain-panel filter-panel">
      <el-select v-model="roundId" clearable placeholder="全部轮次" style="width: 220px">
        <el-option
          v-for="round in rounds"
          :key="round.round_id"
          :label="`${round.academic_year} 第${round.semester}学期 ${round.round_name}`"
          :value="round.round_id"
        />
      </el-select>
      <el-select v-model="classStatus" clearable placeholder="全部状态" style="width: 160px">
        <el-option label="开放" value="open" />
        <el-option label="关闭" value="closed" />
        <el-option label="草稿" value="draft" />
      </el-select>
      <el-input v-model="keyword" clearable placeholder="搜索课程 / 教学班 / 教师" style="width: 280px" />
    </section>

    <section class="metric-grid">
      <div class="metric-card">
        <span>请求总数</span>
        <strong>{{ summary.total_requests || 0 }}</strong>
      </div>
      <div class="metric-card">
        <span>成功选课</span>
        <strong>{{ summary.success_count || 0 }}</strong>
      </div>
      <div class="metric-card">
        <span>候补人数</span>
        <strong>{{ summary.waitlist_count || 0 }}</strong>
      </div>
      <div class="metric-card danger">
        <span>失败请求</span>
        <strong>{{ summary.failed_count || 0 }}</strong>
      </div>
      <div class="metric-card warning">
        <span>满员教学班</span>
        <strong>{{ summary.full_class_count || 0 }}</strong>
      </div>
    </section>

    <section class="analysis-grid">
      <div class="plain-panel chart-panel">
        <h2 class="section-title">请求状态分布</h2>
        <div v-for="item in statusDistribution" :key="item.status" class="bar-row">
          <span>{{ statusLabel(item.status) }}</span>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: barWidth(item.count, statusMax) }" />
          </div>
          <strong>{{ item.count }}</strong>
        </div>
      </div>

      <div class="plain-panel chart-panel">
        <h2 class="section-title">热门教学班 Top10</h2>
        <div v-for="item in hotClasses" :key="item.teaching_class_id" class="rank-row">
          <span>{{ item.class_code }} {{ item.course_name }}</span>
          <strong>{{ item.selected_count }}</strong>
        </div>
      </div>

      <div class="plain-panel chart-panel">
        <h2 class="section-title">候补队列 Top10</h2>
        <div v-for="item in waitlistTop" :key="item.teaching_class_id" class="rank-row">
          <span>{{ item.class_code }} {{ item.course_name }}</span>
          <strong>{{ item.waitlist_count }}</strong>
        </div>
      </div>
    </section>

    <section class="plain-panel">
      <div class="table-head">
        <h2 class="section-title">教学班容量监控</h2>
        <span class="muted">Redis 剩余容量当前按数据库容量实时折算，后续可接入 Redis 实时库存。</span>
      </div>
      <el-table :data="filteredClasses" border height="520" v-loading="loading">
        <el-table-column prop="class_code" label="教学班编号" width="130" />
        <el-table-column prop="course_name" label="课程名称" min-width="170" />
        <el-table-column prop="teacher_name" label="教师" width="110" />
        <el-table-column prop="capacity" label="容量" width="90" />
        <el-table-column prop="selected_count" label="已选" width="90" />
        <el-table-column prop="remaining_count" label="剩余" width="90" />
        <el-table-column prop="waitlist_count" label="候补" width="90" />
        <el-table-column prop="redis_remaining" label="Redis剩余" width="120" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="classState(row).type">{{ classState(row).text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="250">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDrawer(row, 'selections')">选课记录</el-button>
            <el-button link type="warning" @click="openDrawer(row, 'waitlist')">候补列表</el-button>
            <el-button link type="info" @click="openDrawer(row, 'logs')">请求日志</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-drawer v-model="drawerVisible" :title="drawerTitle" size="760px">
      <el-table :data="drawerRows" border v-loading="drawerLoading">
        <template v-if="drawerType === 'selections'">
          <el-table-column prop="student_no" label="学号" width="130" />
          <el-table-column prop="student_name" label="姓名" width="110" />
          <el-table-column prop="admin_class_name" label="行政班" min-width="140" />
          <el-table-column prop="status" label="状态" width="110">
            <template #default="{ row }">{{ statusLabel(row.status) }}</template>
          </el-table-column>
          <el-table-column prop="selected_at" label="选课时间" width="180" />
        </template>
        <template v-else-if="drawerType === 'waitlist'">
          <el-table-column prop="queue_no" label="排队序号" width="100" />
          <el-table-column prop="student_no" label="学号" width="130" />
          <el-table-column prop="student_name" label="姓名" width="110" />
          <el-table-column prop="admin_class_name" label="行政班" min-width="140" />
          <el-table-column prop="waited_at" label="候补时间" width="180" />
        </template>
        <template v-else>
          <el-table-column prop="request_id" label="请求ID" min-width="170" />
          <el-table-column prop="student_no" label="学号" width="130" />
          <el-table-column prop="student_name" label="姓名" width="110" />
          <el-table-column prop="request_status" label="请求状态" width="120" />
          <el-table-column prop="mq_status" label="队列状态" width="120" />
        </template>
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { apiGet } from '../../api/http'

const loading = ref(false)
const overview = ref<Record<string, any>>({})
const keyword = ref('')
const classStatus = ref('')
const roundId = ref<number | undefined>()
const drawerVisible = ref(false)
const drawerLoading = ref(false)
const drawerRows = ref<any[]>([])
const drawerType = ref<'selections' | 'waitlist' | 'logs'>('selections')
const activeClass = ref<Record<string, any> | null>(null)

const summary = computed(() => overview.value.summary || {})
const rounds = computed(() => overview.value.rounds || [])
const classes = computed(() => overview.value.classes || [])
const statusDistribution = computed(() => overview.value.statusDistribution || [])
const hotClasses = computed(() => overview.value.hotClasses || [])
const waitlistTop = computed(() => overview.value.waitlistTop || [])
const statusMax = computed(() => Math.max(1, ...statusDistribution.value.map((item: any) => Number(item.count || 0))))
const selectedRoundTermId = computed(() => rounds.value.find((item: any) => item.round_id === roundId.value)?.term_id)

const filteredClasses = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  return classes.value.filter((item: any) => {
    const matchRound = !selectedRoundTermId.value || item.term_id === selectedRoundTermId.value
    const matchStatus = !classStatus.value || item.status === classStatus.value
    const merged = `${item.class_code || ''} ${item.class_name || ''} ${item.course_name || ''} ${item.teacher_name || ''}`.toLowerCase()
    return matchRound && matchStatus && (!text || merged.includes(text))
  })
})

const drawerTitle = computed(() => {
  const className = activeClass.value ? `${activeClass.value.class_code} ${activeClass.value.course_name}` : ''
  const typeText = drawerType.value === 'selections' ? '选课记录' : drawerType.value === 'waitlist' ? '候补列表' : '请求日志'
  return `${className} - ${typeText}`
})

onMounted(load)

async function load() {
  loading.value = true
  try {
    overview.value = await apiGet<Record<string, any>>('/admin/selection-monitor/overview')
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    loading.value = false
  }
}

async function openDrawer(row: Record<string, any>, type: 'selections' | 'waitlist' | 'logs') {
  activeClass.value = row
  drawerType.value = type
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

function barWidth(count: number, max: number) {
  return `${Math.max(6, Math.round((Number(count || 0) / max) * 100))}%`
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

.filter-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.metric-card {
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.metric-card span {
  display: block;
  color: #64748b;
  font-size: 13px;
}

.metric-card strong {
  display: block;
  margin-top: 10px;
  color: #111827;
  font-size: 28px;
}

.metric-card.warning strong {
  color: #d97706;
}

.metric-card.danger strong {
  color: #dc2626;
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.chart-panel {
  min-height: 230px;
}

.bar-row,
.rank-row {
  display: grid;
  grid-template-columns: 92px 1fr 54px;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  color: #334155;
  font-size: 13px;
}

.rank-row {
  grid-template-columns: 1fr 54px;
}

.bar-track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #e5e7eb;
}

.bar-fill {
  height: 100%;
  border-radius: inherit;
  background: #2563eb;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.muted {
  color: #64748b;
  font-size: 13px;
}

@media (max-width: 1180px) {
  .metric-grid,
  .analysis-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .page-head,
  .filter-panel,
  .table-head {
    align-items: stretch;
    flex-direction: column;
  }

  .metric-grid,
  .analysis-grid {
    grid-template-columns: 1fr;
  }
}
</style>
