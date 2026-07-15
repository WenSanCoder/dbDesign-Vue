<template>
  <section class="teacher-governance"><div class="heading"><div><h1>教学班治理</h1><p>查看成绩审核批次，向教学班学生发布通知。</p></div><el-button @click="loadAll">刷新</el-button></div><el-table :data="batches" border><el-table-column prop="class_name" label="教学班"/><el-table-column prop="course_name" label="课程"/><el-table-column prop="submission_no" label="提交批次"/><el-table-column prop="status" label="审核状态"/><el-table-column prop="submitted_at" label="提交时间"/></el-table><el-divider/><el-form inline><el-form-item label="教学班 ID"><el-input v-model="noticeForm.teachingClassId"/></el-form-item><el-form-item label="标题"><el-input v-model="noticeForm.title"/></el-form-item><el-form-item label="内容"><el-input v-model="noticeForm.content"/></el-form-item><el-button type="primary" @click="publish">发布通知</el-button></el-form></section>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'; import { ElMessage } from 'element-plus'; import { apiGet, apiPost } from '../../api/http'; import { useSessionStore } from '../../stores/session'
const session=useSessionStore(); const batches=ref<any[]>([]); const noticeForm=reactive({teachingClassId:'',title:'',content:'',noticeType:'normal'})
async function loadAll(){const id=session.user?.related_id;if(id)batches.value=await apiGet<any[]>(`/governance/grade-batches?teacherId=${id}`)}
async function publish(){const id=session.user?.related_id;if(!id)return;await apiPost(`/governance/teachers/${id}/classes/${noticeForm.teachingClassId}/notices`,noticeForm);noticeForm.title='';noticeForm.content='';ElMessage.success('通知已发布')}
onMounted(loadAll)
</script>
<style scoped>.teacher-governance{padding:24px}.heading{display:flex;justify-content:space-between;margin-bottom:18px}h1{margin:0 0 6px;color:#183b56}.heading p{margin:0;color:#718096}</style>
