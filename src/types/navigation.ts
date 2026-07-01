export type NavigationMapMode = 'geo' | 'image';

export type NavigationInteractionMode =
  | 'browse'
  | 'plan'
  | 'navigate'
  | 'edit-node'
  | 'edit-edge'
  | 'edit-select';

export type NavNodeType = 'normal' | 'entrance' | 'elevator' | 'stairs' | 'poi';
export type NavEdgeType = 'walk' | 'elevator' | 'stairs' | 'road';

export interface NavigationMapConfig {
  mode: NavigationMapMode;
  projection?: string;
  image?: {
    url: string;
    width: number;
    height: number;
    metersPerPixel?: number;
  };
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface NavFloor {
  id: string;
  name: string;
  image?: {
    url: string;
    width: number;
    height: number;
  };
}

export interface NavNode {
  id: string;
  coord: [number, number];
  floorId?: string;
  type?: NavNodeType;
  label?: string;
  disabled?: boolean;
}

export interface NavEdge {
  id: string;
  from: string;
  to: string;
  weight?: number;
  bidirectional?: boolean;
  disabled?: boolean;
  type?: NavEdgeType;
}

export interface NavPoi {
  id: string;
  name: string;
  coord: [number, number];
  floorId?: string;
  nodeId?: string;
  category?: string;
}

export interface NavigationNetwork {
  floors?: NavFloor[];
  nodes: NavNode[];
  edges: NavEdge[];
}

export type RoutePointInput =
  | { type: 'node'; id: string }
  | { type: 'poi'; id: string }
  | { type: 'coord'; coord: [number, number]; floorId?: string };

export interface RouteInstruction {
  id: string;
  nodeId: string;
  text: string;
  distance: number;
  edgeId?: string;
  floorId?: string;
}

export interface RouteResult {
  nodeIds: string[];
  edgeIds: string[];
  distance: number;
  instructions: RouteInstruction[];
}

export interface NavigationPosition {
  coord: [number, number];
  floorId?: string;
  heading?: number;
  accuracy?: number;
  source?: 'gps' | 'manual' | 'simulated';
}

export interface NavigationValidationIssue {
  level: 'error' | 'warning';
  message: string;
  targetId?: string;
}

export interface OlLocationNavigationOptions {
  target?: HTMLElement | string;
  mapConfig: NavigationMapConfig;
  network: NavigationNetwork;
  pois?: NavPoi[];
  mode?: NavigationInteractionMode;
  readonly?: boolean;
}

export interface NavigationEventMap {
  ready: OlLocationNavigationOptions;
  modechange: NavigationInteractionMode;
  pointselect: { role: 'start' | 'end'; input: RoutePointInput | null };
  routeplanned: RouteResult;
  routeerror: Error;
  navigationstart: RouteResult | null;
  navigationstop: undefined;
  positionchange: NavigationPosition;
  instructionchange: RouteInstruction | null;
  networkchange: NavigationNetwork;
  featureclick: { kind: 'node' | 'edge' | 'poi'; id: string };
}

export type NavigationEventName = keyof NavigationEventMap;

export type NavigationEventHandler<T extends NavigationEventName> = (
  payload: NavigationEventMap[T]
) => void;
