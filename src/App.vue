<template>
  <main class="app-shell">
    <aside class="control-panel">
      <header class="panel-header">
        <p class="eyebrow">OpenLayers 导航组件</p>
        <h1>定位导航工作台</h1>
      </header>

      <section class="panel-section">
        <h2>地图模式</h2>
        <div class="segmented">
          <button
            type="button"
            :class="{ active: mapKind === 'image' }"
            @click="switchMap('image')"
          >
            室内图
          </button>
          <button type="button" :class="{ active: mapKind === 'geo' }" @click="switchMap('geo')">
            经纬度
          </button>
        </div>
      </section>

      <section class="panel-section">
        <h2>起终点</h2>
        <label class="field">
          <span>起点</span>
          <select v-model="startPoiId">
            <option v-for="poi in pois" :key="poi.id" :value="poi.id">{{ poi.name }}</option>
          </select>
        </label>
        <label class="field">
          <span>终点</span>
          <select v-model="endPoiId">
            <option v-for="poi in pois" :key="poi.id" :value="poi.id">{{ poi.name }}</option>
          </select>
        </label>
        <div class="button-row">
          <button class="primary-button" type="button" @click="handlePlanRoute">规划路径</button>
          <button class="ghost-button" type="button" @click="simulatePosition">模拟定位</button>
        </div>
      </section>

      <section class="panel-section">
        <h2>编辑</h2>
        <div class="tool-grid">
          <button
            v-for="item in modes"
            :key="item.mode"
            type="button"
            :class="{ active: mode === item.mode }"
            @click="mode = item.mode"
          >
            {{ item.label }}
          </button>
        </div>
      </section>

      <section class="panel-section">
        <h2>路线结果</h2>
        <p v-if="!route" class="empty-state">选择起终点后开始规划</p>
        <template v-else>
          <div class="metric">
            <span>总距离</span>
            <strong>{{ formatDistance(route.distance) }}</strong>
          </div>
          <ol class="instruction-list">
            <li v-for="instruction in route.instructions" :key="instruction.id">
              {{ instruction.text }}
            </li>
          </ol>
        </template>
      </section>

      <section class="panel-section">
        <h2>路网数据</h2>
        <div class="button-row">
          <button class="ghost-button" type="button" @click="downloadNetwork">导出 JSON</button>
          <label class="ghost-button file-button">
            导入 JSON
            <input hidden type="file" accept="application/json" @change="importNetwork" />
          </label>
        </div>
        <p v-if="lastMessage" class="status-line">{{ lastMessage }}</p>
      </section>
    </aside>

    <section class="map-wrap">
      <OlLocationNavigation
        :key="mapKind"
        :map-config="mapConfig"
        :network="network"
        :pois="pois"
        :mode="mode"
        @ready="navigation = $event"
        @routeplanned="route = $event"
        @routeerror="lastMessage = $event.message"
        @networkchange="handleNetworkChange"
        @featureclick="handleFeatureClick"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import OlLocationNavigation from './adapters/vue/OlLocationNavigation.vue';
import { formatDistance } from './core/instructions';
import { parseNavigationNetwork, serializeNavigationNetwork } from './lib/navigationJson';
import type {
  NavigationInteractionMode,
  NavigationMapConfig,
  NavigationNetwork,
  NavPoi,
  OlLocationNavigationCore,
  RouteResult
} from './index';

type MapKind = 'image' | 'geo';

const imageNetwork: NavigationNetwork = {
  floors: [{ id: 'F1', name: '一层' }],
  nodes: [
    { id: 'entrance', coord: [72, 386], floorId: 'F1', label: '入口', type: 'entrance' },
    { id: 'hall', coord: [183, 386], floorId: 'F1', label: '大厅' },
    { id: 'corridor', coord: [183, 242], floorId: 'F1', label: '走廊' },
    { id: 'meeting', coord: [328, 242], floorId: 'F1', label: '会议室', type: 'poi' },
    { id: 'office', coord: [328, 126], floorId: 'F1', label: '办公室', type: 'poi' },
    { id: 'stairs', coord: [94, 126], floorId: 'F1', label: '楼梯', type: 'stairs' }
  ],
  edges: [
    { id: 'e-entrance-hall', from: 'entrance', to: 'hall', type: 'walk', bidirectional: true },
    { id: 'e-hall-corridor', from: 'hall', to: 'corridor', type: 'walk', bidirectional: true },
    { id: 'e-corridor-meeting', from: 'corridor', to: 'meeting', type: 'walk', bidirectional: true },
    { id: 'e-meeting-office', from: 'meeting', to: 'office', type: 'walk', bidirectional: true },
    { id: 'e-corridor-stairs', from: 'corridor', to: 'stairs', type: 'walk', bidirectional: true }
  ]
};

