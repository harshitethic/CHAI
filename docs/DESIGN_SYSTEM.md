# CHAI Design System — Premium Chromium/Linux Desktop UI

**Goal:** distinct, original CHAI interface with dark, warm, premium sensibility inspired by `refs/05-claude-dark-app.png` and `refs/06-claude-dark-style-guide.png`, plus macOS-level layout discipline. References are not design assets to copy into UI.

## Visual personality

- **Quietly capable:** smart, practical, calm; avoids neon hacker aesthetics and crowded controls.
- **Charcoal-on-charcoal layering:** sophisticated near-black canvas and subtly lifted surfaces.
- **Warmth without noise:** orange/coral appears for active navigation, live workflow, one primary action; not across every surface.
- **Apple polish, Linux-native behavior:** rounded components, careful blur, precision spacing, smooth restrained motion, familiar Mac-like shortcuts optionally mapped to Linux Super/Ctrl, but not false macOS chrome.
- **Original branding:** CHAI mark may evoke an abstract network/connected actions or a cup steam motif if drawn originally; not Claude's starburst, icon, wordmark or illustration.

## Proposed CSS design tokens

These are **inferred aesthetic starting values**, not sampled/exact colors from screenshots; adjust via real Kali visual QA. Ensure contrast and functional semantics.

```css
:root[data-theme="dark"] {
  --chai-bg: #18191b;
  --chai-shell: #202123;
  --chai-panel: #262729;
  --chai-raised: #2e2f32;
  --chai-hover: #37383b;
  --chai-border: rgba(255, 255, 255, .085);
  --chai-border-strong: rgba(255, 255, 255, .16);
  --chai-text: #f2f0ed;
  --chai-muted: #ada9a5;
  --chai-dim: #777775;
  --chai-accent: #e87e5c;
  --chai-accent-strong: #ff8b5b;
  --chai-accent-soft: rgba(232, 126, 92, .13);
  --chai-warning: #f3be69;
  --chai-danger: #f47c7b;
  --chai-success: #83c6a9;
  --chai-focus: #f6a382;
  --chai-radius-sm: 10px;
  --chai-radius-md: 14px;
  --chai-radius-lg: 20px;
  --chai-radius-xl: 26px;
  --chai-shadow: 0 14px 50px rgba(0,0,0,.22);
  --chai-ease: cubic-bezier(.22,1,.36,1);
}
```

Support accessible light theme eventually, but **dark is first priority**. Do not force user to hunt for readable text. Success, warning, danger, neutral states must have text/icon cues, not color alone.

## Font and layout

Use available licensed sans stack: `Inter`, `Geist`, `SF Pro` **only where lawfully available on user's device** (don't ship proprietary font files), `system-ui`, `sans-serif`. Large headings ~26–34px; workspace titles 18–22px; body 13–15px; captions 11–12px. Keep line heights ~1.45–1.6. Code monospaced 12–14px.

**8pt layout grid** with 4pt micro increments. Side rail ~64px; expanded left drawer ~252–288px; large chat content max-width ~900px; composer ~700–900px. Minimum window ~1024x680 when possible; at smaller widths collapse side drawer/secondary panes instead of reducing all text to tiny sizes.

## Key components

### Window chrome

Real window controls with correct Linux behavior, custom title bar where supported, visible drag regions excluding actionable controls. Tabs, back/forward for internal CHAI screens, workspace breadcrumb, app/menu access, provider status and local operation indicator.

### Navigation rail

Icon + restrained label on hover/selection. Distinct CHAI mark top; Chat, Work, Projects, Activity, Connections, Settings; optional keyboard `Ctrl/Cmd+K`. Orange selected rail notch/soft glow used sparingly. Make every item functional or don't render it yet.

### Sidebar

Search with shortcut, New Task, project folders, task history with status dots and last updated text; virtualize long lists. Optional collapsible sections for workspace and saved chats. Subtle hover; no big glowing cards for everything.

### Chat screen and composer

A large clean chat plane with Manager persona, plan cards and evidence links. Composer is a floating dark rounded rectangle with muted border and coral action button. Provide attach workspace file, stop running task, provider status, and model/effort only if actual adapter supports them. Render markdown safely with code blocks, diff previews and citations to local evidence. Never imitate provider logos.

### Manager / Builder / Reviewer panes

Panel headers have role name, provider mode, heartbeat, current step; body shows chronological messages and tool events; footer has `pause`, `inspect`, `retry` as appropriate. Implement draggable dividers and focus mode. Distinguish active/logged-in/unsupported/disconnected states clearly.

### Work dashboard

Vertically ordered steps with state, assignee, dependencies; file diff / command output tab; timeline; inspector; approval inbox. Show a **readable** timeline instead of decorative progress percentages. Top controls: Pause, Resume, Stop All (danger style), Export report.

### Modal / toast / approval

Native-feeling overlays with actual focus traps, keyboard Escape, scroll boundaries, non-disruptive toasts, persistent high-risk approvals. For sensitive actions show file paths/commands, risk level, what will happen, and duration/scope of grant. Buttons `Deny` / `Allow once`; optional safe scope grants.

### Settings

Compact grouped settings with accurate state. `Provider: ChatGPT web — interactive, automation unavailable` is honest and more useful than a pretend green Online label. Show local storage footprint, permission roots, logs export and delete.

## Motion

Use 140–230ms hover, 200–320ms panel transitions, 350–500ms onboarding reveal; preserve animation only where it communicates state. Respect reduced motion and animation disabled under low FPS. Avoid constant background particles, unneeded 3D, heavy blurs under multi-monitor GPU load. Make app remain smooth on Linux, not just Chrome DevTools.

## Interaction and accessibility

- Keyboard `Ctrl+K` command palette; `Ctrl+N` task; `Ctrl+,` settings; `Esc` closes modal; `Ctrl+Shift+P` pause optionally, documented.
- Provide consistent tooltips and informative disabled states.
- Screen reader labels and semantic buttons/navigation; no icon-only unlabeled controls.
- Focus visible in keyboard mode; WCAG 2.2 AA contrast goal; text zoom 200%; do not rely on hover only.
- Smooth inertial-feeling scroll without hijacking system scroll physics. Avoid body-level scroll traps.

## Reference image mapping

| Image | Look for | CHAI adaptation |
| --- | --- | --- |
| `01-initial-dark-panel.png` | muted dark card | panels and contrast hierarchy |
| `02-claude-app-overview.png` | navigation + central canvas | original multi-pane app shell |
| `03-model-selector.png` | simple popover choice | provider-backed actual model picker only |
| `04-thinking-effort.png` | rounded effort selector | genuine supported quality/effort control only |
| `05-claude-dark-app.png` | desktop window proportions, chat/sidebar composition | CHAI Work/Chat shell |
| `06-claude-dark-style-guide.png` | charcoal/orange and component density | CHAI theme tokens, original visual identity |

## Visual QA procedure

1. Open each reference, identify structure and rhythm, not literal asset copying.
2. Implement and launch CHAI under the real Kali graphical session.
3. Capture Home, Chat, Work and 3-pane command center at 1920x1080 and ultrawide (if supported).
4. Compare information density, typography, color temperature, sidebar rhythm, composer hierarchy, accessibility, action clarity.
5. Fix actual clipping, contrast, inactive states, scroll, loading skeletons, and Linux DPI behavior.
6. Public README screenshots must be produced from running CHAI, **never cropped portions of third-party references**.
