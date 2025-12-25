# Feature Specification: Keyboard Navigation

**Feature Branch**: `007-keyboard-nav`
**Created**: 2025-12-24
**Status**: Draft
**Input**: User description: "Keyboard Navigation - Tab/Shift+Tab panel cycling. Shortcut keys for direct panel focus (t/s/l/c/o). Arrow keys for list navigation. Modal open/close with Esc. Quit with q, help with h/?."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Panel Navigation with Tab Cycling (Priority: P1)

As a user monitoring replication status, I want to cycle through panels using Tab and Shift+Tab so I can quickly navigate between different views without taking my hands off the keyboard.

**Why this priority**: Panel cycling is the fundamental navigation mechanism. Without it, users cannot efficiently move between the main interface sections (Topology, Subscriptions, Slots, Conflicts, Operations).

**Independent Test**: Can be fully tested by pressing Tab repeatedly and verifying focus moves to the next panel in order, wrapping to the first panel after the last. Shift+Tab reverses direction.

**Acceptance Scenarios**:

1. **Given** the application is running with multiple panels displayed, **When** user presses Tab, **Then** focus moves to the next panel in the defined order
2. **Given** focus is on the last panel in the cycle, **When** user presses Tab, **Then** focus wraps to the first panel
3. **Given** focus is on the first panel, **When** user presses Shift+Tab, **Then** focus wraps to the last panel
4. **Given** focus is on any panel, **When** user presses Shift+Tab, **Then** focus moves to the previous panel

---

### User Story 2 - Direct Panel Access via Shortcut Keys (Priority: P1)

As a user needing to check a specific panel quickly, I want to press a single key (t/s/l/c/o) to jump directly to that panel so I can access information without cycling through other panels.

**Why this priority**: Direct access shortcuts dramatically improve efficiency for power users. This is equally important as Tab cycling since users will use both interchangeably.

**Independent Test**: Can be tested by pressing each shortcut key and verifying the corresponding panel receives focus immediately.

**Acceptance Scenarios**:

1. **Given** the application is running, **When** user presses 't', **Then** focus moves to the Topology panel
2. **Given** the application is running, **When** user presses 's', **Then** focus moves to the Subscriptions panel
3. **Given** the application is running, **When** user presses 'l', **Then** focus moves to the Slots panel
4. **Given** the application is running, **When** user presses 'c', **Then** focus moves to the Conflicts panel
5. **Given** the application is running, **When** user presses 'o', **Then** focus moves to the Operations panel

---

### User Story 3 - List Navigation within Panels (Priority: P2)

As a user viewing a list of items (subscriptions, slots, conflicts), I want to use arrow keys (or j/k) to navigate up and down the list so I can select and view details of specific items.

**Why this priority**: Once users can navigate to panels, they need to navigate within them. List navigation is secondary to panel navigation but essential for detailed inspection.

**Independent Test**: Can be tested by focusing a panel with a list, pressing arrow keys, and verifying the selection indicator moves appropriately.

**Acceptance Scenarios**:

1. **Given** focus is on a panel with a list and an item is selected, **When** user presses Down arrow (or 'j'), **Then** selection moves to the next item in the list
2. **Given** focus is on a panel with a list and an item is selected, **When** user presses Up arrow (or 'k'), **Then** selection moves to the previous item in the list
3. **Given** selection is on the first item in the list, **When** user presses Up arrow (or 'k'), **Then** selection remains on the first item (no wrap)
4. **Given** selection is on the last item in the list, **When** user presses Down arrow (or 'j'), **Then** selection remains on the last item (no wrap)
5. **Given** focus moves to a panel with a list, **When** no item was previously selected, **Then** the first item is selected by default

---

### User Story 4 - Modal Open and Close with Escape (Priority: P2)

As a user viewing a modal (Operations, Help), I want to press Escape to close the modal and return to the previous focus state so I can quickly dismiss dialogs without losing my place.

**Why this priority**: Modal dismissal is a standard interaction pattern. Users expect Escape to close modals. This is essential once modals can be opened.

**Independent Test**: Can be tested by opening any modal, pressing Escape, and verifying the modal closes and previous panel focus is restored.

**Acceptance Scenarios**:

1. **Given** a modal is open, **When** user presses Escape, **Then** the modal closes
2. **Given** a modal is open and the user was previously focused on the Subscriptions panel, **When** user presses Escape, **Then** focus returns to the Subscriptions panel
3. **Given** no modal is open, **When** user presses Escape, **Then** nothing happens (no action taken)

