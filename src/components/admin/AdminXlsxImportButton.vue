<template>
  <span class="xlsx-import">
    <input ref="fileInput" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden @change="handleFile" />
    <el-button :loading="uploading" @click="chooseFile">
      <img v-if="!uploading" class="import-icon" :src="importIconUrl" alt="" />
      <span>批量导入</span>
    </el-button>
  </span>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiPostForm } from '../../api/http'

const importIconUrl = new URL('../../../static/import.png', import.meta.url).href
const props = defineProps<{ importType:string; operatorUserId?:number }>()
const emit = defineEmits<{ imported:[result:any] }>()
const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)

function chooseFile() { fileInput.value?.click() }
async function handleFile(event:Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    await ElMessageBox.confirm(`确认导入文件“${file.name}”？任意一行失败时整批数据都会回滚。`, '批量导入', { type:'warning' })
    uploading.value = true
    const body = new FormData()
    body.append('file', file)
    const query = props.operatorUserId ? `?operatorUserId=${props.operatorUserId}` : ''
    const result = await apiPostForm<any>(`/admin/batch-import/${props.importType}${query}`, body)
    ElMessage.success(`成功导入 ${result.importedCount || 0} 条数据`)
    emit('imported', result)
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error((error as Error).message)
  } finally { uploading.value = false }
}
</script>

<style scoped>
.xlsx-import {
  display: inline-flex;
}

.import-icon {
  width: 16px;
  height: 16px;
  margin-right: 6px;
  object-fit: contain;
}
</style>
