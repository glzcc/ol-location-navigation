import 'ol/ol.css';
import Feature from 'ol/Feature';
import OlMap from 'ol/Map';
import View from 'ol/View';
import ImageLayer from 'ol/layer/Image';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Modify from 'ol/interaction/Modify';
import Projection from 'ol/proj/Projection';
import Static from 'ol/source/ImageStatic';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { fromLonLat, toLonLat } from 'ol/proj';
import { unByKey } from 'ol/Observable';
import type { Coordinate } from 'ol/coordinate';
import type { EventsKey } from 'ol/events';
import type { Geometry } from 'ol/geom';
import { createNavigationId } from '../lib/id';
import { assertNavigationNetwork } from '../lib/navigationJson';
import { planRoute } from './routePlanner';
import { NavigationEventBus } from './events';
import {
  createEdgeStyle,
  createNodeStyle,
  createPoiStyle,
  createPositionStyle,
  createRouteStyle
} from './styles';
import type {
  NavigationEventHandler,
  NavigationEventName,
  NavigationInteractionMode,
  NavigationMapConfig,
  NavigationNetwork,
  NavigationPosition,
  NavEdge,
  NavNode,
  NavPoi,
  OlLocationNavigationOptions,
  RoutePointInput,
  RouteResult
} from '../types/navigation';

type NavFeature = Feature<Geometry>;

export class OlLocationNavigationCore {
  private readonly eventBus = new NavigationEventBus();
  private readonly edgeSource = new VectorSource<NavFeature>();
  private readonly nodeSource = new VectorSource<NavFeature>();
  private readonly poiSource = new VectorSource<NavFeature>();
  private readonly routeSource = new VectorSource<NavFeature>();
  private readonly positionSource = new VectorSource<NavFeature>();
  private readonly edgeLayer: VectorLayer<VectorSource<NavFeature>>;
  private readonly nodeLayer: VectorLayer<VectorSource<NavFeature>>;
  private readonly poiLayer: VectorLayer<VectorSource<NavFeature>>;
  private readonly routeLayer: VectorLayer<VectorSource<NavFeature>>;
  private readonly positionLayer: VectorLayer<VectorSource<NavFeature>>;
  private readonly map: OlMap;
  private readonly readonly: boolean;
  private clickKey: EventsKey | null = null;
  private modifyInteraction: Modify | null = null;
  private modifyKey: EventsKey | null = null;
  private pendingEdgeFrom: string | null = null;
  private selectedFeatureId: string | null = null;
  private startInput: RoutePointInput | null = null;
  private endInput: RoutePointInput | null = null;
  private route: RouteResult | null = null;
  private mode: NavigationInteractionMode;
  private mapConfig: NavigationMapConfig;
  private network: NavigationNetwork;
  private pois: NavPoi[];

  constructor(container: HTMLElement, options: OlLocationNavigationOptions) {
    this.mapConfig = options.mapConfig;
    this.network = options.network;
    this.pois = options.pois ?? [];
    this.mode = options.mode ?? 'browse';
    this.readonly = options.readonly ?? false;

    this.edgeLayer = new VectorLayer({
      source: this.edgeSource,
      style: feature => createEdgeStyle(feature, this.selectedFeatureId)
    });
    this.nodeLayer = new VectorLayer({
      source: this.nodeSource,
      style: feature => createNodeStyle(feature, this.selectedFeatureId)
    });
    this.poiLayer = new VectorLayer({ source: this.poiSource, style: createPoiStyle });
    this.routeLayer = new VectorLayer({ source: this.routeSource, style: createRouteStyle });
    this.positionLayer = new VectorLayer({ source: this.positionSource, style: createPositionStyle });

    this.map = new OlMap({
      target: container,
      layers: [
        this.createBaseLayer(),
        this.edgeLayer,
        this.routeLayer,
        this.nodeLayer,
        this.poiLayer,
        this.positionLayer
      ],
      view: this.createView(),
      controls: []
    });

    this.clickKey = this.map.on('singleclick', event => this.handleMapClick(event.coordinate, event.pixel));
    this.loadNetwork(this.network);
    this.setPois(this.pois);
    this.setMode(this.mode);
    this.fitToNetwork();
    this.eventBus.emit('ready', options);
  }

  setMode(mode: NavigationInteractionMode): void {
    this.mode = mode;
    this.pendingEdgeFrom = null;
    this.clearModifyInteraction();

    if (!this.readonly && mode === 'edit-select') {
      this.enableModifyInteraction();
    }

    this.eventBus.emit('modechange', mode);
  }

  setMapConfig(config: NavigationMapConfig): void {
    this.mapConfig = config;
    this.renderAll();
  }

  loadNetwork(network: NavigationNetwork): void {
    assertNavigationNetwork(network);
    this.network = cloneNetwork(network);
    this.renderNetwork();
    this.eventBus.emit('networkchange', this.exportNetwork());
  }

  setPois(pois: NavPoi[]): void {
    this.pois = pois.map(poi => ({ ...poi }));
    this.renderPois();
  }

