import { useEffect, useRef } from 'react';
import { OlLocationNavigationCore } from '../../core/OlLocationNavigationCore';
import type {
  NavigationInteractionMode,
  NavigationMapConfig,
  NavigationNetwork,
  NavPoi,
  RouteResult
} from '../../types/navigation';

export interface OlLocationNavigationReactProps {
  mapConfig: NavigationMapConfig;
  network: NavigationNetwork;
  pois?: NavPoi[];
  mode?: NavigationInteractionMode;
  readonly?: boolean;
  onReady?: (navigation: OlLocationNavigationCore) => void;
  onRoutePlanned?: (route: RouteResult) => void;
  onNetworkChange?: (network: NavigationNetwork) => void;
}

export function OlLocationNavigationReact({
  mapConfig,
  network,
  pois = [],
  mode = 'browse',
  readonly = false,
  onReady,
  onRoutePlanned,
  onNetworkChange
}: OlLocationNavigationReactProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navigationRef = useRef<OlLocationNavigationCore | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const navigation = new OlLocationNavigationCore(containerRef.current, {
      mapConfig,
      network,
      pois,
      mode,
      readonly
    });
    navigationRef.current = navigation;
    navigation.on('routeplanned', route => onRoutePlanned?.(route));
    navigation.on('networkchange', nextNetwork => onNetworkChange?.(nextNetwork));
    onReady?.(navigation);

    return () => {
      navigation.destroy();
      navigationRef.current = null;
    };
  }, []);

  useEffect(() => {
    navigationRef.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    navigationRef.current?.loadNetwork(network);
  }, [network]);

  useEffect(() => {
    navigationRef.current?.setPois(pois);
  }, [pois]);

  return <div ref={containerRef} className="ol-location-navigation" />;
}
