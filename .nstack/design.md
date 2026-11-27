# Design
Subject: a task board a small team keeps open all day to see who is doing what; calm, dense, quick to scan.
Kind: work tool
## Tokens
- background #F3F4F1, surface #FFFFFF, text #1E2329, muted #57606A, accent #1D6B57 (primary buttons, links, focus, selection), danger #B91C1C (overdue, delete, errors); border #D5D9DD
- derived: accent-hover #16503F, danger-hover #8F1515 (hover), accent-soft #E3EFEA (selection), danger-soft #FBEAEA (error tint), edge #8A939C (control edges, 3:1 on surface)
- label chips (bg/text, each 6.2:1+): gray #E8EAED/#3A4149, green #DDF1E4/#1F5F3A, blue #DFEBFB/#1F4F8F, purple #ECE4F8/#5A3594, orange #FCE9D9/#8A4111, red #FBE3E3/#9B1C1C
- type: one sans stack for everything, platform UI fonts named (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Liberation Sans", Arial, sans-serif; not `system-ui`, which on some Linux machines resolves to a face with no bold); scale 0.875 / 1 / 1.125 / 1.375 / 1.75 rem (ratio ~1.2); body 1rem; numbers tabular
- headings: h1 is the page title, 1.75rem/700, the largest text on the screen; h2 sections (columns, New task, Labels, Members, task-page sections) 1.375rem/600; the header "Task board" is 1.125rem/600 and not a heading; calendar day numbers are not headings
- space: 4 px base (4, 8, 12, 16, 24, 32, 48); radius 6 px; border 1px #D5D9DD; shadow only on a dragged card
- controls: one height for buttons, inputs and selects (2.5rem, 2.75rem = 44 px at <= 640 px); focus is a 2 px accent outline 2 px off the edge; one family: inputs, date inputs, selects and buttons share height, 1 px `--edge` border, radius and font; selects are `appearance: none` with a `--muted` chevron (two gradients) and 2rem right padding; the date input matches the text inputs with its picker icon inside; checkboxes use `--accent`
- signature: column headings carry a live card count; Done cards dim; checklist progress is a 4 px bar under the card text
## Generic check
- Rejected: identical floating cards with a soft shadow (default); cards are flat with a border instead
- Rejected: a coloured side stripe for overdue cards; overdue is a danger badge instead
- Rejected: a web font; the system font stack needs no network fetch at build
