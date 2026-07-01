# ol-location-navigation

OpenLayers 定位导航组件，支持经纬度地图和室内图片地图两种模式。

## Demo

GitHub Pages:

https://glzcc.github.io/ol-location-navigation/

## 第一版能力

- JSON 路网导入导出：节点、边、楼层、POI。
- 最短路径规划：Dijkstra，支持权重、禁行边、单向边。
- 导航提示：根据路线生成分段距离和到达提示。
- OpenLayers 渲染：底图、路网、POI、路径、当前位置。
- 基础编辑：添加节点、连接节点、拖动节点。
- Vue、React、Vanilla 适配器。

## 开发

```bash
npm install
npm run dev
```

## 核心用法

```ts
import { OlLocationNavigationCore } from '@gl-zcc/ol-location-navigation';

const navigation = new OlLocationNavigationCore(container, {
  mapConfig,
  network,
  pois
});

navigation.setStart({ type: 'poi', id: 'poi-entrance' });
navigation.setEnd({ type: 'poi', id: 'poi-office' });
const route = navigation.planRoute();
```
