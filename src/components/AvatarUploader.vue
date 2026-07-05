<template>
  <div class="avatar-uploader">
    <button class="avatar-trigger" type="button" @click="openPicker">
      <el-avatar :size="avatarSize" :src="avatarUrl || undefined" class="avatar-image">
        {{ fallbackText }}
      </el-avatar>
      <span class="avatar-mask">上传头像</span>
    </button>
    <input ref="fileInput" class="file-input" type="file" accept="image/png,image/jpeg,image/webp" @change="onFileChange" />

    <el-dialog v-model="dialogVisible" title="裁剪头像" width="520px" destroy-on-close>
      <div class="cropper-layout">
        <canvas ref="canvasRef" class="crop-canvas" width="256" height="256"></canvas>
        <div class="crop-controls">
          <label>
            缩放
            <el-slider v-model="zoom" :min="1" :max="3" :step="0.05" />
          </label>
          <label>
            水平位置
            <el-slider v-model="offsetX" :min="-100" :max="100" />
          </label>
          <label>
            垂直位置
            <el-slider v-model="offsetY" :min="-100" :max="100" />
          </label>
          <div class="crop-tip">图片大小限制 1MB 以内。</div>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="uploadAvatar">上传</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { apiPostForm } from '../api/http'
import { resolveAvatarUrl } from '../utils/avatar'

const props = withDefaults(defineProps<{
  modelValue?: string | null
  userId?: number | null
  displayName?: string
  size?: number
}>(), {
  modelValue: '',
  userId: null,
  displayName: '',
  size: 84
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  uploaded: [value: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const dialogVisible = ref(false)
const uploading = ref(false)
const image = ref<HTMLImageElement | null>(null)
const objectUrl = ref('')
const zoom = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)

const avatarSize = computed(() => props.size)
const avatarUrl = computed(() => resolveAvatarUrl(props.modelValue))
const fallbackText = computed(() => (props.displayName || '用户').slice(0, 1))

watch([zoom, offsetX, offsetY], drawCanvas)

function openPicker() {
  fileInput.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    ElMessage.error('请选择 JPG、PNG 或 WebP 图片')
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    ElMessage.error('原始图片不能超过 8MB')
    return
  }

  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = URL.createObjectURL(file)
  const nextImage = new Image()
  nextImage.onload = async () => {
    image.value = nextImage
    zoom.value = 1
    offsetX.value = 0
    offsetY.value = 0
    dialogVisible.value = true
    await nextTick()
    drawCanvas()
  }
  nextImage.onerror = () => ElMessage.error('图片读取失败')
  nextImage.src = objectUrl.value
}

function drawCanvas() {
  const canvas = canvasRef.value
  const source = image.value
  if (!canvas || !source) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const size = canvas.width
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = '#f3f5f7'
  ctx.fillRect(0, 0, size, size)

  const baseScale = Math.max(size / source.width, size / source.height)
  const scale = baseScale * zoom.value
  const drawWidth = source.width * scale
  const drawHeight = source.height * scale
  const maxX = Math.max(0, (drawWidth - size) / 2)
  const maxY = Math.max(0, (drawHeight - size) / 2)
  const dx = (size - drawWidth) / 2 + (offsetX.value / 100) * maxX
  const dy = (size - drawHeight) / 2 + (offsetY.value / 100) * maxY

  ctx.drawImage(source, dx, dy, drawWidth, drawHeight)
}

async function uploadAvatar() {
  if (!props.userId) {
    ElMessage.error('当前用户信息缺失，无法上传头像')
    return
  }
  const canvas = canvasRef.value
  if (!canvas) return

  uploading.value = true
  try {
    const blob = await canvasToLimitedBlob(canvas)
    const form = new FormData()
    form.append('file', new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    const result = await apiPostForm<{ avatar_path: string; avatar_url: string }>(`/profile/${props.userId}/avatar`, form)
    emit('update:modelValue', result.avatar_path)
    emit('uploaded', result.avatar_path)
    dialogVisible.value = false
    ElMessage.success('头像上传成功')
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    uploading.value = false
  }
}

async function canvasToLimitedBlob(canvas: HTMLCanvasElement) {
  let quality = 0.9
  let blob = await canvasToBlob(canvas, quality)
  while (blob.size > 1024 * 1024 && quality > 0.45) {
    quality -= 0.1
    blob = await canvasToBlob(canvas, quality)
  }
  if (blob.size > 1024 * 1024) {
    throw new Error('头像压缩后仍超过 1MB，请换一张图片')
  }
  return blob
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('头像裁剪失败'))
    }, 'image/jpeg', quality)
  })
}
</script>

<style scoped>
.avatar-uploader {
  display: inline-flex;
}

.avatar-trigger {
  position: relative;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.avatar-image {
  border: 2px solid #dce8f3;
  background: #eaf4fb;
  color: #126899;
  font-weight: 600;
}

.avatar-mask {
  position: absolute;
  inset: auto 0 0;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 0 999px 999px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.16s ease;
}

.avatar-trigger:hover .avatar-mask {
  opacity: 1;
}

.file-input {
  display: none;
}

.cropper-layout {
  display: grid;
  grid-template-columns: 256px 1fr;
  gap: 20px;
  align-items: start;
}

.crop-canvas {
  width: 256px;
  height: 256px;
  border-radius: 50%;
  border: 1px solid #dcdfe6;
  background: #f3f5f7;
}

.crop-controls label {
  display: block;
  margin-bottom: 14px;
  color: #303133;
  font-size: 13px;
}

.crop-tip {
  color: #606266;
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .cropper-layout {
    grid-template-columns: 1fr;
  }
}
</style>
