# Performance Tool - Complete Feature Documentation

## Overview
A comprehensive web performance analysis tool built with Next.js that visualizes and analyzes performance data from web applications. The tool provides detailed insights into page load times, resource loading, custom performance marks, and complete performance timeline analysis with advanced filtering, sorting, and visualization capabilities.

---

## Table of Contents
1. [Data Loading & Persistence](#data-loading--persistence)
2. [Event Processing Intelligence](#event-processing-intelligence)
3. [Main Navigation & Tabs](#main-navigation--tabs)
4. [Timeline View](#timeline-view)
5. [Table View](#table-view)
6. [Resources Analysis Tab](#resources-analysis-tab)
7. [Event Details Panel](#event-details-panel)
8. [Settings & Configuration](#settings--configuration)
9. [Data Export & Debugging](#data-export--debugging)
10. [Technical Implementation](#technical-implementation)

---

## 1. Data Loading & Persistence

### Smart Data Loading (from index.tsx)
- **PostMessage Integration**: 
  - Listens on `window.message` events for `type: 'performanceData'`
  - Supports cross-origin data transmission from opener windows
  - Event listener setup with proper cleanup
- **2-Second Timeout with Fallback**: 
  - Waits exactly 2000ms for fresh data via postMessage
  - Automatically falls back to cached data if no new data received
  - Uses `useEffect` hook with `setTimeout` and cleanup
  - Timer cleared when data received early
- **Local Storage Persistence**: 
  - Key: `performance-tool:lastData`
  - Stores complete data object: `{ type, data, siteModels }`
  - Handles JSON serialization errors gracefully with try-catch
  - Auto-saves on every new data reception
- **Data Source Banner**: 
  - Top banner shows "Fresh" (green background `#2a4a2a`) or "Cached" (orange background `#4a3a1a`)
  - Sticky positioning at top of viewport
  - Clear visual distinction between data sources
  - Banner text: "Data Source: Fresh" or "Data Source: Cached"

### Site Models Enrichment
- **Automatic Fetching**: 
  - Detects when `siteUrl` exists but `siteModels` is missing
  - Makes POST request to `/api/fetchSiteModels?siteUrl={url}`
  - Enriches data object before saving to localStorage
  - Only fetches if both conditions met
- **Site Model Fields**:
  - `externalBaseUrl`: Used for stripping URL prefixes from resource names
  - `siteDisplayName`: Available for display (shown in header if present)
- **Display in UI**:
  - Site URL shown in header as clickable link
  - Opens in new tab with `target="_blank"` and `rel="noopener noreferrer"`
  - Hover effect adds underline to link
  - Styled in teal color (`#4ECDC4`)

### Complete Settings Persistence
**LocalStorage Key**: `performance-tool:filters`

**Persisted State (19 items)**:
1. `timelineFilters` - Event type filters for timeline (Array of strings)
2. `selectedMarkNames` - Filtered mark names (Array of strings)
3. `tableFilters` - Event type filters for table (Array of strings)
4. `visibleColumns` - Table column visibility (Array of strings)
5. `activeTab` - Current active tab: 'timeline' | 'table' | 'resources'
6. `showNegativeTimestamps` - Boolean toggle
7. `ssrTimeOffset` - Number in milliseconds
8. `graphEndTime` - Number in milliseconds or null
9. `minDurationMs` - Number in milliseconds
10. `resourceDomainFilters` - Array of blacklist strings
11. `zoomLevel` - Number (0.5 to 10)
12. `panOffset` - Number in pixels
13. `tableSearchTerm` - String for table search
14. `resourceFilterFileTypes` - Array of file type filters
15. `resourceFilterServices` - Array of service filters
16. `resourceFilterExtensions` - Array of extension filters
17. `resourceViewTab` - 'list' | 'pie'

**Load/Save Coordination**:
- `settingsLoaded` flag prevents race conditions
- Load `useEffect` runs once on mount, sets flag to `true`
- Save `useEffect` only runs after `settingsLoaded === true`
- Prevents overwriting loaded settings with defaults
- All 17 dependencies tracked for auto-save

---

## 2. Event Processing Intelligence

### Event Combination Algorithm
**Combines "started" and "ended/finished" event pairs into single duration events**

#### Three-Pass Processing:
1. **First Pass - Index Started Events**:
   - Finds all events ending with " started"
   - Handles "(server)" suffix normalization
   - Stores in Map with key: `{baseName.toLowerCase()}{_server?}`
   - Marks index as used
   - Example: "Render started" → stores with key "render"
   - Example: "Hydration started (server)" → stores with key "hydration_server"

2. **Second Pass - Match Ended/Finished Events**:
   - Finds events ending with " ended" or " finished"
   - Matches with started events by normalized key
   - Creates combined event with:
     - `name`: Base name (without started/ended suffix)
     - `duration`: endTime - startTime
     - `entryType`: From started event
     - `_isCombined`: true (custom flag)
     - `_endEvent`: Reference to end event
   - Removes matched events from started Map
   - Marks both indices as used

3. **Third Pass - Add Non-Combined Events**:
   - All events not marked as used are added as-is
   - Includes unpaired started events
   - Includes all other event types

#### Server Event Handling:
- **Normalization Function**: `normalizeName()`
  - Detects " (server)" suffix (case-insensitive)
  - Returns: `{ normalized: string, isServer: boolean }`
  - Strips suffix but preserves flag
  - Re-adds suffix to final combined event name

#### SSR Time Offset Application:
- Applied BEFORE combination during initial map
- Only affects events with `entryType === 'SSR'`
- Adds offset value to `startTime`
- Preserves all other properties

### Resource Type Detection & Metadata Extraction

#### `getResourceExtras()` Function
Extracts rich metadata from resource URLs:

**For `https://static.parastorage.com` URLs**:
- **Detection**: URL starts with exact prefix
- **Extracted Fields**:
  - `resource_subtype`: Always set to `'File'`
  - `file_type`: First path segment after domain
    - Example: `https://static.parastorage.com/services/...` → `file_type: 'services'`
    - Example: `https://static.parastorage.com/unpkg/...` → `file_type: 'unpkg'`
  - `service`: Second path segment when `file_type === 'services'`
    - Example: `.../services/wix-thunderbolt/...` → `service: 'wix-thunderbolt'`
    - Example: `.../services/ecom/...` → `service: 'ecom'`
  - `file_name`: Last path segment (the actual filename)
  - `file_extension`: Extension from filename (lowercase)
    - Extracted using `lastIndexOf('.')`
    - Example: `chunk.min.js` → `file_extension: 'js'`

**For Site API URLs (`{siteUrl}/_api/...`)**:
- **Detection**: 
  - Checks multiple URL variants with/without trailing slash
  - Includes origin-only variants from `new URL(base)`
  - Example patterns: `https://example.com/_api/`, `https://example.com_api/`
- **Extracted Fields**:
  - `resource_subtype`: Always set to `'API'`
  - `api_name`: First segment after `/_api/`
    - Example: `.../_api/wix-ecom-storefront/...` → `api_name: 'wix-ecom-storefront'`
    - Handles both absolute and relative URLs
    - Uses path parsing with `indexOf('/_api/')` fallback

**URL Parsing Safety**:
- All URL parsing wrapped in try-catch blocks
- Returns empty object `{}` on any error
- Handles malformed URLs gracefully

#### `getEffectiveType()` Function
Returns the actual type for filtering and coloring:
- For `entryType === 'resource'`:
  - If `resource_subtype === 'File'` → returns `'resource:file'`
  - If `resource_subtype === 'API'` → returns `'resource:api'`
  - Otherwise → returns `'resource'`
- For all other types → returns original `entryType`

### Display Name Processing

#### `getDisplayResourceName()` Function
**Purpose**: Strips site URL prefix from resource names for cleaner display

**Algorithm**:
1. Gets `externalBaseUrl` from `data.siteModels.publicModel`
2. Creates multiple URL variants:
   - With trailing slash: `base + '/'`
   - Without trailing slash: `base.slice(0, -1)`
   - Origin only: `new URL(base).origin`
   - Origin with slash: `origin + '/'`
3. Tries each variant as prefix:
   - If name starts with variant, strips it
   - Removes leading slashes from remainder: `.replace(/^\/+/, '')`
   - Returns remainder or `'/'` if empty
4. Returns original name if no match

**Example**:
- Site URL: `https://example.com/`
- Resource: `https://example.com/styles/main.css`
- Result: `styles/main.css`

---

## 3. Main Navigation & Tabs

### Tab Navigation Bar

**Location**: Header section, below the main controls and legend

**Visual Design**:
- **Container**:
  - Border-top: 1px solid `#333`
  - Background: `#202020` (dark gray)
  - No gap between tabs (gap: 0)
  - Flex layout for horizontal arrangement

**Tab Structure**: 3 main tabs

#### Tab 1: Timeline
- **Label**: "Timeline"
- **Active State**:
  - Background: `#252525` (slightly lighter)
  - Color: `#fff` (white)
  - Font weight: Bold
  - Border-bottom: 2px solid `#4ECDC4` (teal underline)
- **Inactive State**:
  - Background: `#202020` (matches container)
  - Color: `#888` (gray)
  - Font weight: Normal
  - Border-bottom: 2px solid transparent
- **Common Styles**:
  - Padding: 12px 24px
  - Border: None
  - Font size: 14px
  - Cursor: Pointer
  - Transition: all 0.2s (smooth state changes)

**Content**: Visual timeline graph with horizontal bars, zoom controls, and milestone markers

#### Tab 2: Events Table
- **Label**: "Events Table"
- **Same styling system** as Timeline tab
- **Active underline**: Teal (`#4ECDC4`)
- **Content**: Sortable data table with all event details and search functionality

#### Tab 3: Resources
- **Label**: "Resources"
- **Same styling system** as other tabs
- **Active underline**: Teal (`#4ECDC4`)
- **Content**: Resource analysis with filters and nested tabs (see below)

### Tab Behavior

**Click Handling**:
- Clicking a tab calls `setActiveTab(tabName)`
- Current tab state persisted in localStorage
- Immediately switches view content
- Only one tab active at a time

**State Persistence**:
- Key: `activeTab` in localStorage
- Values: `'timeline' | 'table' | 'resources'`
- Restored on page reload
- Default: `'timeline'` if no saved state

**Tab-Specific Controls**:
- **Timeline tab shows**:
  - Filter dropdown (event types and mark names)
  - Zoom controls (-, %, +, Reset)
  - Stats: Total Duration, Events, Milestones, Combined
  - Legend with color indicators
- **Events Table tab shows**:
  - Search input
  - Filter dropdown (event types only)
  - Column selector
  - Stats: Showing count / Total count
- **Resources tab shows**:
  - No header controls
  - Filters and views are inside the tab content

### Visual Hierarchy

**Tab Selection Indicators**:
1. **Color change**: White (active) vs Gray (inactive)
2. **Background change**: Lighter (active) vs Darker (inactive)
3. **Bottom border**: Teal line (active) vs Transparent (inactive)
4. **Font weight**: Bold (active) vs Normal (inactive)

**Consistent Design**:
- All tabs same height (48px with padding)
- Same horizontal padding (24px)
- Same font size (14px)
- Same transition timing (0.2s)
- Aligned horizontally with no gaps

---

## 4. Timeline View

### Visual Components

#### Color-Coded Event Types
**14 distinct colors from `EVENT_TYPE_COLORS` constant**:
- `navigation`: `#FF6B6B` (Red)
- `resource`: `#4ECDC4` (Teal)
- `resource:file`: `#4A90E2` (Blue) - **Subtype**
- `resource:api`: `#F5A623` (Orange) - **Subtype**
- `mark`: `#FFE66D` (Yellow)
- `measure`: `#95E1D3` (Light Green)
- `paint`: `#F38181` (Pink)
- `longtask`: `#AA96DA` (Purple)
- `visibility-state`: `#FCBAD3` (Light Pink)
- `largest-contentful-paint`: `#FF8C42` (Dark Orange)
- `first-input`: `#6BCF7F` (Green)
- `layout-shift`: `#FB6376` (Red-Pink)
- `SSR`: `#A78BFA` (Light Purple)
- `default`: `#A0A0A0` (Gray) - Fallback for unknown types

#### Timeline Layout & Bounds
- **Coordinate System**: X-axis = time (ms), Y-axis = lanes (for stacking)
- **Base Viewport Width**: 1000px (before zoom)
- **Scaled Width**: `1000 * zoomLevel` (500px to 10000px range)
- **Time Bounds Calculation**:
  - Min: `Math.min(0, ...allEvents.map(e => e.startTime))` when showing negative timestamps
  - Min: `0` when hiding negative timestamps
  - Max: `Math.max(...allEvents.map(e => e.startTime + e.duration))`
- **Time-to-Pixel Conversion**:
  ```
  position = ((time - min) / (max - min)) * scaledWidth + panOffset
  ```
- **Pixel-to-Time Conversion**:
  ```
  time = min + ((pixels - panOffset) / scaledWidth) * (max - min)
  ```

#### Duration Event Bars
**Visual Properties**:
- **Height**: 28px
- **Border Radius**: 4px
- **Border**: 1px solid `rgba(0,0,0,0.3)` (default)
- **Border (selected)**: 2px solid `#fff`
- **Box Shadow**: `0 1px 3px rgba(0,0,0,0.2)` (default)
- **Box Shadow (hovered)**: `0 4px 12px rgba(0,0,0,0.4)`
- **Transform (hovered)**: `scale(1.05)`
- **Z-Index**: 1 (default), 100 (hovered)
- **Min Width**: 2px (for very short events)

**Text Display Logic**:
- **Width < 30px**: No text shown
- **Width >= 30px**: Shows abbreviated name
- **Max Characters**: `Math.floor(width / 6)` (approximate char width)
- **Truncation**: Adds "..." if name exceeds max chars
- **Resource Names**: Uses `getDisplayResourceName()` for cleaner paths
- **Padding**: 6px left and right
- **Font**: 11px, weight 500, color `#000`
- **Overflow**: Hidden with no wrap

**Resource Badge** (shown for resource events):
- Positioned with `marginLeft: '6px'`
- Font size: 10px
- Color: `rgba(0,0,0,0.7)`
- Shows:
  - File extension: `.{extension}` if file_type exists
  - API name: `API:{api_name}` if API subtype

**Title Attribute**:
- Full event name on hover (browser tooltip)
- Uses cleaned resource name for resources

#### Milestone Markers (Vertical Lines)
**Rendered for**:
- Paint events (`entryType === 'paint'`)
- Largest Contentful Paint (`entryType === 'largest-contentful-paint'`)
- Standalone marks (duration === 0, not part of started/ended pairs)

**Visual Properties**:
- **Line**: 2px dotted `#FF4444` border-left
- **Line Height**: 100% of timeline content
- **Line Glow (hovered)**: `boxShadow: '0 0 8px #FF4444'`
- **Label Position**: Absolute, `top: -25px`, centered above line
- **Label**: Colored background matching event type
- **Label Padding**: 3px 6px
- **Label Font**: 10px, bold, black text
- **Label Border**: 1px solid `rgba(0,0,0,0.3)` (default)
- **Label Border (selected)**: 2px solid `#fff`
- **Label Box Shadow**: `0 2px 6px rgba(0,0,0,0.3)`
- **Z-Index**: 10 (default), 100 (hovered)

**Filtering Behavior**:
- **Always shown** regardless of `minDurationMs` filter
- Subject to event type filters
- Subject to mark name filters (when applicable)
- Subject to negative timestamp filter

#### Smart Lane Assignment Algorithm
**Prevents overlapping events in timeline visualization**

**Goal**: Minimize vertical space while ensuring no overlap

**Algorithm**:
1. **Sort Events**:
   - Primary sort: startTime (ascending - earlier first)
   - Secondary sort: end time (descending - longer first)
   - This ensures parent events render above children

2. **Lane Tracking**:
   - Array stores when each lane becomes available (end time)
   - Initially empty array

3. **Chronological Constraints**:
   - `minLaneForNextStartTime`: Minimum allowed lane
   - `lastStartTime`: Previous event's start time
   - When start time increases:
     - Find lowest occupied lane at new start time
     - Update minimum to one above lowest occupied
     - Prevents later events from appearing above earlier ones

4. **Lane Selection**:
   - Search from `minLaneForNextStartTime` upward
   - Find first lane where `lanes[i] <= event.startTime`
   - If found: assign lane, update end time
   - If not found: create new lane at bottom

5. **Result**:
   - Each event has `lane` property (0-indexed)
   - Vertical position: `lane * 35 + 10` pixels

#### Zoom & Pan Controls

**Zoom Controls**:
- **Zoom Out Button** (`−`):
  - Decreases zoom by 0.2
  - Min zoom: 0.5x (50%)
  - Button: 6px 12px padding, rounded 6px
- **Zoom In Button** (`+`):
  - Increases zoom by 0.2
  - Max zoom: 10x (1000%)
- **Zoom Display**:
  - Shows current zoom as percentage
  - Format: `{(zoomLevel * 100).toFixed(0)}%`
  - Min width: 60px, centered
- **Reset Button**:
  - Returns to zoom level 1.0 (100%)
  - Disabled when already at 1.0
  - Visual feedback: grayed out when disabled
  - Cursor: `not-allowed` when disabled

**Pan Controls** (Not in UI, but state managed):
- Pan offset stored in pixels
- Affects all time-to-pixel calculations
- Persisted in localStorage
- Can be manually adjusted in code

**Persistence**:
- Both `zoomLevel` and `panOffset` saved to localStorage
- Restored on page reload
- Clamped on load: `Math.max(0.5, Math.min(10, saved))`

#### Interactive Cursor & Tooltip

**Vertical Cursor Line**:
- Appears on mouse move over timeline
- **Line Style**:
  - Position: Absolute at mouse X
  - Width: 1px
  - Color: `#ffffff`
  - Opacity: 0.5
  - Height: Full timeline height
  - Z-Index: 50
  - Pointer events: none

**Time Label**:
- Appears next to cursor line
- **Position**: `mouse X + 5px`, `top: 10px`
- **Style**:
  - Background: `rgba(0, 0, 0, 0.9)`
  - Border: 1px solid `#ffffff`
  - Padding: 4px 8px
  - Font: 12px, bold, white
  - Border radius: 4px
  - No wrap
  - Z-Index: 51
- **Content**: Current time at cursor (formatted)

**Hover Tooltip (on events)**:
- Appears directly above hovered event bar
- **Position**: Centered, 22px above bar
- **Style**:
  - Background: `rgba(0,0,0,0.9)`
  - Color: white
  - Font: 10px
  - Border: 1px solid `#444`
  - Padding: 2px 6px
  - Border radius: 3px
  - Z-Index: 200
  - No pointer events
- **Content**: Event duration (formatted)

**Fixed Position Hover Card** (bottom-left):
- Shows detailed info for currently hovered event
- **Position**: Fixed at `bottom: 20px, left: 20px`
- **Max Width**: 500px
- **Border**: 2px solid event type color
- **Background**: `rgba(0, 0, 0, 0.95)`
- **Border Radius**: 8px
- **Padding**: 12px 16px
- **Box Shadow**: `0 4px 20px rgba(0,0,0,0.5)`
- **Z-Index**: 1000
- **Content**:
  - Event type (colored, bold)
  - Combined badge if applicable
  - Event name (word-break: break-all)
  - Start time and duration

#### Time Scale Header
- **Height**: 40px
- **Background**: `#202020`
- **Border**: Bottom 1px solid `#333`
- **Tick Marks**: 5 positions (0%, 25%, 50%, 75%, 100%)
- **Each Tick**:
  - Vertical border-left: 1px solid `#444`
  - Position: Absolute at calculated pixel position
  - Label: Time value (formatted)
  - Label padding: 5px left, 10px top
  - Font: 12px, color `#888`

### Timeline Filtering

#### Event Type Filter Dropdown
**Button**:
- Shows current selection: "All ({count})" or "{n} selected"
- Min width: 200px
- Dropdown arrow: `▼`
- Style: Same as other control buttons

**Dropdown Panel**:
- **Position**: Absolute, below button
- **Background**: `#333`
- **Border**: 1px solid `#444`
- **Padding**: 8px
- **Border Radius**: 6px
- **Box Shadow**: `0 4px 12px rgba(0,0,0,0.5)`
- **Max Height**: 400px with overflow auto
- **Min Width**: 250px
- **Z-Index**: 1000

**Action Buttons** (at top):
- "Select All": Selects all event types
- "Clear": Resets to "all" only
- Layout: Flex, gap 8px
- Style: Same as other small buttons

**"All" Option**:
- Checkbox with label "All ({total count})"
- Background: `#444` when selected
- Hover effect: `#3a3a3a`

**Individual Type Options**:
- Each has checkbox, color square (12x12px), label, and count
- Color square: Matches event type color, rounded 2px
- Font: 13px
- Layout: Flex with 8px gap
- Hover effect: Background `#3a3a3a`
- Selected: Background `#444`

**Mark Name Filter** (nested):
- Appears when marks are visible
- Separated by horizontal line divider
- Heading: "Filter Marks:" (12px, bold, gray)
- Action buttons: "All Marks", "Clear Marks"
- "All Marks" option with count
- Scrollable list (max height 200px)
- Individual mark checkboxes (11px font)
- Each label truncated with ellipsis, title attribute for full name

#### Filter Logic Implementation

**Timeline Events**:
1. Starts with all `processedEvents`
2. Filters events where `duration > 0`
3. Applies `minDurationMs` filter (excludes if `duration < minDurationMs`)
4. Applies negative timestamp filter (excludes if `startTime < 0` when disabled)
5. Applies resource domain blacklist
6. Applies `graphEndTime` filter (excludes if `startTime > graphEndTime`)
7. Applies event type filter (keeps only selected types if not "all")

**Timeline Milestones**:
1. Starts with all `processedEvents`
2. Filters events where `duration === 0`
3. Only includes paint, LCP, and standalone marks
4. Excludes started/ended/finished marks
5. Applies negative timestamp filter
6. Applies `graphEndTime` filter
7. Applies event type filter
8. Applies mark name filter (when mark type is visible)
9. **NEVER affected by `minDurationMs`** (always shown)

**Standalone Mark Detection**:
```javascript
if (e.entryType === 'mark') {
  const nameLower = e.name.toLowerCase();
  const isStartedEnded = 
    nameLower.endsWith(' started') || 
    nameLower.endsWith(' ended') || 
    nameLower.endsWith(' finished');
  if (!isStartedEnded) return true; // Is standalone
}
```

#### Resource Domain Blacklist
**Purpose**: Exclude unwanted resources (tracking, ads, etc.)

**Input Field**:
- Placeholder: "e.g. cdn.example.com or 'google'"
- Enter key or "Exclude" button to add
- Prevents duplicates
- Trims whitespace

**Display**:
- List of pills/badges below input
- Each badge: Background `#1f1f1f`, border `#333`, rounded 12px
- Remove button (×) for each entry
- Font: 12px, color `#ddd`

**Filtering Logic**:
- Applied to resources only (`entryType === 'resource'`)
- Case-insensitive partial match: `nameLower.includes(filter.toLowerCase())`
- **Blacklist behavior**: Excludes matching resources
- Applied to both timeline and table views

### Statistics Display

**Timeline Tab Stats** (below controls):
```
Total Duration: {max time} | Events: {bar count} | Milestones: {line count} | Combined: {merged count}
```

**Format**:
- Font: 14px
- Color: `#aaa` (gray)
- Margin: 15px left
- All values dynamically calculated
- Combined count: Events with `_isCombined === true`

**Legend** (below stats):
- Label: "Legend:"
- Font: 12px, color `#888`
- Gap: 15px between items
- Only shows types with count > 0
- Each item:
  - Color square or line (matching event visualization)
  - Type name and count
  - Milestone indicator (⎸) for paints/LCP
  - Square: 16x12px rounded 2px for duration events
  - Line: 2px x 16px for milestone events

### Negative Timestamp Warning Banner
**Appears when**: `negativeTimestampCount > 0 && !showNegativeTimestamps`

**Style**:
- Background: `#3a2a1a` (dark orange)
- Border-left: 4px solid `#ff9800` (orange)
- Padding: 6px 10px
- Font: 12px
- Color: `#ffcc80` (light orange)

**Content**:
```
⚠️ {count} event{s} {is/are} hidden due to negative startTime. 
Use Settings to show or offset SSR timestamps.
```

---

## 4. Table View

### Table Controls Bar

**Search Input**:
- Placeholder: "Search events..."
- Min width: 200px
- Searches across ALL event properties
- Case-insensitive search
- Real-time filtering
- Checks every value: `Object.values(e).some(val => String(val).toLowerCase().includes(searchLower))`
- Persisted in localStorage as `tableSearchTerm`

**Filter Dropdown**:
- Similar to timeline filter but for table
- Shows: "Filter: All" or "Filter: {n} types"
- Same dropdown structure as timeline
- Independent from timeline filters
- Includes "Select All" and "Clear" buttons

**Results Counter**:
```
Showing {count} events
```
- Font: 14px, weight 500
- Color: `#888`
- Dynamically updates with filters

**Column Selector** (right-aligned):
- Button text: "Columns ({count})"
- Dropdown from right edge
- Shows all available columns from data
- Checkbox for each column
- Hover effect on labels
- Default visible: name, entryType, startTime, duration

### Table Structure

**Container**:
- Flex: 1 (fills available space)
- Overflow: Auto (scrollable)
- Background: `#1a1a1a`

**Table Element**:
- Width: 100%
- Border collapse: Collapse
- Font: 13px

**Header Row**:
- Position: Sticky (stays at top when scrolling)
- Top: 0
- Background: `#252525`
- Z-Index: 10
- Border-bottom: 2px solid `#333`

**Header Cells**:
- Padding: 12px 16px
- Text align: Left
- Font weight: Bold
- Color: White
- Cursor: Pointer (clickable for sort)
- User select: None
- White space: No wrap
- Flex display with 6px gap
- Shows sort indicator (▲/▼) when active

**Body Rows**:
- Alternating colors:
  - Even rows: `#1a1a1a`
  - Odd rows: `#1e1e1e`
- Selected row: `#2a3a3a`
- Hover: `#2a2a2a`
- Cursor: Pointer (clickable to select)
- Transition: background-color 0.1s

**Body Cells**:
- Padding: 12px 16px
- Border-bottom: 1px solid `#2a2a2a`
- Color: `#ccc`
- Max width: 400px
- Overflow: Hidden
- Text overflow: Ellipsis
- White space: No wrap
- Title attribute: Full value on hover

### Sorting

**Sort State**:
- `sortColumn`: Currently sorted column (default: 'startTime')
- `sortDirection`: 'asc' or 'desc' (default: 'asc')

**Sort Logic**:
```javascript
comparison = 
  - If both undefined/null: maintain order
  - If only one undefined: move to end
  - If both numbers: numeric comparison (aVal - bVal)
  - Otherwise: string comparison (localeCompare)

finalComparison = sortDirection === 'asc' ? comparison : -comparison
```

**Click Behavior**:
- Click same column: Toggle direction
- Click different column: Sort by new column, reset to 'asc'

**Visual Indicator**:
- Arrow symbol next to sorted column name
- ▲ for ascending
- ▼ for descending
- Font size: 10px

### Column Visibility

**Dynamic Column Detection**:
- Scans all filtered events
- Collects all object keys
- Excludes keys starting with `_`
- Excludes `lane` property
- Sorted alphabetically
- Returns unique set of available columns

**Default Visible**:
- name
- entryType
- startTime
- duration

**Toggle Behavior**:
- Click checkbox to show/hide
- At least one column can be visible
- Persisted to localStorage immediately

### Value Formatting in Cells

**Special Cases**:
- **Undefined/null**: Shows `-`
- **Time columns** (startTime, duration): Formatted with `formatTime()`
- **Resource names**: Uses `getDisplayResourceName()` for cleaner paths
- **Objects**: JSON.stringify for display
- **All others**: String conversion

**formatTime() Logic**:
```javascript
if (ms < 1000) return `${ms.toFixed(2)}ms`
else return `${(ms / 1000).toFixed(2)}s`
```

### Table Filtering

**Filter Order** (applied sequentially):
1. Start with all `processedEvents` (includes negative timestamps)
2. Resource domain blacklist (exclude matching resources)
3. Minimum duration filter (`duration >= minDurationMs`)
4. Event type filter (only selected types if not "all")
5. Search term filter (across all properties)

**No Timestamp Filtering**:
- Unlike timeline, table shows ALL events
- Negative timestamp events included
- Useful for debugging and complete analysis

---

## 5. Resources Analysis Tab

### Overall Layout & Structure

**Three-Panel Design**:
1. **Left Panel**: Filter controls (320px fixed width)
2. **Center Panel**: Nested tab views with aggregations and data (flex: 1)
3. **Right Panel**: Event Details (400px fixed width, shared across all main tabs)

**Container Style**:
- Display: Flex
- Overflow: Hidden
- Background: `#1a1a1a`
- Full height within main content area

**Visual Flow**: Filters → Aggregated Data → Event Details

### Left Panel: Filter Controls

**Panel Dimensions & Style**:
- Width: 320px (fixed)
- Padding: 16px
- Background: `#202020` (dark gray)
- Border-right: 1px solid `#333`
- Vertical scrolling if needed

**Panel Heading**: 
- Text: "Filters"
- Color: White
- Font weight: Bold
- Margin-bottom: 12px

#### File Type Filter
- **Label**: "File Type" (gray, 12px)
- **Extracted from**: `getResourceExtras().file_type`
- **Examples**: "services", "unpkg", "fonts", "services-static"
- **Layout**: Flex wrap, 6px gap
- **Checkboxes**: One per unique file type
- **Logic**: 
  - "all" means no filtering
  - Selecting types removes "all"
  - Empty selection auto-adds "all"

#### Service Filter
- **Label**: "Service" (gray, 12px)
- **Extracted from**: `getResourceExtras().service`
- **Examples**: "wix-thunderbolt", "ecom", "blog", "bookings"
- **Only shown for**: Resources with `file_type === 'services'`
- **Same checkbox logic** as file type filter

#### Extension Filter
- **Label**: "Extension" (gray, 12px)
- **Extracted from**: `getResourceExtras().file_extension`
- **Examples**: "js", "css", "woff2", "png", "json"
- **Display**: Prefixed with dot (e.g., ".js")
- **Same checkbox logic** as file type filter

**Filter Persistence**:
- All three filters saved to localStorage
- Restored on page reload
- Keys: `resourceFilterFileTypes`, `resourceFilterServices`, `resourceFilterExtensions`

### Center Panel: Nested Tabs & Data Visualization

**Panel Structure**:
- Flex: 1 (takes remaining width)
- Display: Flex column (vertical layout)
- Color: `#ddd` (light gray text)
- Overflow: Hidden
- Contains: Tab bar + Content area

#### Nested Tab Navigation Bar

**Bar Layout**:
- Display: Flex
- Gap: 8px between buttons
- Padding: 10px 14px
- Background: `#252525` (slightly lighter than main background)
- Border-bottom: 1px solid `#333`
- Position: Top of center panel

**Tab Buttons**: 2 options

##### List Tab Button
- **Label**: "List"
- **Active State**:
  - Background: `#333` (lighter gray)
  - Border: 1px solid `#444`
  - Color: `#fff` (white)
- **Inactive State**:
  - Background: `#1f1f1f` (very dark)
  - Border: 1px solid `#444`
  - Color: `#fff` (white, but appears dimmer due to background)
- **Common Styles**:
  - Padding: 6px 10px
  - Border-radius: 6px
  - Cursor: Pointer
  - Font-size: 12px

##### Pie Tab Button
- **Same styling system** as List button
- **Label**: "Pie"
- **Same active/inactive states**

**Tab Behavior**:
- Click toggles between `'list'` and `'pie'`
- State stored in `resourceViewTab`
- Persisted to localStorage
- Only one active at a time
- Instantly switches content below

#### Content Area (Below Tab Bar)

**Container**:
- Padding: 16px 20px
- Overflow: Auto (scrollable)
- Background: `#1a1a1a` (inherited)
- Flex: 1 (fills remaining height)

#### Summary Totals (Top Section)
**Always Visible** (regardless of tab):
- **Total Transfer**: Sum of `transferSize` from filtered resources
- **Total Body**: Sum of `decodedBodySize` from filtered resources
- **Format**: Both displayed using `formatBytes()`
- **Layout**: Flex, gap 24px, aligned center
- **Style**:
  - Label: 12px, gray
  - Value: 16px, bold, white

---

### Nested Tab Content

#### Tab 1: Pie Chart View (Visual)

**When Active**: `resourceViewTab === 'pie'`

**Layout**: Horizontal flex layout with summary, chart, and legend

**Calculation**:
- Groups resources by `service` (from `getResourceExtras()`)
- Aggregates per service:
  - `transfer`: Sum of transferSize
  - `body`: Sum of decodedBodySize
  - `count`: Number of files
- Creates "other" bucket for resources without service

**SVG Generation**:
- **Viewbox**: `-60 -60 120 120` (centered coordinate system)
- **SVG Size**: 180x180 pixels
- **Radius**: 50 units
- **Algorithm**:
  1. Calculate total transfer size
  2. For each service:
     - Calculate angle: `(transfer / total) * 2π`
     - Calculate start point: `(cos(acc) * 50, sin(acc) * 50)`
     - Increment accumulator: `acc += angle`
     - Calculate end point: `(cos(acc) * 50, sin(acc) * 50)`
     - Determine large arc flag: `angle > π ? 1 : 0`
     - Create path: `M 0 0 L x1 y1 A 50 50 0 largeArc 1 x2 y2 Z`
  3. Assign color from palette (cycles through 8 colors)

**Color Palette** (8 colors):
1. `#4A90E2` (Blue)
2. `#F5A623` (Orange)
3. `#7ED321` (Green)
4. `#BD10E0` (Purple)
5. `#50E3C2` (Teal)
6. `#B8E986` (Light Green)
7. `#F8E71C` (Yellow)
8. `#D0021B` (Red)

**Legend** (right side of pie):
- **Position**: Next to pie chart
- **Layout**: Vertical list
- **Gap**: 8px between entries
- **Font**: 12px
- Each entry contains:
  - **Color square**: 10x10px, matches pie slice
  - **Service name**: Plain text
  - **Size & Percentage**: Gray color (`#888`)
  - **Format**: `{service} {size} · {percent}%`
  - **Example**: `wix-thunderbolt 245.2 KB · 32.5%`

**Visual Example of Pie View**:
```
┌─────────────────────────────────────────────────────────────┐
│ Total transfer        Total body         [Pie Chart]         │
│ 754.3 KB              680.1 KB              ●●●              │
│                                            ●   ●             │
│                                           ●     ●            │
│                                            ●   ●     Legend: │
│                                             ●●●      ■ service1: 245.2 KB · 32.5% │
│                                                      ■ service2: 189.0 KB · 25.1% │
│                                                      ■ other: 320.1 KB · 42.4%    │
└─────────────────────────────────────────────────────────────┘
```

---

#### Tab 2: List View (Tabular)

**When Active**: `resourceViewTab === 'list'`

**Layout**: Table below summary totals

**Table Structure**:
- Width: 100%
- Border collapse: Collapse
- Font: 12px
- Margin-top: 10px

**Columns**:
1. **Service** (left-aligned)
2. **Files** (right-aligned) - count
3. **Transfer** (right-aligned) - formatted bytes
4. **Body** (right-aligned) - formatted bytes
5. **% of total** (right-aligned) - percentage with 1 decimal

**Header**:
- Background: `#252525`
- Color: `#ddd`
- Border-bottom: 1px solid `#333`
- Padding: 8px

**Body Rows**:
- **Sorted by**: Transfer size (descending - largest first)
- Border-bottom: 1px solid `#2a2a2a`
- Padding: 8px per cell

**Percentage Calculation**:
```javascript
percentage = (serviceTransfer / totalTransfer) * 100
formatted = percentage.toFixed(1) + '%'
```

**Visual Example of List View**:
```
┌──────────────────────────────────────────────────────────────┐
│ Total transfer: 754.3 KB       Total body: 680.1 KB          │
│                                                               │
│ ┌───────────────────────────────────────────────────────────┐│
│ │ Service          Files  Transfer    Body        % of total││
│ ├───────────────────────────────────────────────────────────┤│
│ │ wix-thunderbolt    45    245.2 KB   220.0 KB      32.5%  ││
│ │ ecom              28    189.0 KB   170.3 KB      25.1%  ││
│ │ other             67    320.1 KB   289.8 KB      42.4%  ││
│ └───────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

**Sorting**: Always sorted by Transfer size (descending - largest first)

**Use Cases**:
- **Pie View**: Quick visual comparison of service contributions
- **List View**: Detailed numeric analysis with precise values

---

### Resource Data Processing

**Filtering Logic** (applied in IIFE):
1. Start with all `resourceEvents` (from `processedEvents`)
2. Apply file type filter:
   - If not "all" AND has file_type: check if selected
3. Apply service filter:
   - If not "all" AND has service: check if selected
4. Apply extension filter:
   - If not "all" AND has file_extension: check if selected
5. Include only resources matching ALL active filters (AND logic)

**Aggregation by Service**:
```javascript
Map<service, { transfer, body, count }>

For each resource:
  service = getResourceExtras(name).service || 'other'
  map[service].transfer += transferSize || 0
  map[service].body += decodedBodySize || 0
  map[service].count += 1
```

### formatBytes() Function

**Implementation**:
```javascript
const kb = bytes / 1024
const mb = bytes / (1024 * 1024)
const kbStr = `${kb.toFixed(1)} KB`

if (kb > 1000) {
  return `${kbStr} (${mb.toFixed(2)} MB)`
}
return kbStr
```

**Examples**:
- 512 bytes → "0.5 KB"
- 1536 bytes → "1.5 KB"
- 1048576 bytes → "1024.0 KB (1.00 MB)"
- 2097152 bytes → "2048.0 KB (2.00 MB)"

---

## 6. Event Details Panel

### Panel Layout
- **Width**: 400px (fixed)
- **Border-left**: 2px solid `#333`
- **Background**: `#252525`
- **Overflow**: Auto (scrollable)
- **Padding**: 20px
- **Position**: Right side of screen

### Header Section

**Title Bar**:
- Flex layout: space-between
- Margin-bottom: 20px
- **Heading**: "Event Details" (18px, bold)
- **Close Button** (when event selected):
  - Symbol: ×
  - Size: 28x28px
  - Rounded: 4px
  - Background: `#333`
  - Border: 1px solid `#444`
  - Centered content
  - Title: "Close details"
  - Clears selection on click

### No Selection State
**Centered placeholder**:
- Margin-top: 50px
- Color: `#666` (dark gray)
- Text: "Click on an event in the timeline to view details"

### Selected Event Display

#### Main Event Card
- **Padding**: 15px
- **Background**: `#1a1a1a`
- **Border-radius**: 8px
- **Margin-bottom**: 15px
- **Border**: 2px solid {event type color}

#### Combined Event Badge
**Shows when**: `event._isCombined === true`
- **Background**: `#2a4a2a` (dark green)
- **Border-radius**: 4px
- **Margin-bottom**: 12px
- **Padding**: 8px 10px
- **Font**: 11px, weight 500
- **Color**: `#9FE6A0` (light green)
- **Content**: ✓ Combined from started/ended events
- **Icon**: ✓ (14px font size)

#### Type Display
- **Label**: "TYPE" (12px, gray, uppercase)
- **Value Layout**: Flex with 8px gap
- **Color Square**: 12x12px, rounded 2px, event type color
- **Type Name**: 14px, bold, white

#### Name Display
- **Label**: "NAME" (12px, gray, uppercase)
- **Value**: 13px, word-break: break-all, line-height: 1.5
- **Margin-bottom**: 12px

#### Time Information Grid
**Layout**: 2-column grid, 12px gap

**Start Time**:
- Label: "START TIME" (12px, gray, uppercase)
- Value: 14px, bold, color `#4ECDC4` (teal)
- Format: `formatTime(startTime)`

**Duration**:
- Label: "DURATION" (12px, gray, uppercase)
- Value: 14px, bold, color `#FFE66D` (yellow)
- Format: `formatTime(duration)`

#### End Time (Combined Events Only)
**Shows when**: `event._isCombined && event._endEvent`
- **Separator**: Top border 1px solid `#333`, padding-top 12px
- **Label**: "END TIME" (12px, gray, uppercase)
- **Value**: 14px, bold, color `#F38181` (pink)
- **Format**: `formatTime(endEvent.startTime)`

### Additional Properties Section

**Heading**: "Additional Properties" (14px, bold, gray)

**Properties Displayed**:
- Merges `getResourceExtras()` for resources
- Merges all event properties
- **Excluded Keys**:
  - name
  - entryType
  - startTime
  - duration
  - _isCombined
  - _endEvent
  - _originalIndex
  - _isServer
  - lane

**Property Cards**:
- **Layout**: Flex, space-between, 10px gap
- **Background**: `#1a1a1a`
- **Border-radius**: 4px
- **Padding**: 8px
- **Margin-bottom**: 6px
- **Key**: Left-aligned, gray, weight 500
- **Value**: Right-aligned, white, max-width 60%
  - Word-break: break-all
  - Objects: JSON.stringify
  - Others: String conversion

**Examples of Properties**:
- transferSize
- decodedBodySize
- initiatorType
- nextHopProtocol
- file_type
- service
- file_extension
- file_name
- api_name
- resource_subtype

---

## 7. Settings & Configuration

### Settings Modal

**Trigger**: ⚙️ Settings button in header

**Modal Overlay**:
- Position: Fixed, full screen
- Background: `rgba(0,0,0,0.6)` (60% black)
- Z-Index: 1000
- Centered flex layout
- Dismisses on overlay click

**Modal Panel**:
- Width: 520px
- Background: `#1e1e1e`
- Border: 1px solid `#333`
- Border-radius: 8px
- Padding: 16px 18px
- Stops propagation (doesn't dismiss on panel click)

**Header**:
- Flex layout: space-between
- **Title**: "Settings" (white)
- **Close Button**: ✕ symbol, transparent background

### Settings Fields

#### 1. SSR startTime adjustment (ms)
**Input Type**: Number
- **Purpose**: Adds offset to all SSR event startTimes
- **Use Case**: Fix negative SSR timestamps
- **Default**: 0
- **Example**: 1000 (adds 1 second)
- **Help Text**: "Adds this value to startTime of all SSR events. Use to fix negative SSR timestamps."
- **Style**: Full width, 8px 10px padding, dark background

#### 2. Minimum event duration (ms)
**Input Type**: Number with validation
- **Purpose**: Hides events with duration < threshold
- **Validation**: `Math.max(0, Number(value) || 0)`
- **Default**: 0 (shows all events)
- **Example**: 5 (hides events under 5ms)
- **Note**: Zero-duration marks explicitly excluded - always shown
- **Help Text**: "Hides events whose duration is less than this value."

#### 3. Resource domains to exclude
**Input Type**: Text with dynamic list
- **Purpose**: Blacklist resources by domain/URL substring
- **Input**:
  - Placeholder: "e.g. cdn.example.com or 'google'"
  - Enter key or "Exclude" button to add
  - Trim whitespace, prevent duplicates
- **Display List**:
  - Pills/badges with × remove button
  - Style: Dark background, rounded 12px
  - Click × to remove
  - Font: 12px
- **Examples**:
  - "googletagmanager" - excludes Google Tag Manager
  - "facebook.com" - excludes Facebook resources
  - "doubleclick" - excludes DoubleClick ads
- **Help Text**: "Resource events whose name includes any of these values will be hidden. Leave empty to show all resources."

#### 4. Graph end time (ms, optional)
**Input Type**: Number or null
- **Purpose**: Cut off timeline at specific time
- **Input**: Number or empty string
- **Empty = null**: Show all events
- **Example**: 4000 (show only first 4 seconds)
- **Filter**: `event.startTime <= graphEndTime`
- **Help Text**: "Show only events whose startTime is less than or equal to this value."

#### 5. Show events with negative startTime
**Input Type**: Checkbox
- **ID**: "toggle-negative" (for label association)
- **Purpose**: Toggle visibility of pre-navigation events
- **Default**: false (hidden)
- **Effect**: 
  - When ON: Extends timeline min to include negative times
  - When OFF: Timeline starts at 0, negative events hidden
- **Label**: "Show events with negative startTime"

### Close Button
- Text: "Close"
- Style: Same as other buttons
- Flex-end alignment
- Dismisses modal

---

## 8. Data Export & Debugging

### Copy Data Button
- **Icon**: 📋
- **Text**: "Copy Data"
- **Function**: Copies entire data object to clipboard
- **Format**: JSON with 2-space indentation
- **Alert**: "Raw data copied to clipboard!" on success
- **Error Handling**: Shows alert on failure

### Console Print Button
- **Icon**: 🖨️
- **Text**: "Console"
- **Function**: Logs multiple datasets to browser console
- **Logged Data**:
  1. `Performance Data`: Original data object
  2. `Processed Events`: After combination processing
  3. `Timeline Filtered Events`: Duration events for timeline
  4. `Timeline Milestone Events`: Zero-duration markers
  5. `Table Filtered Events`: Events shown in table
- **Alert**: "Data printed to console. Open DevTools to view."

### Use Cases
- **Debugging**: Inspect data transformations
- **Analysis**: Export for external tools
- **Documentation**: Share example data
- **Testing**: Verify filters and processing

---

## 9. Technical Implementation

### React State Management

**Total State Variables**: 26

**Timeline State (11)**:
1. `timelineFilters` - Set<string>
2. `showTimelineFilterDropdown` - boolean
3. `selectedMarkNames` - Set<string>
4. `zoomLevel` - number
5. `panOffset` - number
6. `hoveredEvent` - PerformanceEntry | null
7. `timelineCursorPosition` - { x: number; time: number } | null
8. `timelineRef` - useRef<HTMLDivElement>
9. `timelineContentRef` - useRef<HTMLDivElement>

**Table State (7)**:
10. `tableFilters` - Set<string>
11. `showTableFilterDropdown` - boolean
12. `sortColumn` - string
13. `sortDirection` - 'asc' | 'desc'
14. `visibleColumns` - Set<string>
15. `showColumnSelector` - boolean
16. `tableSearchTerm` - string

**Resources State (4)**:
17. `resourceFilterFileTypes` - Set<string>
18. `resourceFilterServices` - Set<string>
19. `resourceFilterExtensions` - Set<string>
20. `resourceViewTab` - 'list' | 'pie'

**Settings State (7)**:
21. `showSettingsModal` - boolean
22. `ssrTimeOffset` - number
23. `graphEndTime` - number | null
24. `showNegativeTimestamps` - boolean
25. `minDurationMs` - number
26. `resourceDomainFilters` - string[]
27. `resourceDomainInput` - string (temporary input)
28. `settingsLoaded` - boolean (coordination flag)

**Shared State (2)**:
29. `selectedEvent` - PerformanceEntry | null
30. `activeTab` - 'timeline' | 'table' | 'resources'

### useMemo Hooks (15)

1. **processedEvents**: Combines started/ended events, applies SSR offset
2. **eventTypes**: Unique event types with counts
3. **standaloneMarkNames**: Zero-duration marks (not started/ended)
4. **negativeTimestampCount**: Count of events with startTime < 0
5. **timelineFilteredEvents**: Filtered duration events for timeline bars
6. **timelineMilestoneEvents**: Filtered zero-duration events for markers
7. **tableFilteredEvents**: Filtered events for table display
8. **resourceEvents**: All resource-type events
9. **timelineBounds**: Min/max time values for timeline scale
10. **eventsWithPositions**: Timeline events with lane assignments
11. **allColumns**: Available columns from table data
12. **sortedTableData**: Table data sorted by current column/direction
13. (Inline): Filtered resources in Resources tab
14. (Inline): Service aggregation map
15. (Inline): Pie chart slices array

### useEffect Hooks (3)

1. **Load Settings** (on mount):
   - Runs once: `[]` dependencies
   - Loads from localStorage
   - Parses JSON safely
   - Validates types and ranges
   - Sets `settingsLoaded = true`

2. **Save Settings** (on change):
   - Dependencies: All 17 persisted states + settingsLoaded
   - Skips if `!settingsLoaded`
   - Converts Sets to Arrays
   - Stringifies to JSON
   - Saves to localStorage
   - Error handling with console.error

3. **Close Dropdowns** (click outside):
   - Dependencies: 3 dropdown visibility states
   - Adds mousedown listener to document
   - Checks if click target is outside dropdown containers
   - Uses `.closest()` to check ancestry
   - Cleanup removes listener

### Helper Functions (11)

1. **timeToPixels(time)**: Converts time to X coordinate
2. **pixelsToTime(pixels)**: Converts X coordinate to time
3. **getEventColor(type)**: Returns color for event type
4. **getDisplayResourceName(name)**: Strips site URL prefix
5. **formatBytes(bytes)**: Formats bytes as KB or KB(MB)
6. **getResourceExtras(name)**: Extracts metadata from URL
7. **getEffectiveType(event)**: Returns type with subtype
8. **handleZoom(delta)**: Adjusts zoom level
9. **formatTime(ms)**: Formats milliseconds as ms or seconds
10. **formatEventName(name)**: Truncates long names
11. **handleTimelineMouseMove(e)**: Tracks cursor position

### Event Handlers (15)

1. **toggleTimelineFilter(type)**: Toggle timeline event type
2. **selectAllTimelineFilters()**: Select all timeline types
3. **clearAllTimelineFilters()**: Reset timeline filters and marks
4. **toggleMarkName(markName)**: Toggle mark name filter
5. **selectAllMarkNames()**: Select all mark names
6. **clearAllMarkNames()**: Clear mark name filters
7. **toggleTableFilter(type)**: Toggle table event type
8. **selectAllTableFilters()**: Select all table types
9. **clearAllTableFilters()**: Reset table filters
10. **handleSort(column)**: Change sort column/direction
11. **toggleColumn(column)**: Toggle table column visibility
12. **copyRawData()**: Copy data to clipboard
13. **printToConsole()**: Log data to console
14. **handleTimelineMouseMove(e)**: Update cursor position
15. **handleTimelineMouseLeave()**: Clear cursor position

### TypeScript Interfaces

```typescript
interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  [key: string]: any; // Additional properties
}

interface PerformanceData {
  type: string;
  data: PerformanceEntry[];
  siteModels?: {
    publicModel?: {
      externalBaseUrl?: string;
      siteDisplayName?: string;
    };
  };
}
```

### Constants

```typescript
const EVENT_TYPE_COLORS: Record<string, string> = {
  // 14 predefined colors
};
```

### Next.js Configuration

#### TypeScript & ESLint
- `typescript.ignoreBuildErrors: true`
- `eslint.ignoreDuringBuilds: true`
- Allows rapid development without strict type checking

#### Turbopack Root
- `turbopack.root: process.cwd()`
- Explicitly sets project root
- Fixes ENOENT errors in monorepo/workspace setups
- Prevents Turbopack from walking up to parent directories

#### React Strict Mode
- `reactStrictMode: true`
- Helps identify potential problems
- Runs effects twice in development

### Static Site Generation

```typescript
export async function getStaticProps() {
  const data = { type: 'placeholder', data: [] } as any;
  return { props: { data } };
}
```

- Provides minimal data for build time
- Allows page to prerender without runtime data
- Real data loaded client-side via postMessage or localStorage

### Performance Optimizations

1. **useMemo for Expensive Calculations**:
   - Event filtering
   - Event sorting
   - Lane assignment
   - Resource aggregation

2. **Conditional Rendering**:
   - Only active tab rendered
   - Dropdowns render only when open
   - Details panel only when event selected

3. **Event Delegation**:
   - Single click listener on table rows
   - Single click listener on timeline events

4. **CSS Transitions**:
   - Smooth hover effects
   - Transition: background-color 0.1s
   - Transform: scale(1.05) on hover

5. **Debounced Effects**:
   - Settings save on any change
   - No artificial debouncing (instant feedback)

---

## Browser Compatibility

- **Modern browsers** with ES6+ support required
- **LocalStorage API** for persistence
- **PostMessage API** for cross-window communication
- **SVG support** for pie charts
- **Flexbox** and **CSS Grid** for layouts
- **Position: sticky** for table headers
- **Navigator.clipboard** for copy functionality

---

## Key Technologies

- **Framework**: Next.js 15.5.6 with Turbopack
- **Language**: TypeScript (with relaxed build rules)
- **Runtime**: React 18 with Hooks
- **Styling**: Inline styles (no CSS framework)
- **State**: React Hooks (useState, useEffect, useMemo, useRef)
- **Storage**: Browser localStorage
- **Build**: Next.js build system with Turbopack

---

## File Structure

```
src/pages/
  index.tsx                 # Main entry with data loading
  PerformanceToolPage.tsx   # Core component (this file)
  analyzer.tsx             # Client-only route wrapper
  _app.tsx                 # Next.js app wrapper
  _document.tsx            # Custom document
  api/
    fetchSiteModels.ts     # API endpoint for site models
```

---

## LocalStorage Keys

1. **`performance-tool:lastData`**: Cached performance data
2. **`performance-tool:filters`**: All user settings and filters

---

*Last Updated: October 27, 2025*
*Version: 2.0 - Complete Feature Documentation*