  setStart(input: RoutePointInput | null): void {
    this.startInput = input;
    this.eventBus.emit('pointselect', { role: 'start', input });
  }

  setEnd(input: RoutePointInput | null): void {
    this.endInput = input;
    this.eventBus.emit('pointselect', { role: 'end', input });
  }

  clearRoute(): void {
    this.route = null;
    this.routeSource.clear();
  }

  planRoute(): RouteResult {
    if (!this.startInput || !this.endInput) {
      const error = new Error('请先选择起点和终点');
      this.eventBus.emit('routeerror', error);
      throw error;
    }

    try {
      this.route = planRoute(this.network, this.startInput, this.endInput, {
        mapConfig: this.mapConfig,
        pois: this.pois
      });
      this.renderRoute();
      this.eventBus.emit('routeplanned', this.route);
      return this.route;
    } catch (error) {
      const routeError = error instanceof Error ? error : new Error('路径规划失败');
      this.eventBus.emit('routeerror', routeError);
      throw routeError;
    }
  }

  startNavigation(): void {
    this.eventBus.emit('navigationstart', this.route);
  }

  stopNavigation(): void {
    this.eventBus.emit('navigationstop', undefined);
  }

  updatePosition(position: NavigationPosition): void {
    this.positionSource.clear();
    this.positionSource.addFeature(
      new Feature({
        geometry: new Point(this.toViewCoord(position.coord))
      })
    );
    this.eventBus.emit('positionchange', position);
    this.eventBus.emit('instructionchange', this.route?.instructions[0] ?? null);
  }

  enableEditor(): void {
    this.setMode('edit-select');
  }

  disableEditor(): void {
    this.setMode('browse');
  }

  exportNetwork(): NavigationNetwork {
    return cloneNetwork(this.network);
  }

  importNetwork(network: NavigationNetwork): void {
    this.loadNetwork(network);
  }

  fitToRoute(): void {
    const extent = this.routeSource.getExtent();
    if (extent && extent.every(Number.isFinite)) {
      this.map.getView().fit(extent, { padding: [64, 64, 64, 64], duration: 220 });
    }
  }

  fitToFloor(_floorId: string): void {
    this.fitToNetwork();
  }

  fitToNetwork(): void {
    const extent = this.nodeSource.getExtent();
    if (extent && extent.every(Number.isFinite)) {
      this.map.getView().fit(extent, { padding: [56, 56, 56, 56], duration: 220, maxZoom: 18 });
    }
  }

  on<T extends NavigationEventName>(eventName: T, handler: NavigationEventHandler<T>): void {
    this.eventBus.on(eventName, handler);
  }

  off<T extends NavigationEventName>(eventName: T, handler: NavigationEventHandler<T>): void {
    this.eventBus.off(eventName, handler);
  }

  destroy(): void {
    if (this.clickKey) {
      unByKey(this.clickKey);
      this.clickKey = null;
    }
    this.clearModifyInteraction();
    this.eventBus.clear();
    this.map.setTarget(undefined);
  }

  private createBaseLayer(): ImageLayer<Static> | TileLayer<OSM> {
    if (this.mapConfig.mode === 'image') {
      const image = this.mapConfig.image;
      if (!image) {
        throw new Error('image 模式需要提供 image 配置');
      }

      const extent: [number, number, number, number] = [0, 0, image.width, image.height];
      const projection = new Projection({
        code: 'ol-location-navigation-image',
        units: 'pixels',
        extent
      });

      return new ImageLayer({
        source: new Static({
          url: image.url,
          projection,
          imageExtent: extent
        })
      });
    }

    return new TileLayer({ source: new OSM() });
  }

  private createView(): View {
    if (this.mapConfig.mode === 'image') {
      const image = this.mapConfig.image;
      const extent: [number, number, number, number] = [0, 0, image?.width ?? 1000, image?.height ?? 1000];
      return new View({
        projection: new Projection({
          code: 'ol-location-navigation-image',
          units: 'pixels',
          extent
        }),
        center: this.mapConfig.center ?? [extent[2] / 2, extent[3] / 2],
        zoom: this.mapConfig.zoom ?? 2,
        minZoom: this.mapConfig.minZoom ?? -4,
        maxZoom: this.mapConfig.maxZoom ?? 8,
        extent
      });
    }

    return new View({
      center: fromLonLat(this.mapConfig.center ?? [116.397, 39.908]),
      zoom: this.mapConfig.zoom ?? 16,
      minZoom: this.mapConfig.minZoom ?? 3,
      maxZoom: this.mapConfig.maxZoom ?? 20
    });
  }

  private handleMapClick(coordinate: Coordinate, pixel: number[]): void {
    const feature = this.map.forEachFeatureAtPixel(pixel, item => item as NavFeature);
    if (feature) {
      this.handleFeatureClick(feature);
      return;
    }

    if (this.readonly || this.mode !== 'edit-node') {
      return;
    }

    const node: NavNode = {
      id: createNavigationId('node'),
      coord: this.fromViewCoord(coordinate),
      label: '新节点'
    };
    this.network.nodes.push(node);
    this.renderNetwork();
    this.eventBus.emit('networkchange', this.exportNetwork());
  }

