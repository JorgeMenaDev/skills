
---

# MDX AUTHORING GUARDRAIL — angle-bracket placeholder tokens (issue #23)

The recap source is MDX. MDX parses `<...>` as JSX/HTML, so any angle-bracket
token that is NOT a real element makes the publish fail with a 422
("Expected a closing tag for `<...>`"). Diff text routinely contains
`<placeholder>`-style tokens — e.g. the Pipeline Flags contract's literal
`<reason>` — and quoting one raw in prose is exactly what breaks publish.

**Rule:** any angle-bracket token that is not a genuine JSX/HTML element you
intend to render (a placeholder like `<reason>`, `<id>`, `<n>`, `<APP_URL>`, a
type like `Promise<T>`, a shell redirect like `2>&1`) MUST be wrapped in
backticks (inline code) or placed inside a fenced code block — never left raw
in MDX prose.

BAD (raw `<reason>` in a paragraph — MDX reads it as an unclosed `<reason>` tag
and publish 422s):

    The brief sets verify: off — <reason> so the verify step is skipped.

GOOD (the same line wrapped in backticks — the token stays literal text):

    The brief sets `verify: off — <reason>` so the verify step is skipped.

When in doubt, wrap it. A quoted flag line, CLI usage, or path that contains
`<` or `>` always belongs in a code span or code block.

---

# MDX AUTHORING GUARDRAIL — wireframe Screens need real HTML (issue #26 recap)

The Plan app rejects a publish with a 422 ("Visual recap contains empty
wireframes or legacy canvas kit trees … Screen has no HTML and no kit nodes")
when any `<Screen>` — in the document body or a canvas artboard — carries no
`html` content. Sketching a screen as a bare/self-closing `<Screen>` with only
a caption, or with legacy kit-tree children (`<FrameScreen>`, `<Card>`,
`<Row>`, `<Title>`, `<Btn>`), fails the publish for the WHOLE recap.

**Rule:** every `<Screen>` MUST carry an `html={'...'}` attribute holding a
semantic HTML fragment with visible product content — real labels, fields,
buttons, and copy read from the diff/screenshots. Layout via inline
flex/grid styles; colors only via `--wf-*` tokens (never hex); helper classes
`.wf-card` / `.wf-pill` / `.wf-muted`; no `<style>`/`font-family`. If you
cannot fill a screen with real content, drop that wireframe block entirely —
a missing wireframe degrades the recap, an empty one kills the publish.

BAD (no html — 422s the publish):

    <WireframeBlock id="header-after">
      <Screen surface="browser" caption="Header after the change." />
    </WireframeBlock>

GOOD (real content from the product UI):

    <WireframeBlock id="header-after">
      <Screen surface="browser" caption="Header after the change." html={'<div style="display:flex;align-items:center;gap:14px;width:100%;padding:12px 16px;border-bottom:1.4px solid var(--wf-line)"><strong>{{PROJECT_NAME}}</strong><span class="wf-muted">Blog</span><div style="flex:1"></div><button>Contact</button><button class="primary">Book a Call</button></div>'} />
    </WireframeBlock>
