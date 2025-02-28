<script setup lang="ts">
import type SidebarVue from '~/components/Sidebar/Sidebar.vue';

const sidebar = shallowRef<InstanceType<typeof SidebarVue>>();

const { shortcuts } = useAppConfig();
const contentsState = useContentsSidebarState();
const toolboxState = useToolboxSidebarState();

function updateState(newState: SidebarState) {
  contentsState.value = newState;
}

function hideSidebarsIfNeeded() {
  const sidebar = shouldUnpinSidebar(contentsState, toolboxState);

  if (sidebar)
    sidebar.value = 'hidden';
}

function smartUpdateState(newState: SidebarState) {
  contentsState.value = newState;

  hideSidebarsIfNeeded();
}

// otherwise volar is yelling that state is not ref :(
const data = {
  dir: 'right' as const,
  name: 'contents',
  state: contentsState,
  onUpdateState: updateState,
};

if (import.meta.client) {
  let prevWindowWidth = window.innerWidth;

  onBeforeUnmount(
    on(window, 'resize', debounce(() => {
      if (prevWindowWidth !== window.innerWidth)
        return hideSidebarsIfNeeded();

      prevWindowWidth = window.innerWidth;
    }, 200)),
  );
}

useTinykeys({
  [shortcuts.contents]: (e) => {
    e.preventDefault();

    const nextState: SidebarState = contentsState.value === 'hidden' ? 'visible' : 'hidden';

    smartUpdateState(nextState);
  },
});
</script>

<template>
  <WorkspaceSidebar v-bind="data" ref="sidebar">
    <WorkspaceContentsHeader
      :state="contentsState"
      @update-state="smartUpdateState"
    />

    <WorkspaceContentsCreateButton />

    <hr>

    <WorkspaceContentsList
      :state="contentsState"
      @update-state="smartUpdateState"
    />
  </WorkspaceSidebar>
</template>
