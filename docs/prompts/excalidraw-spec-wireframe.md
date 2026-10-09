# Excalidraw spec wireframe

Use this prompt to turn a multi-phase spec into an Excalidraw board: a wireframe of the shipped UI, how it evolves phase by phase, the finished UI, and the data model beside it. The board is a shared canvas where agents can later explore alternative designs.

Replace the placeholders before sending:

- `<SPEC>`: path or link to the spec.
- `<FEATURE>`: the feature or surface, for example "the new Workspace".
- `<DONE_PHASES>`: phases already shipped, for example "Phase 1 and Phase 2".

## Prompt

Use the `excalidraw` skill to create an Excalidraw board for `<FEATURE>`, based on the spec at `<SPEC>`.

Read the spec and the current code before drawing. Draw what has actually shipped, not what the spec says should exist. If they differ, show the shipped version and add a note about the gap.

The board has four parts, laid out left to right:

1. **Current UI (done).** Wireframe the UI as it exists after `<DONE_PHASES>`. Label it clearly as finished and list what those phases delivered.
2. **Phase-by-phase evolution.** For each remaining phase in the spec, add a frame with:
   - the phase name and its goal in one sentence;
   - a wireframe of the UI at the end of that phase, highlighting what changed from the previous frame;
   - the new behaviours the phase introduces.
3. **Final UI.** Wireframe the UI after the whole spec ships. Make it easy to understand at a glance. Annotate every interaction, including progressive disclosure: what is visible by default, what appears on hover, click, or expand, and empty, loading, and error states.
4. **Data model.** Beside the wireframes, diagram the full data model at the end of the spec: entities, key fields, relationships, and which phase introduces each. Link each entity to the UI elements that read or write it, so the connection between data and screen is visible.

Keep shapes simple and editable: low-fidelity boxes, real labels, and no screenshots. Agents will use this board to try alternative layouts, so group each frame so it can be copied and changed independently.

When you finish, give me the file path and a short summary of each phase as drawn. List any place where the spec was ambiguous and the assumption you made.
