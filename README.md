# Jorge's Hermes Skills

Public skill repository for reusable Hermes Agent skills Jorge wants available across repos and profiles.

## Published skills

### `work-tracking`

Use when Jorge and Hermes create a multi-step plan across any repo and need to decide how to track it: repo markdown, GitHub Issues, Linear, memory, or a mix.

Path:

```text
skills/software-development/work-tracking/SKILL.md
```

## Install / use locally

Install the skill directly into the default Hermes profile:

```bash
hermes skills install https://raw.githubusercontent.com/JorgeMenaDev/skills/main/skills/software-development/work-tracking/SKILL.md
```

Install into a named profile:

```bash
hermes -p <profile> skills install https://raw.githubusercontent.com/JorgeMenaDev/skills/main/skills/software-development/work-tracking/SKILL.md
```

Or add this repo as a skill tap if your Hermes version supports taps:

```bash
hermes skills tap add https://github.com/JorgeMenaDev/skills
hermes skills install work-tracking
```

## Layout

```text
skills/<category>/<skill-name>/SKILL.md
```

Each skill is a standard Hermes `SKILL.md` with YAML frontmatter and markdown body.
