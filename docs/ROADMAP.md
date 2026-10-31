# Deferred ideas — not in current scope

This note records potential follow-up directions without changing the current
read-only ShellFolio virtual shell or its animation behavior.

## Terminal skins

Explore opt-in visual skins inspired by Windows PowerShell, macOS terminals
(as in AienTech's work), and additional Linux desktop environments. Keep the
virtual command engine and portfolio content independent from presentation.
A skin should not imply emulation of a real operating system.

## Visitor-friendly TUI

Research an optional text-based UI presentation with clear keyboard and pointer
navigation, good visual hierarchy and progressive disclosure for non-developers.
Consider prior TUI experiments and BeyondVRAM-style interaction patterns.
Preserve accessibility, responsive layout and a straightforward way back to
the conventional terminal.

## Scope guardrails

- Finish functional consistency, keyboard behavior and tests before new UI work.
- No frameworks, external runtime dependencies or generalized theming engine
  until concrete requirements justify them.
- Prefer small, reversible, tested components with stable default behavior.
- Preserve a lightweight, read-only static GitHub Pages site and fast loading.
- Avoid decorative complexity that obscures projects or decreases usability.