---

### User Story 5 - Help Modal Access (Priority: P2)

As a user unfamiliar with keyboard shortcuts, I want to press 'h' or '?' to open a help modal showing all available keyboard shortcuts so I can learn the navigation system.

**Why this priority**: Discoverability is important for new users. The help modal serves as documentation for all other keyboard shortcuts.

**Independent Test**: Can be tested by pressing 'h' or '?', verifying the help modal opens, and checking it displays all keyboard shortcuts.

**Acceptance Scenarios**:

1. **Given** no modal is open, **When** user presses 'h', **Then** the Help modal opens
2. **Given** no modal is open, **When** user presses '?', **Then** the Help modal opens
3. **Given** the Help modal is open, **When** user presses Escape, **Then** the Help modal closes
4. **Given** the Help modal is displayed, **Then** it shows all available keyboard shortcuts with their descriptions

---

### User Story 6 - Application Quit (Priority: P3)

As a user finished with monitoring, I want to press 'q' to quit the application cleanly so I can exit without using Ctrl+C or closing the terminal.

**Why this priority**: While important for user experience, quitting is a terminal action. Users can always fall back to Ctrl+C, making this lower priority.

**Independent Test**: Can be tested by pressing 'q' and verifying the application exits gracefully.

**Acceptance Scenarios**:

1. **Given** no modal is open, **When** user presses 'q', **Then** the application begins graceful shutdown
2. **Given** a modal is open, **When** user presses 'q', **Then** no action is taken (modal must be closed first)
3. **Given** the application is shutting down, **Then** database connections are closed cleanly before exit

---

### Edge Cases

- What happens when a panel has no items to navigate (empty list)?
  - List navigation keys are accepted but have no effect
- What happens when user presses a shortcut key while a modal is open?
  - Panel shortcut keys (t/s/l/c/o) are ignored while a modal is open; only Escape and modal-specific keys work
- What happens when user rapidly presses navigation keys?
  - Each keypress is processed in order; no debouncing needed for navigation
- What happens when terminal loses focus and regains it?
  - Previous focus state is preserved; user resumes from same panel/selection
- What happens when layout changes (panels added/removed)?
  - Tab order adapts to visible panels; if focused panel is removed, focus moves to first available panel

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support Tab key to cycle focus forward through panels in order: Topology → Subscriptions → Slots → Conflicts → Operations → (wrap to Topology)
- **FR-002**: System MUST support Shift+Tab to cycle focus backward through panels
- **FR-003**: System MUST support direct panel shortcuts: 't' for Topology, 's' for Subscriptions, 'l' for Slots, 'c' for Conflicts, 'o' for Operations
- **FR-004**: System MUST support Up/Down arrow keys and j/k keys for list navigation within panels
- **FR-005**: System MUST support Escape key to close any open modal
- **FR-006**: System MUST restore previous panel focus when a modal is closed
- **FR-007**: System MUST support 'h' and '?' keys to open the Help modal
- **FR-008**: System MUST support 'q' key to quit the application (only when no modal is open)
- **FR-009**: System MUST visually indicate which panel currently has focus
- **FR-010**: System MUST visually indicate which list item is currently selected
- **FR-011**: System MUST ignore panel shortcut keys when a modal is open
- **FR-012**: System MUST select the first item when focus enters a panel with a list and no item was previously selected
- **FR-013**: System MUST preserve list selection state when focus leaves and returns to a panel

### Key Entities

- **Focus State**: Tracks which panel currently has focus and which modal (if any) is open
- **Selection State**: Per-panel tracking of selected item index within lists
- **Panel Order**: Ordered sequence of panels for Tab cycling (Topology, Subscriptions, Slots, Conflicts, Operations)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate to any panel within 2 keypresses (1 for direct shortcut, max 5 for Tab cycling through 5 panels)
- **SC-002**: Users can open and close any modal with at most 2 keypresses (1 to open, 1 to close)
- **SC-003**: All keyboard shortcuts are discoverable through the Help modal accessible via 'h' or '?'
- **SC-004**: Navigation state (panel focus, list selection) persists correctly across modal open/close cycles
- **SC-005**: Application quits cleanly within 1 second of pressing 'q', closing all database connections
- **SC-006**: 100% of navigation can be performed without mouse interaction