  private handleFeatureClick(feature: NavFeature): void {
    const kind = feature.get('kind') as 'node' | 'edge' | 'poi' | undefined;
    const id = feature.get('id') as string | undefined;
    if (!kind || !id) {
      return;
    }

    this.selectedFeatureId = id;
    this.nodeLayer.changed();
    this.edgeLayer.changed();
    this.eventBus.emit('featureclick', { kind, id });

    if (this.readonly) {
      return;
    }

    if (this.mode === 'edit-edge' && kind === 'node') {
      this.handleEdgeNodeClick(id);
    }
  }

  private handleEdgeNodeClick(nodeId: string): void {
    if (!this.pendingEdgeFrom) {
      this.pendingEdgeFrom = nodeId;
      return;
    }

    if (this.pendingEdgeFrom === nodeId) {
      this.pendingEdgeFrom = null;
      return;
    }

    const edge: NavEdge = {
      id: createNavigationId('edge'),
      from: this.pendingEdgeFrom,
      to: nodeId,
      bidirectional: true,
      type: 'walk'
    };
    this.network.edges.push(edge);
    this.pendingEdgeFrom = null;
    this.renderNetwork();
    this.eventBus.emit('networkchange', this.exportNetwork());
  }

  private renderAll(): void {
    this.renderNetwork();
    this.renderPois();
    this.renderRoute();
  }

  private renderNetwork(): void {
    this.nodeSource.clear();
    this.edgeSource.clear();
    const nodesById = new globalThis.Map(this.network.nodes.map(node => [node.id, node]));

    for (const edge of this.network.edges) {
      const from = nodesById.get(edge.from);
      const to = nodesById.get(edge.to);
      if (!from || !to) {
        continue;
      }
      const feature = new Feature({
        geometry: new LineString([this.toViewCoord(from.coord), this.toViewCoord(to.coord)])
      });
      feature.setProperties({ kind: 'edge', id: edge.id, disabled: edge.disabled });
      feature.setId(edge.id);
      this.edgeSource.addFeature(feature);
    }

    for (const node of this.network.nodes) {
      const feature = new Feature({
        geometry: new Point(this.toViewCoord(node.coord))
      });
      feature.setProperties({
        kind: 'node',
        id: node.id,
        label: node.label,
        nodeType: node.type
      });
      feature.setId(node.id);
      this.nodeSource.addFeature(feature);
    }
  }

  private renderPois(): void {
    this.poiSource.clear();
    for (const poi of this.pois) {
      const feature = new Feature({ geometry: new Point(this.toViewCoord(poi.coord)) });
      feature.setProperties({ kind: 'poi', id: poi.id, name: poi.name });
      feature.setId(poi.id);
      this.poiSource.addFeature(feature);
    }
  }

  private renderRoute(): void {
    this.routeSource.clear();
    if (!this.route) {
      return;
    }

    const nodesById = new globalThis.Map(this.network.nodes.map(node => [node.id, node]));
    const coordinates = this.route.nodeIds
      .map(nodeId => nodesById.get(nodeId))
      .filter((node): node is NavNode => Boolean(node))
      .map(node => this.toViewCoord(node.coord));

    if (coordinates.length > 1) {
      this.routeSource.addFeature(new Feature({ geometry: new LineString(coordinates) }));
    }
  }

  private enableModifyInteraction(): void {
    this.modifyInteraction = new Modify({ source: this.nodeSource });
    this.modifyKey = this.modifyInteraction.on('modifyend', () => {
      for (const feature of this.nodeSource.getFeatures()) {
        const node = this.network.nodes.find(item => item.id === feature.get('id'));
        const geometry = feature.getGeometry();
        if (!node || !(geometry instanceof Point)) {
          continue;
        }
        node.coord = this.fromViewCoord(geometry.getCoordinates());
      }
      this.renderNetwork();
      this.renderRoute();
      this.eventBus.emit('networkchange', this.exportNetwork());
    });
    this.map.addInteraction(this.modifyInteraction);
  }

  private clearModifyInteraction(): void {
    if (this.modifyKey) {
      unByKey(this.modifyKey);
      this.modifyKey = null;
    }
    if (this.modifyInteraction) {
      this.map.removeInteraction(this.modifyInteraction);
      this.modifyInteraction = null;
    }
  }

  private toViewCoord(coord: [number, number]): Coordinate {
    return this.mapConfig.mode === 'geo' ? fromLonLat(coord) : coord;
  }

  private fromViewCoord(coord: Coordinate): [number, number] {
    if (this.mapConfig.mode === 'geo') {
      const lonLat = toLonLat(coord);
      return [lonLat[0], lonLat[1]];
    }

    return [coord[0], coord[1]];
  }
}

function cloneNetwork(network: NavigationNetwork): NavigationNetwork {
  return {
    floors: network.floors?.map(floor => ({ ...floor, image: floor.image ? { ...floor.image } : undefined })),
    nodes: network.nodes.map(node => ({ ...node, coord: [...node.coord] })),
    edges: network.edges.map(edge => ({ ...edge }))
  };
}
