<script setup lang="ts">
const props = defineProps<{
  value: string
  onUpdateValue: (v: string) => void
}>();

function updateModelValue(event: Event) {
  props.onUpdateValue((event.target as HTMLInputElement).value);
}
</script>

<template>
  <input
    id="workspace-search-input"
    type="search"
    required
    name="workspace-search"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="none"
    enterkeyhint="go"
    class="search__form__input"
    aria-autocomplete="both"
    spellcheck="false"
    autofocus="true"
    placeholder="Search or enter / for commands"
    maxlength="64"
    :value="value"
    @input="updateModelValue"
  >
</template>
