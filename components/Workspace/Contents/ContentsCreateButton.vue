<script setup lang="ts">
function handleClick() {
  const folder = useNuxtApp()._asyncData.folder;

  if (!folder) return;

  const folderData = folder.data as Ref<FolderWithContents>;

  if (!folderData.value || folderData.value.notes.some((note) => note.creating))
    return;

  preCreateItem(folderData.value);
}
</script>

<template>
  <button class="contents__add" @click="handleClick">
    <IconOutlineAdd class="contents__add__icon" />

    Create new
  </button>
</template>

<style lang="scss">
.contents__add {
  display: flex;
  justify-content: flex-start;
  align-items: center;

  font-family: inherit;
  text-align: left;
  color: hsla(var(--text-color-hsl), 0.85);

  width: 100%;

  margin-top: var(--pd-y);
  padding: calc(var(--pd-y) * 0.75) calc(var(--pd-x));

  appearance: none;
  border-radius: 0.225rem;
  border: none;
  background-color: transparent;
  cursor: pointer;

  transition: background-color .1s, color .1s;

  @media (hover: hover) {
    color: hsla(var(--text-color-hsl), 0.75);
  }

  &__icon {
    margin-right: calc(var(--pd-x) * 0.66);

    width: 1.25rem;
    height: auto;
  }

  &:is(:hover, :focus-visible) {
    background-color: hsla(var(--text-color-hsl), 0.045);
    color: var(--text-color);
    outline: none;
  }
}
</style>
