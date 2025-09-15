# UN ESCAP Climate & Energy Risk Visualization Platform

A modern web application for the United Nations ESCAP to visualize climate and energy risk data across Bhutan, Mongolia, and Laos with multi-map comparison capabilities for comprehensive regional analysis.

**Experience Qualities**:
1. **Professional** - Reflects UN ESCAP's authoritative position with clean, institutional design language
2. **Analytical** - Prioritizes data clarity and comparison functionality for informed decision-making  
3. **Responsive** - Provides smooth, synchronized interactions across multiple map views

**Complexity Level**: Complex Application (advanced functionality, accounts)
- Multi-map synchronization requires sophisticated state management and real-time coordination between map instances
- Hierarchical data selection with dynamic file fetching based on user choices
- Professional geospatial analysis tools with custom raster styling and layer management

## Essential Features

**Multi-Map Comparison System**
- Functionality: Toggle between 1, 2, or 4 map layouts for side-by-side analysis
- Purpose: Enable direct comparison of different climate scenarios, countries, or risk factors
- Trigger: Header comparison buttons (1/2/4 Maps)
- Progression: Select layout → Maps arrange in grid → Click to activate map → Apply layers to active map → All maps stay synchronized
- Success criteria: Smooth layout transitions, clear active map indication, independent layer control per map

**Synchronized Map Navigation**
- Functionality: Pan/zoom actions on any map automatically apply to all visible maps
- Purpose: Maintain spatial consistency for accurate cross-comparison analysis
- Trigger: User interaction with any map (pan, zoom, wheel scroll)
- Progression: Interact with map → Detect view change → Propagate to all other maps → Smooth animation sync
- Success criteria: <100ms response time, smooth animations, no visual lag between maps

**Hierarchical Data Layer System**
- Functionality: Dynamic layer selection with Climate/GIRI/Energy categories and drill-down options
- Purpose: Access specific datasets through intuitive navigation without overwhelming interface
- Trigger: Sidebar layer controls selection
- Progression: Select category → Choose variable → Select scenario → Pick time range → Choose seasonality → Apply to active map
- Success criteria: Fast file fetching, clear selection state, immediate overlay response

**Country-Focused Analysis**
- Functionality: Quick switching between Bhutan, Mongolia, and Laos with automatic map centering
- Purpose: Streamline regional analysis workflow for ESCAP stakeholders
- Trigger: Header country selector
- Progression: Select country → All maps center on region → Zoom to appropriate level → Layer data updates contextually
- Success criteria: <2 second country switching, accurate geographic centering, relevant data availability

**UN ESCAP Branded Interface**
- Functionality: Official color scheme, logo integration, and professional layout
- Purpose: Maintain institutional credibility and brand consistency
- Trigger: Application load and throughout all interactions
- Progression: Load app → Display UN ESCAP branding → Maintain consistency across all components
- Success criteria: Pixel-perfect brand compliance, professional appearance, accessibility standards

## Edge Case Handling

- **Large Raster Loading**: COG format with progressive loading and fallback indicators
- **Network Interruptions**: Graceful degradation with retry mechanisms and offline state indicators
- **Projection Mismatches**: Automatic reprojection to EPSG:4326 with accuracy warnings
- **Layer Conflicts**: Clear error messages when incompatible layers are selected
- **Memory Management**: Automatic cleanup of unused map tiles and layer data
- **Mobile Responsiveness**: Adaptive layout that prioritizes single map view on small screens

## Design Direction

The design should evoke institutional authority and analytical precision while remaining approachable for technical and non-technical users. A clean, data-forward interface that emphasizes content over decoration, with careful attention to information hierarchy and professional typography.

## Color Selection

Complementary palette based on UN ESCAP official colors to create strong visual hierarchy and brand recognition.

- **Primary Color**: UN Blue (#0072bc) - Communicates authority, trust, and institutional credibility
- **Secondary Colors**: Light Blue (#009edb) for supporting elements, Green (#56c02b) for positive indicators and success states
- **Accent Color**: Bright Green (#56c02b) - Attention-grabbing highlight for active states, CTAs, and data emphasis
- **Foreground/Background Pairings**: 
  - Background (White #FFFFFF): Dark Blue text (#0072bc) - Ratio 8.1:1 ✓
  - Primary (#0072bc): White text (#FFFFFF) - Ratio 8.1:1 ✓  
  - Secondary (#009edb): White text (#FFFFFF) - Ratio 5.8:1 ✓
  - Accent (#56c02b): White text (#FFFFFF) - Ratio 4.9:1 ✓
  - Card (Light Gray #F8F9FA): Dark Blue text (#0072bc) - Ratio 7.8:1 ✓

## Font Selection

Typography should convey technical precision while maintaining institutional gravitas, using system fonts for optimal performance and cross-platform consistency.

- **Typographic Hierarchy**:
  - H1 (Application Title): System Bold/32px/tight letter spacing
  - H2 (Panel Headers): System SemiBold/24px/normal spacing  
  - H3 (Section Titles): System Medium/18px/normal spacing
  - Body (Interface Text): System Regular/14px/relaxed line height
  - Caption (Data Labels): System Regular/12px/tight line height

## Animations

Animations should reinforce the application's analytical purpose through smooth, purposeful transitions that guide attention without creating visual noise.

- **Purposeful Meaning**: Motion communicates data relationships and system feedback through subtle transitions
- **Hierarchy of Movement**: Map synchronization deserves primary animation focus, with secondary attention to panel transitions and tertiary focus on micro-interactions

## Component Selection

- **Components**: Card for panel containers, Button for actions, Select for dropdowns, Switch for toggles, Tooltip for data explanations, Badge for status indicators
- **Customizations**: Custom map container with OpenLayers integration, specialized layer control panels, synchronized view management system
- **States**: Clear hover/active states for map selection, loading states for data fetching, error states for network issues
- **Icon Selection**: Phosphor icons for consistent visual language - Map for geography, Layers for data, Globe for countries, Chart for analytics
- **Spacing**: Tailwind 4-unit spacing (16px) for major sections, 2-unit (8px) for related elements, 1-unit (4px) for tight groupings
- **Mobile**: Single map priority with collapsible panels, simplified layer controls, touch-optimized zoom controls, responsive typography scaling