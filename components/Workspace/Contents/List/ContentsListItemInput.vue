<script setup lang="ts">
const props = defineProps<{
  item: FolderOrNote
  parent: FolderWithContents
}>();

const state = useContentsSidebarState();

const inputEl = shallowRef<HTMLInputElement | null>(null);
const name = ref(props.item.name || '');

const isFolder = 'root' in props.item;
const placeholder = props.item.creating
  ? 'note or folder/'
  : isFolder
    ? 'new folder name'
    : 'new note name';

function handleSubmit() {
  let promise: Promise<any>;

  if (props.item.creating) {
    const creationName = name.value.replace(/\//g, '');
    const createAction = creationName.length !== name.value.length ? createFolder : createNote;

    promise = createAction(creationName, props.item, props.parent);
  }
  else if (props.item.editing) {
    const renameAction = isFolder ? renameFolder : renameNote;

    promise = renameAction(name.value, props.item, props.parent);
  }
  else {
    return;
  }

  promise.then(() => {
    if (state.value === 'visible')
      state.value = 'hidden';
  });
}

function handleReset() {
  if (props.item.creating)
    return deleteNoteFromFolder(props.item, props.parent);

  const updateAction = isFolder ? updateSubfolderInFolder : updateNoteInFolder;

  updateAction(props.item, { editing: false, creating: false }, props.parent);
}

onMounted(() => {
  inputEl.value?.focus();
  inputEl.value?.scrollIntoView();
});
</script>

<template>
  <form class="list-item__form" @submit.prevent="handleSubmit" @reset.prevent="handleReset">
    <label v-once class="list-item__form__label" for="contentsListItemInput">
      Item name (enter "/" at the end to create folder)
    </label>
    <input
      id="contentsListItemInput"
      ref="inputEl"
      v-model="name"
      class="list-item__form__input"
      enterkeyhint="done"
      type="text"
      minlength="2"
      :pattern="allowedClientItemNameRE.source"
      :placeholder="placeholder"
      @blur="handleReset"
      @keydown.esc="handleReset"
    >
  </form>
</template>

<style lang="scss">
.list-item__form {
  &__label {
    position: absolute;

    width: 0;
    height: 0;

    overflow: hidden;
    pointer-events: none;
  }

  &__input {
    font-family: inherit;
    color: hsla(var(--text-color-hsl), 1);

    width: 100%;

    padding: calc(var(--pd-y) * 0.7) calc(var(--pd-x));

    appearance: none;
    outline: 1px solid hsla(var(--selection-bg-color-hsl), 0.5);
    outline-offset: -1px;
    border: none;
    border-radius: 0.225rem;
    background-color: hsla(var(--text-color-hsl), 0.025);

    transition: outline-color .3s;

    &:user-invalid {
      outline-color: var(--error-color);
    }
  }
}
</style>
