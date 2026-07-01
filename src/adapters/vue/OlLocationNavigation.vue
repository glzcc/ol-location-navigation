<template>
  <div ref="containerRef" class="ol-location-navigation"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { OlLocationNavigationCore } from '../../core/OlLocationNavigationCore';
import type {
  NavigationInteractionMode,
  NavigationMapConfig,
  NavigationNetwork,
  NavPoi,
  RouteResult
} from '../../types/navigation';

const props = withDefaults(
  defineProps<{
    mapConfig: NavigationMapConfig;
    network: NavigationNetwork;
    pois?: NavPoi[];
    mode?: NavigationInteractionMode;
    readonly?: boolean;
  }>(),
  {
    pois: () => [],
    mode: 'browse',
    readonly: false
  }
);

const emit = defineEmits<{
  ready: [navigation: OlLocationNavigationCore];
  routeplanned: [route: RouteResult];
  routeerror: [error: Error];
  networkchange: [network: NavigationNetwork];
  featureclick: [payload: { kind: 'node' | 'edge' | 'poi'; id: string }];
}>();

const containerRef = ref<HTMLElement | null>(null);
let navigation: OlLocationNavigationCore | null = null;
let syncingFromCore = false;

onMounted(() => {
  if (!containerRef.value) {
    return;
  }

  navigation = new OlLocationNavigationCore(containerRef.value, {
    mapConfig: props.mapConfig,
    network: props.network,
    pois: props.pois,
    mode: props.mode,
    readonly: props.readonly
  });

  navigation.on('routeplanned', route => emit('routeplanned', route));
  navigation.on('routeerror', error => emit('routeerror', error));
  navigation.on('featureclick', payload => emit('featureclick', payload));
  navigation.on('networkchange', network => {
    syncingFromCore = true;
    emit('networkchange', network);
    queueMicrotask(() => {
      syncingFromCore = false;
    });
  });
  emit('ready', navigation);
});

watch(
  () => props.mode,
  mode => navigation?.setMode(mode)
);

watch(
  () => props.network,
  network => {
    if (!syncingFromCore) {
      navigation?.loadNetwork(network);
    }
  },
  { deep: true }
);

watch(
  () => props.pois,
  pois => navigation?.setPois(pois ?? []),
  { deep: true }
);

onBeforeUnmount(() => {
  navigation?.destroy();
  navigation = null;
});
</script>
