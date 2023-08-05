import { compile, v } from 'suretype';

export const noteUpdateSchema = v.object({
  name: v.string().minLength(2),
  content: v.string(),
});

export const useNoteUpdateValidation = compile(noteUpdateSchema);