const geoNetwork: NavigationNetwork = {
  nodes: [
    { id: 'tiananmen', coord: [116.39747, 39.90873], label: '天安门' },
    { id: 'east', coord: [116.4012, 39.9087], label: '东侧路口' },
    { id: 'park', coord: [116.4012, 39.9121], label: '公园入口' },
    { id: 'north', coord: [116.3977, 39.9121], label: '北侧广场' }
  ],
  edges: [
    { id: 'g1', from: 'tiananmen', to: 'east', bidirectional: true, type: 'road' },
    { id: 'g2', from: 'east', to: 'park', bidirectional: true, type: 'road' },
    { id: 'g3', from: 'park', to: 'north', bidirectional: true, type: 'road' },
    { id: 'g4', from: 'north', to: 'tiananmen', bidirectional: true, type: 'road' }
  ]
};

const mapKind = ref<MapKind>('image');
const mode = ref<NavigationInteractionMode>('browse');
const navigation = ref<OlLocationNavigationCore | null>(null);
const network = ref<NavigationNetwork>(imageNetwork);
const route = ref<RouteResult | null>(null);
const startPoiId = ref('poi-entrance');
const endPoiId = ref('poi-office');
const lastMessage = ref('');

const modes: { mode: NavigationInteractionMode; label: string }[] = [
  { mode: 'browse', label: '浏览' },
  { mode: 'plan', label: '选点' },
  { mode: 'edit-select', label: '拖点' },
  { mode: 'edit-node', label: '加点' },
  { mode: 'edit-edge', label: '连线' }
];

const mapConfig = computed<NavigationMapConfig>(() =>
  mapKind.value === 'image'
    ? {
        mode: 'image',
        image: {
          url: `${import.meta.env.BASE_URL}indoor-demo.svg`,
          width: 451,
          height: 451,
          metersPerPixel: 0.12
        },
        center: [225, 225],
        zoom: 2
      }
    : {
        mode: 'geo',
        center: [116.399, 39.91],
        zoom: 16
      }
);

const pois = computed<NavPoi[]>(() =>
  mapKind.value === 'image'
    ? [
        { id: 'poi-entrance', name: '入口', coord: [72, 386], floorId: 'F1', nodeId: 'entrance' },
        { id: 'poi-meeting', name: '会议室', coord: [328, 242], floorId: 'F1', nodeId: 'meeting' },
        { id: 'poi-office', name: '办公室', coord: [328, 126], floorId: 'F1', nodeId: 'office' }
      ]
    : [
        { id: 'poi-entrance', name: '天安门', coord: [116.39747, 39.90873], nodeId: 'tiananmen' },
        { id: 'poi-meeting', name: '公园入口', coord: [116.4012, 39.9121], nodeId: 'park' },
        { id: 'poi-office', name: '北侧广场', coord: [116.3977, 39.9121], nodeId: 'north' }
      ]
);

function switchMap(kind: MapKind): void {
  mapKind.value = kind;
  network.value = kind === 'image' ? imageNetwork : geoNetwork;
  route.value = null;
  lastMessage.value = '';
  startPoiId.value = 'poi-entrance';
  endPoiId.value = kind === 'image' ? 'poi-office' : 'poi-meeting';
}

function handlePlanRoute(): void {
  if (!navigation.value) {
    return;
  }
  navigation.value.setStart({ type: 'poi', id: startPoiId.value });
  navigation.value.setEnd({ type: 'poi', id: endPoiId.value });
  route.value = navigation.value.planRoute();
  navigation.value.fitToRoute();
  lastMessage.value = '路径规划完成';
}

function simulatePosition(): void {
  const firstNodeId = route.value?.nodeIds[0];
  const firstNode = network.value.nodes.find(node => node.id === firstNodeId);
  if (!firstNode) {
    lastMessage.value = '请先规划路线';
    return;
  }

  navigation.value?.updatePosition({
    coord: firstNode.coord,
    floorId: firstNode.floorId,
    source: 'simulated'
  });
  lastMessage.value = '已模拟当前位置';
}

function handleNetworkChange(nextNetwork: NavigationNetwork): void {
  network.value = nextNetwork;
  route.value = null;
  lastMessage.value = '路网已更新';
}

function handleFeatureClick(payload: { kind: 'node' | 'edge' | 'poi'; id: string }): void {
  lastMessage.value = `选中 ${payload.kind}: ${payload.id}`;
}

function downloadNetwork(): void {
  const blob = new Blob([serializeNavigationNetwork(network.value)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'navigation-network.json';
  link.click();
  URL.revokeObjectURL(url);
}

async function importNetwork(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  try {
    network.value = parseNavigationNetwork(await file.text());
    navigation.value?.importNetwork(network.value);
    route.value = null;
    lastMessage.value = '导入成功';
  } catch (error) {
    lastMessage.value = error instanceof Error ? error.message : '导入失败';
  } finally {
    input.value = '';
  }
}
</script>
