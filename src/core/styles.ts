import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import type { FeatureLike } from 'ol/Feature';

const colors = {
  node: '#166534',
  poi: '#0f766e',
  edge: '#64748b',
  route: '#e11d48',
  selected: '#f59e0b',
  position: '#2563eb'
};

export function createNodeStyle(feature: FeatureLike, selectedId: string | null): Style {
  const id = feature.get('id') as string | undefined;
  const label = feature.get('label') as string | undefined;
  const type = feature.get('nodeType') as string | undefined;
  const isSelected = id === selectedId;
  const color = type === 'elevator' || type === 'stairs' ? '#7c3aed' : colors.node;

  return new Style({
    image: new CircleStyle({
      radius: isSelected ? 8 : 6,
      fill: new Fill({ color: isSelected ? colors.selected : color }),
      stroke: new Stroke({ color: '#ffffff', width: 2 })
    }),
    text: label
      ? new Text({
          text: label,
          offsetY: -18,
          font: '600 12px "Microsoft YaHei", "Segoe UI", sans-serif',
          fill: new Fill({ color: '#0f172a' }),
          stroke: new Stroke({ color: 'rgba(255,255,255,0.9)', width: 4 }),
          overflow: true
        })
      : undefined
  });
}

export function createEdgeStyle(feature: FeatureLike, selectedId: string | null): Style {
  const id = feature.get('id') as string | undefined;
  const disabled = feature.get('disabled') as boolean | undefined;

  return new Style({
    stroke: new Stroke({
      color: disabled ? 'rgba(100,116,139,0.35)' : id === selectedId ? colors.selected : colors.edge,
      lineDash: disabled ? [6, 6] : undefined,
      width: id === selectedId ? 4 : 2
    })
  });
}

export function createPoiStyle(feature: FeatureLike): Style {
  const name = feature.get('name') as string | undefined;

  return new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color: colors.poi }),
      stroke: new Stroke({ color: '#ffffff', width: 2 })
    }),
    text: new Text({
      text: name ?? '',
      offsetY: 18,
      font: '700 12px "Microsoft YaHei", "Segoe UI", sans-serif',
      fill: new Fill({ color: '#0f172a' }),
      stroke: new Stroke({ color: 'rgba(255,255,255,0.9)', width: 4 }),
      overflow: true
    })
  });
}

export function createRouteStyle(): Style {
  return new Style({
    stroke: new Stroke({
      color: colors.route,
      width: 6
    })
  });
}

export function createPositionStyle(): Style {
  return new Style({
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({ color: colors.position }),
      stroke: new Stroke({ color: '#ffffff', width: 3 })
    })
  });
}
