import mitt, { type Emitter } from 'mitt';

// eslint-disable-next-line ts/consistent-type-definitions
type Events = {
  'save:note'?: Partial<{ force: boolean }>
  'cache:populated'?: Partial<object>
  // will open note if there is one and folder otherwise
  'details:show'?: Partial<object>
  'search:show'?: Partial<object>
};

const emitter = mitt<Events>();
const beseOn = emitter.on;
// @ts-expect-error end user will still get type support because of useMitt function
emitter.on = (type, handler) => {
  beseOn(type, handler);

  if (getCurrentInstance()) {
    onScopeDispose(() => {
      emitter.off(type, handler);
    });
  }
};

export function useMitt(): Emitter<Events> {
  return emitter;
};
