<template>
  <div class="page">
    <h1 class="page-title">教室占用查询</h1>

    <section class="plain-panel">
      <div class="filter-row">
        <el-select v-model="filters.termId" filterable placeholder="学年学期" style="width: 190px">
          <el-option v-for="term in termOptions" :key="term.term_id" :label="termLabel(term)" :value="term.term_id" />
        </el-select>
        <el-select v-model="filters.campusId" clearable filterable placeholder="校区" style="width: 150px">
          <el-option v-for="campus in campusOptions" :key="campus.campus_id" :label="campus.campus_name" :value="campus.campus_id" />
        </el-select>
        <el-select v-model="filters.weekday" clearable placeholder="星期" style="width: 120px">
          <el-option v-for="day in weekdayOptions" :key="day.value" :label="day.label" :value="day.value" />
        </el-select>
        <el-input v-model="filters.startPeriod" inputmode="numeric" placeholder="开始课次" style="width: 110px" />
        <el-input v-model="filters.endPeriod" inputmode="numeric" placeholder="结束课次" style="width: 110px" />
        <el-button type="primary" @click="load">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </div>
    </section>

    <section class="plain-panel">
      <el-table
        :data="buildingGroups"
        border
        height="640"
        row-key="building_id"
        v-loading="loading"
        empty-text="无相关数据"
      >
        <el-table-column type="expand" width="52">
          <template #default="{ row: building }">
            <el-table :data="building.floors" border size="small" row-key="floor_key" class="nested-room-table">
              <el-table-column type="expand" width="52">
                <template #default="{ row: floor }">
                  <el-table :data="floor.rooms" border size="small" row-key="classroom_id" class="nested-room-table">
                    <el-table-column prop="room_name" label="教室" width="160" />
                    <el-table-column label="类型" width="90">
                      <template #default="{ row: room }">{{ room.room_type === 'large' ? '大教室' : '小教室' }}</template>
                    </el-table-column>
                    <el-table-column prop="capacity" label="容量" width="80" />
                    <el-table-column label="状态" width="90">
                      <template #default="{ row: room }">
                        <el-tag :type="room.occupancies.length ? 'danger' : 'success'" size="small">
                          {{ room.occupancies.length ? '占用' : '空闲' }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column label="占用情况" min-width="520">
                      <template #default="{ row: room }">
                        <div v-if="room.occupancies.length" class="occupancy-list">
                          <div v-for="item in room.occupancies" :key="item.schedule_id" class="occupancy-item">
                            <strong>{{ item.class_name }}</strong>
                            <span>{{ item.teacher_name || '-' }}</span>
                            <span>{{ weekdayText(item.weekday) }} 第{{ item.start_period }}-{{ item.end_period }}节</span>
                            <span>{{ item.weeks || weekText(item) }}</span>
                          </div>
                        </div>
                        <span v-else class="muted-text">该时间段空闲</span>
                      </template>
                    </el-table-column>
                  </el-table>
                </template>
              </el-table-column>
              <el-table-column prop="floor_label" label="楼层" min-width="160" />
              <el-table-column label="教室数" width="110">
                <template #default="{ row: floor }">{{ floor.rooms.length }}</template>
              </el-table-column>
              <el-table-column label="占用教室" width="120">
                <template #default="{ row: floor }">{{ occupiedRoomCount(floor.rooms) }}</template>
              </el-table-column>
            </el-table>
          </template>
        </el-table-column>
        <el-table-column prop="campus_name" label="校区" width="140" />
        <el-table-column prop="building_name" label="教学楼" min-width="220" />
        <el-table-column label="楼层数" width="110">
          <template #default="{ row }">{{ row.floors.length }}</template>
        </el-table-column>
        <el-table-column label="教室数" width="110">
          <template #default="{ row }">{{ row.room_count }}</template>
        </el-table-column>
        <el-table-column label="占用教室" width="120">
          <template #default="{ row }">{{ row.occupied_room_count }}</template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { apiGet } from '../../api/http'

const weekdayOptions = [
  { label: '星期一', value: 1 },
  { label: '星期二', value: 2 },
  { label: '星期三', value: 3 },
  { label: '星期四', value: 4 },
  { label: '星期五', value: 5 },
  { label: '星期六', value: 6 },
  { label: '星期日', value: 7 }
]

const filters = reactive({
  termId: undefined as number | undefined,
  campusId: undefined as number | undefined,
  weekday: undefined as number | undefined,
  startPeriod: '1',
  endPeriod: '12'
})

const lookups = ref<Record<string, any[]>>({})
const rows = ref<any[]>([])
const loading = ref(false)

const termOptions = computed(() => lookups.value.terms || [])
const campusOptions = computed(() => lookups.value.campuses || [])
const buildingGroups = computed(() => {
  const buildingMap = new Map<number, any>()

  rows.value.forEach((row) => {
    const buildingId = Number(row.building_id)
    if (!buildingMap.has(buildingId)) {
      buildingMap.set(buildingId, {
        building_id: buildingId,
        building_name: row.building_name,
        campus_name: row.campus_name,
        floorMap: new Map<number, any>(),
        room_count: 0,
        occupied_room_count: 0
      })
    }

    const building = buildingMap.get(buildingId)
    const floorNo = Number(row.floor_no || 0)
    if (!building.floorMap.has(floorNo)) {
      building.floorMap.set(floorNo, {
        floor_key: `${buildingId}-${floorNo}`,
        floor_no: floorNo,
        floor_label: `${floorNo}楼`,
        rooms: []
      })
    }

    const floor = building.floorMap.get(floorNo)
    let room = floor.rooms.find((item: any) => Number(item.classroom_id) === Number(row.classroom_id))
    if (!room) {
      room = {
        classroom_id: row.classroom_id,
        room_name: row.room_name,
        room_type: row.room_type,
        capacity: row.capacity,
        occupancies: []
      }
      floor.rooms.push(room)
      building.room_count += 1
    }

    if (row.schedule_id) {
      room.occupancies.push(row)
    }
  })

  return Array.from(buildingMap.values()).map((building) => {
    const floors = Array.from(building.floorMap.values())
      .map((floor: any) => ({
        ...floor,
        rooms: floor.rooms.sort((a: any, b: any) => String(a.room_name || '').localeCompare(String(b.room_name || ''), 'zh-Hans-CN'))
      }))
      .sort((a: any, b: any) => Number(a.floor_no) - Number(b.floor_no))
    const occupied = floors.reduce((sum: number, floor: any) => sum + occupiedRoomCount(floor.rooms), 0)
    return {
      ...building,
      floors,
      occupied_room_count: occupied,
      floorMap: undefined
    }
  }).sort((a, b) => String(a.building_name || '').localeCompare(String(b.building_name || ''), 'zh-Hans-CN'))
})

onMounted(async () => {
  await loadLookups()
  reset()
  await load()
})

async function loadLookups() {
  lookups.value = await apiGet<Record<string, any[]>>('/lookups')
}

async function load() {
  loading.value = true
  try {
    rows.value = await apiGet<any[]>('/admin/room-schedules', {
      termId: filters.termId,
      campusId: filters.campusId,
      weekday: filters.weekday,
      startPeriod: numberOrUndefined(filters.startPeriod),
      endPeriod: numberOrUndefined(filters.endPeriod)
    })
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    loading.value = false
  }
}

function reset() {
  const currentTerm = termOptions.value.find((term) => term.is_current)
  filters.termId = currentTerm?.term_id || termOptions.value[0]?.term_id
  filters.campusId = undefined
  filters.weekday = undefined
  filters.startPeriod = '1'
  filters.endPeriod = '12'
}

function occupiedRoomCount(rooms: any[]) {
  return rooms.filter((room) => room.occupancies.length).length
}

function numberOrUndefined(value: string) {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? num : undefined
}

function termLabel(term: any) {
  return `${term.academic_year} 第${term.semester}学期`
}

function weekdayText(value: number) {
  return weekdayOptions.find((item) => item.value === Number(value))?.label || '-'
}

function weekText(row: any) {
  if (!row.schedule_id) return '-'
  const suffix = row.week_pattern === 'odd' ? '(单周)' : row.week_pattern === 'even' ? '(双周)' : ''
  return `${row.start_week}-${row.end_week}周${suffix}`
}
</script>

<style scoped>
.nested-room-table {
  margin: 8px 0 8px 12px;
}

.occupancy-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.occupancy-item {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  line-height: 1.5;
}

.muted-text {
  color: #909399;
}
</style>
