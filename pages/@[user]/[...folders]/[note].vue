<script setup lang="ts">
import parseDuration from 'parse-duration';

definePageMeta({
  scrollToTop: true,
});

const route = useRoute();
const isFallbackMode = useFallbackMode();
const notesCache = useNotesCache();
const createToast = useToaster();
const offlineStorage = useOfflineStorage();
const currentItemForDetails = useCurrentItemForDetails();
const user = useUser();
const mitt = useMitt();

const notePath = computed(() => route.path.replace('/@', '/'));
const noteApiPath = computed(() => route.path.replace(`/@${route.params.user}`, ''));

const POLLING_TIME = parseDuration('2 minutes')!;
let pollingTimer: NodeJS.Timeout;
let loadingToast: RefToastInstance | undefined;
let abortControllerGet: AbortController | null;
let lastRefetch: number | undefined;

const { data: note, pending, refresh, error } = await useAsyncData<NoteWithContent | undefined>('note', async () => {
  if (import.meta.server || !route.params.note || route.params.note === BLANK_NOTE_NAME)
    return;

  clearTimeout(pollingTimer);

  abortControllerGet?.abort();
  abortControllerGet = new AbortController();

  lastRefetch = Date.now();

  loadingToast = createToast('Fetching note takes longer then expected...', {
    delay: parseDuration('1 minute'),
    type: 'loading',
  });

  $fetch(`/api/note${noteApiPath.value}`, { signal: abortControllerGet.signal })
    .then((res) => {
      if (!res)
        return;

      const { data: fetchedNote } = res;
      isFallbackMode.value = false;

      note.value = fetchedNote;
      notesCache.set(fetchedNote.path, fetchedNote);
      offlineStorage.setItem?.(fetchedNote.path, fetchedNote);
    })
    .catch((e) => {
      error.value = e; // set error in async data, since request promise is not awaited
      handleError(e);
    })
    .finally(() => {
      const multiplier = document.visibilityState === 'visible' ? 1 : 2;
      pollingTimer = setTimeout(refresh, POLLING_TIME * multiplier);

      loadingToast?.value?.remove();
    });

  const notePath = `/${route.params.user}${noteApiPath.value}`;

  return notesCache.get(notePath) || await offlineStorage.getItem?.(notePath);
}, {
  server: false,
  lazy: true,
  immediate: false,
  deep: false,
});

let abortControllerUpdate: AbortController | null;
const throttledUpdate = useThrottleFn(updateNote, 1000, true, false); // enable trailing call and disable leading
function updateNote(content: string) {
  const updatingCurrentNote = notePath.value.replace('/', '/@') === window.location.pathname;

  // send update request after get
  if (pending.value && updatingCurrentNote) {
    const stop = watch(pending, (pending) => {
      if (!pending) {
        updateNote(content);
        stop();
      }
    });

    return;
  }

  // if no note was found in cache that means that it was deleted
  if (!note.value || !notesCache.get(notePath.value))
    return;

  const newNote = { ...toRaw(note.value), content };

  // enables optimistic ui
  notesCache.set(note.value.path, newNote);

  abortControllerUpdate?.abort();
  abortControllerUpdate = new AbortController();

  $fetch(`/api/note${noteApiPath.value}`, {
    method: 'PATCH',
    body: { content },
    retry: 2,
    signal: abortControllerUpdate.signal,
  })
    .then(() => {
      if (note.value)
        offlineStorage.setItem?.(note.value.path, newNote);
    })
    .catch((error) => console.warn(error));
}

async function handleError(error: Error) {
  if (error.message.includes('aborted'))
    return;

  // @ts-expect-error there actually is statusCode
  if (error.statusCode === 401 || !user.value) {
    user.value = null;
    await navigateTo('/login');
    return;
  }
  // @ts-expect-error there actually is statusCode
  if (error.statusCode === 404)
    return await navigateTo(`/@${user.value.username}`);

  // Other network error ?
  if (error.name === 'FetchError') {
    sendError(error);
    isFallbackMode.value = true;
  }

  // But if folder was found in cache, then do nothing, just display it
  if (note.value)
    return;

  // last chance to show user folder, if iterator in @[user].vue page hasn't yet set the foldersCache
  const offlineNote = await offlineStorage.getItem?.(notePath.value);

  if (!offlineNote) {
    createToast(`Sorry ⊙︿⊙ We couldn't find offline copy for folder: "${route.params.note}"`);

    await navigateTo(`/@${user.value.username}`);

    return;
  }

  note.value = offlineNote;
}

mitt.on('cache:populated', () => {
  if (!note.value)
    note.value = notesCache.get(notePath.value) || null;
});

mitt.on('details:show', () => {
  if (note.value)
    // @ts-expect-error it will be okeeeeeey
    currentItemForDetails.value = note.value;
});

onBeforeMount(() => refresh());

if (import.meta.client) {
  const off = on(document, 'visibilitychange', () => {
    const timeDiff = Date.now() - (lastRefetch || 0);

    if (document.visibilityState === 'visible' && timeDiff > parseDuration('10 seconds')!)
      refresh();
  });

  onBeforeUnmount(() => {
    off();
    clearTimeout(pollingTimer);
    abortControllerGet?.abort();
    loadingToast?.value?.remove();
  });
}
</script>

<template>
  <Transition name="fade" appear>
    <!-- NOTE: This component should be wrapped inside client only, if note is rendered on server -->
    <WorkspaceNoteEditor
      v-if="note"
      key="content"
      class="workspace__note-editor"
      :content="note.content || ''"
      :editable="!isFallbackMode && !!note"
      @update="throttledUpdate"
    />

    <WorkspaceNoteEditorSkeleton
      v-else
      key="skeleton"
      class="workspace__note-editor"
    />
  </Transition>
</template>

<style lang="scss">
.workspace {
  &__note-editor {
    width: 97.5%;
    height: 100%;

    max-width: 1300px;

    margin: 0 auto;

    @media (max-width: $breakpoint-tablet) {
      width: 100%;
    }
  }
}
</style>
