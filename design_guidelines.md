# Timesheet Tracking App - Design Guidelines

## Design Approach: Productivity-First System

**Selected Framework:** Material Design principles adapted for productivity applications, drawing inspiration from Linear's clean aesthetics and Notion's form simplicity.

**Core Philosophy:** Maximum efficiency for rapid data entry with clear visual hierarchy. Every element serves the worker's goal of quickly logging hours and reviewing submissions.

---

## Typography System

**Font Stack:** Inter (primary) via Google Fonts CDN
- Headings: 600 weight, sizes: 2xl (page titles), xl (section headers), lg (card titles)
- Body text: 400 weight, base size for forms and tables
- Labels: 500 weight, sm size for form labels and table headers
- Data/Numbers: 500 weight (tabular-nums for alignment)

---

## Layout & Spacing System

**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8
- Component padding: p-6 (cards, forms)
- Section spacing: mb-8 (between major sections)
- Form field spacing: space-y-4
- Table cell padding: p-4
- Button padding: px-6 py-2

**Container Strategy:**
- Main content: max-w-6xl mx-auto px-4
- Forms: max-w-2xl for optimal data entry
- Tables: full width within container with horizontal scroll on mobile

---

## Page Structure & Layout

### Dashboard/Home View
**Two-Column Desktop Layout (single column mobile):**
- Left Column (2/3 width): Entry form card + Quick stats banner
- Right Column (1/3 width): Recent entries summary, weekly total display

**Quick Stats Banner:** Horizontal row displaying: Today's hours, This week's total, This month's total (grid-cols-3)

### Timesheet Table View
**Single Column Full-Width:**
- Filter controls at top (date range picker, search)
- Data table with sticky header
- Pagination footer

---

## Component Library

### Data Entry Form (Primary Component)
**Card-based form with clean fields:**
- Date picker (calendar icon, default to today)
- Hours input (number field with stepper, 0.25 increments)
- Task/Project dropdown or autocomplete
- Description textarea (2-3 rows, auto-expand)
- Submit button (primary, full-width on mobile, right-aligned desktop)

**Validation:** Inline error messages below fields, error state borders

### Data Table (Core Component)
**Columns:** Date | Hours | Task/Project | Description | Actions
- Sortable headers (up/down chevron icons via Heroicons)
- Row hover state for clarity
- Inline edit: Click row to edit in modal or expand inline
- Actions column: Edit (pencil icon) and Delete (trash icon) buttons
- Empty state: Centered message with illustration placeholder

### Summary Cards
**Metric Display Cards:**
- Large number (2xl, bold)
- Label below (sm, muted)
- Optional trend indicator (up/down arrow)
- Subtle border, no heavy shadows

### Navigation
**Top Navigation Bar:**
- Logo/App name (left)
- Main links: Dashboard | Timesheets | Reports (center/left)
- User profile dropdown (right)
- Mobile: Hamburger menu

### Modal/Dialog
**For edit/delete confirmations:**
- Centered overlay with backdrop blur
- Max-w-md container
- Header with title and close button
- Content area matching form styles
- Action buttons at bottom (Cancel + Primary action)

---

## Interaction Patterns

**Form Submission:**
- Loading state on submit button (spinner icon)
- Success toast notification (top-right, auto-dismiss)
- Form clears after successful submission
- Focus returns to date field for rapid consecutive entries

**Table Interactions:**
- Single click on row highlights it
- Double click or edit button opens edit modal
- Delete requires confirmation dialog

**Mobile Optimizations:**
- Cards stack vertically
- Table converts to card list view (each entry as card)
- Bottom-fixed submit button for forms
- Larger touch targets (min-h-12 for buttons)

---

## Responsive Breakpoints

- Mobile: Base (< 768px) - Single column, stacked layout
- Tablet: md (768px+) - Two column for dashboard, full table
- Desktop: lg (1024px+) - Optimized multi-column, wider containers

---

## Icons

**Library:** Heroicons (outline style) via CDN
**Usage:**
- Calendar icon for date fields
- Clock icon for hours input
- Pencil for edit actions
- Trash for delete actions
- Plus for add new entry
- Check circle for success states
- Exclamation for errors/warnings

---

## Accessibility & UX Essentials

- All form inputs have visible labels (not just placeholders)
- Focus states clearly visible with outline offset
- Keyboard navigation: Tab through forms, Enter to submit
- Error messages associated with fields via aria-describedby
- Table data readable by screen readers with proper headers
- Minimum touch target: 44x44px for mobile

---

## Images

**No hero image required** - This is a utility application focused on immediate functionality. If branding is needed, use a simple logo lockup in the navigation bar.