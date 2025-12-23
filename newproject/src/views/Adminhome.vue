<script lang="ts" setup>
import Datatable from '@/components/Datatable.vue'
import userDatetable from '@/components/userDatatable.vue'
import { ref } from 'vue'

import type { TabsPaneContext } from 'element-plus'

const activeName = ref('first')

const handleClick = (tab: TabsPaneContext, event: Event) => {
  console.log(tab, event)
}
</script>

<template>
  <el-container class="container">
    <el-tabs v-model="activeName" class="demo-tabs" @tab-click="handleClick">
      <el-tab-pane label="Books" name="first">
        <Datatable></Datatable>
      </el-tab-pane>
      <el-tab-pane label="Users" name="second">
        <userDatetable></userDatetable>
      </el-tab-pane>
    </el-tabs>
  </el-container>
</template>

<style scoped>
.container {
  /* Fill the viewport minus the fixed Topbar (56px) */
  height: calc(100vh - 56px);
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.demo-tabs {
  width: 100%;
  height: 100%;
}

/* Make tab content stretch when using scoped styles */
:deep(.el-tabs__content) {
  height: 100%;
}
</style>