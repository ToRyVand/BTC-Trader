# Implementation Plan: Dashboard 2D Trading Floor

## Overview

Este plan de implementación transforma el dashboard HTML/CSS estático actual en un escenario 2D interactivo estilo RPG. El sistema mantiene toda la funcionalidad existente (sidebar, header, ticker tape) mientras reemplaza el grid de agentes con un canvas 2D que muestra sprites animados, pathfinding, y sincronización en tiempo real con journal.jsonl.

La implementación sigue 7 fases incrementales basadas en el diseño técnico, con cada task siendo atómica, verificable, y construyendo sobre las anteriores. El sistema usa vanilla JavaScript (ES6 modules) sin dependencias externas, logrando 60 FPS en desktop y manteniendo la estética VGA pixel-art del dashboard actual.

**Tech Stack**: Vanilla JavaScript, HTML5 Canvas 2D, ES6 Modules
**Target Performance**: 60 FPS desktop, 30-45 FPS mobile
**Grid Size**: 20x15 tiles (640x480px canvas)
**Agents**: 5 agentes animados con FSM de 8 estados

## Tasks

### Phase 1: Core Engine Setup

- [x] 1. Setup project structure and core modules
  - Create `js/` directory with subdirectories: `engine/`, `sprites/`, `movement/`, `state/`, `events/`, `ui/`, `scene/`, `agents/`, `utils/`
  - Create `assets/sprites/` directory for sprite sheets
  - Setup ES6 module structure with proper imports/exports
  - _Requirements: 20.4_

- [ ] 2. Implement Canvas2DEngine core
  - [x] 2.1 Create Canvas2DEngine class with initialization
    - Initialize canvas element with 640x480 dimensions (20x15 tiles at 32px)
    - Disable image smoothing for pixel-perfect rendering
    - Setup game loop using requestAnimationFrame targeting 60 FPS
    - Implement update(deltaTime) and render() methods
    - _Requirements: 1.1, 1.2, 1.5_
  
  - [ ]* 2.2 Write property test for Canvas2DEngine initialization
    - **Property 1: Engine Initialization Correctness**
    - **Validates: Requirements 1.1, 1.3**
  
  - [x] 2.3 Implement responsive canvas scaling
    - Calculate scale factor to fit container while maintaining 4:3 aspect ratio
    - Apply CSS transform scale without upscaling beyond 1x
    - Convert click coordinates using current scale factor
    - Add window resize listener
    - _Requirements: 1.6, 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [ ]* 2.4 Write property test for responsive scaling
    - **Property 3: Responsive Scaling Correctness**
    - **Validates: Requirements 1.6, 11.1, 11.2, 11.3, 11.4**

- [ ] 3. Implement LayerManager system
  - [x] 3.1 Create LayerManager class with 4 layers
    - Create layers: floor (z:0), objects (z:1), agents (z:2), ui (z:3)
    - Implement offscreen canvas for static layers (floor, objects)
    - Implement renderAll() to composite layers to main canvas
    - Add markDirty() for dirty rectangle tracking
    - _Requirements: 1.3, 10.3, 10.4, 10.6_
  
  - [ ]* 3.2 Write unit tests for LayerManager
    - Test layer creation and z-index ordering
    - Test static layer caching
    - Test dirty rectangle tracking
    - _Requirements: 1.3_

- [ ] 4. Implement VGA palette and floor rendering
  - [x] 4.1 Create VGAPalette utility module
    - Define 16 VGA colors matching existing dashboard CSS
    - Export color constants for use across modules
    - _Requirements: 18.1_
  
  - [x] 4.2 Render checkerboard floor pattern
    - Render floor tiles to offscreen canvas (one-time render)
    - Use VGA colors for checkerboard pattern
    - Add subtle grid lines (rgba(0, 170, 0, 0.05))
    - _Requirements: 1.4, 18.1, 18.2_
  
  - [ ]* 4.3 Write property test for checkerboard pattern
    - **Property 2: Checkerboard Pattern Correctness**
    - **Validates: Requirements 1.4**

- [x] 5. Checkpoint - Verify core engine renders correctly
  - Ensure canvas initializes at 640x480px
  - Ensure game loop runs at ~60 FPS
  - Ensure floor layer renders checkerboard pattern
  - Ensure canvas scales responsively
  - Ensure all tests pass, ask the user if questions arise.

### Phase 2: Sprites & Animation System

- [ ] 6. Implement SpriteSystem for sprite sheet management
  - [x] 6.1 Create SpriteSystem class
    - Implement loadSpriteSheet() with async Image loading
    - Cache loaded sprite sheets in memory
    - Implement getSprite() to extract frame from sheet
    - Add fallback to CSS box-shadow sprites if PNG fails
    - _Requirements: 3.1, 15.1, 15.2, 12.3_
  
  - [ ]* 6.2 Write property test for sprite sheet frame dimensions
    - **Property 6: Sprite Sheet Frame Dimensions**
    - **Validates: Requirements 3.1**
  
  - [ ]* 6.3 Write property test for sprite cache reuse
    - **Property 25: Sprite Cache Reuse**
    - **Validates: Requirements 15.2**

- [ ] 7. Implement AnimationController for frame-by-frame animation
  - [x] 7.1 Create AnimationController class
    - Implement update(deltaTime) to advance frames based on FPS
    - Support looping and non-looping animations
    - Implement play(), stop(), getCurrentFrame()
    - Handle animation completion callbacks
    - _Requirements: 3.3, 3.4, 3.5_
  
  - [ ]* 7.2 Write property test for animation frame advancement
    - **Property 7: Animation Frame Advancement**
    - **Validates: Requirements 3.3, 3.4, 3.5**
  
  - [ ]* 7.3 Write unit tests for AnimationController
    - Test frame advancement with deltaTime
    - Test looping vs non-looping behavior
    - Test animation callbacks
    - _Requirements: 16.5_

- [ ] 8. Create Agent class and sprite configuration
  - [x] 8.1 Create Agent class with properties
    - Define Agent properties: id, name, type, tile, pixelPos, direction, state, animation, path, speed, signal, stats, homeDesk, color
    - Implement validation for tile coordinates and direction
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ]* 8.2 Write property test for agent creation invariants
    - **Property 4: Agent Creation Invariants**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.6**

- [ ] 9. Implement agent sprite rendering
  - [x] 9.1 Create AgentController to manage all agents
    - Create 5 Agent instances with configs (tech, quant, fund, sent, risk)
    - Position agents at their home desks
    - Initialize animations to 'idle_down'
    - _Requirements: 2.1, 2.2, 2.6_
  
  - [x] 9.2 Render agents to agent layer
    - Implement renderAgent() to draw sprite at agent's pixel position
    - Use AnimationController to get current frame
    - Render all agents each frame
    - _Requirements: 2.5_
  
  - [ ]* 9.3 Write property test for agent sprite rendering position
    - **Property 5: Agent Sprite Rendering Position**
    - **Validates: Requirements 2.5**

- [ ] 10. Create sprite sheet assets (or CSS fallback)
  - [x] 10.1 Create sprite sheet PNGs for 5 agent types
    - Create tech-sprite.png (24x24px frames, 14 animations)
    - Create quant-sprite.png, fund-sprite.png, sent-sprite.png, risk-sprite.png
    - Each sheet includes: idle (4 dirs), walk (4 dirs), think, signal_buy, signal_sell, signal_hold, celebrate, panic
    - _Requirements: 3.1, 3.2_
  
  - [x] 10.2 Implement CSS box-shadow sprite fallback
    - Pre-render CSS box-shadow sprites to offscreen canvas
    - Cache rendered sprites for performance
    - _Requirements: 3.6, 15.3_

- [x] 11. Checkpoint - Verify agents render with animations
  - Ensure 5 agents render at their home desks
  - Ensure idle animations play correctly
  - Ensure sprite sheets load (or fallback works)
  - Ensure all tests pass, ask the user if questions arise.

### Phase 3: Movement & Pathfinding

- [ ] 12. Implement TileGrid and obstacle management
  - [x] 12.1 Create TileGrid class
    - Create 20x15 grid of Tile objects
    - Mark obstacle tiles as non-walkable (desks, walls)
    - Implement toPixels() conversion
    - _Requirements: 7.1, 7.4_
  
  - [ ]* 12.2 Write property test for obstacle walkability
    - **Property 15: Obstacle Walkability**
    - **Validates: Requirements 7.4**

- [ ] 13. Implement PathFinder with A* algorithm
  - [x] 13.1 Create PathFinder class
    - Implement A* algorithm with Manhattan distance heuristic
    - Implement getNeighbors() for 4-directional movement
    - Return path as array of tiles from start to end
    - Return empty array if no path exists
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 13.2 Write property test for Manhattan distance heuristic
    - **Property 8: Manhattan Distance Heuristic**
    - **Validates: Requirements 4.1**
  
  - [ ]* 13.3 Write property test for path validity
    - **Property 9: Path Validity**
    - **Validates: Requirements 4.2**
  
  - [ ]* 13.4 Write unit tests for PathFinder
    - Test correct path calculation between walkable tiles
    - Test obstacle avoidance
    - Test no path found when blocked
    - _Requirements: 16.1, 16.2_

- [ ] 14. Implement MovementSystem for smooth agent movement
  - [x] 14.1 Create MovementSystem class
    - Implement moveAgent() to move along path at 64px/s (2 tiles/s)
    - Update agent direction based on movement vector
    - Trigger walk animation for agent's direction
    - Transition to next state when destination reached
    - _Requirements: 4.4, 4.5, 4.6, 4.7_
  
  - [ ]* 14.2 Write property test for agent movement correctness
    - **Property 10: Agent Movement Correctness**
    - **Validates: Requirements 4.4, 4.5, 4.6**
  
  - [ ] 14.3 Implement CollisionDetector
    - Check if tile is walkable before movement
    - Handle pathfinding failure gracefully (skip movement)
    - _Requirements: 12.4_

- [x] 15. Checkpoint - Verify agents can move between tiles
  - Ensure PathFinder calculates valid paths
  - Ensure agents move smoothly at 2 tiles/second
  - Ensure walk animations play during movement
  - Ensure agents avoid obstacles
  - Ensure all tests pass, ask the user if questions arise.

### Phase 4: State Management & FSM

- [ ] 16. Implement AgentStateMachine with FSM logic
  - [x] 16.1 Create AgentStateMachine class
    - Define 8 states: IDLE, WALKING_TO_STATION, ANALYZING, WALKING_TO_MEETING, SIGNALING, WAITING_DIRECTOR, CELEBRATING, PANICKING
    - Define valid transitions map
    - Implement transition() with validation
    - Execute onExit and onEnter callbacks
    - Track previousState for debugging
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 16.2 Write property test for FSM transition validation
    - **Property 11: FSM Transition Validation**
    - **Validates: Requirements 5.2, 5.3**
  
  - [ ]* 16.3 Write property test for FSM transition execution
    - **Property 12: FSM Transition Execution**
    - **Validates: Requirements 5.4, 5.5, 5.6**
  
  - [ ]* 16.4 Write unit tests for AgentStateMachine
    - Test valid transitions are allowed
    - Test invalid transitions are rejected
    - Test callbacks execute in correct order
    - _Requirements: 16.3, 16.4_

- [ ] 17. Implement StateManager for global state
  - [x] 17.1 Create StateManager class
    - Manage global states: systemState, lastCycleTimestamp, activeAgents, directorVerdict
    - Implement setState(), getState(), subscribe()
    - Manage agent state machines
    - Implement transitionAgent() to trigger FSM transitions
    - _Requirements: 5.1_

- [ ] 18. Setup agent state callbacks for animations
  - [x] 18.1 Configure state callbacks for each agent
    - WALKING_TO_STATION → play walk animation
    - ANALYZING → play think animation, show dialog bubble
    - SIGNALING → play signal animation (buy/sell/hold), show signal bubble
    - CELEBRATING → play celebrate animation, spawn sparkle particles
    - PANICKING → play panic animation, spawn explosion particles
    - IDLE → play idle animation
    - _Requirements: 3.2, 4.6_

- [x] 19. Checkpoint - Verify FSM transitions work correctly
  - Ensure valid transitions are allowed
  - Ensure invalid transitions are rejected
  - Ensure animations change with state transitions
  - Ensure all tests pass, ask the user if questions arise.

### Phase 5: Event System & Journal Integration

- [x] 20. Implement EventSystem for event emission and listening
  - [x] 20.1 Create EventSystem class
    - Implement emit() to trigger events
    - Implement on() to register listeners
    - Support multiple listeners per event
    - _Requirements: 6.2_

- [x] 21. Implement JournalPoller for journal.jsonl polling
  - [x] 21.1 Create JournalPoller class
    - Poll journal.jsonl every 8 seconds using fetch API
    - Parse JSONL format (one JSON object per line)
    - Track lastProcessedTimestamp to avoid duplicates
    - Handle fetch errors gracefully (retry after 30s)
    - Implement 5-second fetch timeout
    - _Requirements: 6.1, 6.6, 12.1, 12.6_
  
  - [ ]* 21.2 Write property test for event deduplication
    - **Property 14: Event Deduplication**
    - **Validates: Requirements 6.6**

- [x] 22. Implement journal event processing logic
  - [x] 22.1 Process CYCLE events
    - Emit 'cycle:start' event with signals data
    - Transition all agents to WALKING_TO_STATION
    - Calculate paths to home desks
    - Start agent movement
    - _Requirements: 6.3_
  
  - [x] 22.2 Process DECISION events
    - Emit 'director:verdict' event with decision data
    - Show director verdict animation/overlay
    - _Requirements: 6.4_
  
  - [x] 22.3 Process EXECUTION events
    - Emit 'trade:executed' event with profit/loss
    - Transition agents to CELEBRATING (profit) or PANICKING (loss)
    - Update sidebar stats
    - _Requirements: 6.5_
  
  - [ ]* 22.4 Write property test for event routing correctness
    - **Property 13: Event Routing Correctness**
    - **Validates: Requirements 6.2, 6.4, 6.5**
  
  - [ ]* 22.5 Write unit tests for EventSystem
    - Test journal entry processing
    - Test event emission
    - Test listener execution
    - _Requirements: 16.6_

- [x] 23. Integrate EventSystem with Canvas2DEngine
  - [x] 23.1 Wire EventSystem to StateManager and AgentController
    - Connect journal events to agent state transitions
    - Update agent signals when CYCLE event occurs
    - Trigger animations based on events
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [x] 24. Checkpoint - Verify journal events trigger animations
  - Ensure journal.jsonl is polled every 8 seconds
  - Ensure CYCLE events trigger agent movement
  - Ensure DECISION events show director verdict
  - Ensure EXECUTION events trigger celebration/panic
  - Ensure all tests pass, ask the user if questions arise.

### Phase 6: UI Overlay & Interactions

- [x] 25. Implement DialogBubble for RPG-style text bubbles
  - [x] 25.1 Create DialogBubble class
    - Render bubble with black background, cyan border
    - Use "Press Start 2P" font at 6px
    - Wrap text to max 120px width
    - Add tail pointing to agent
    - Implement duration-based lifecycle
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ]* 25.2 Write property test for dialog bubble styling
    - **Property 16: Dialog Bubble Styling**
    - **Validates: Requirements 8.2**
  
  - [ ]* 25.3 Write property test for text wrapping
    - **Property 17: Text Wrapping**
    - **Validates: Requirements 8.3**
  
  - [ ]* 25.4 Write property test for bubble lifecycle
    - **Property 18: Bubble Lifecycle**
    - **Validates: Requirements 8.4**

- [x] 26. Implement StatsPanel for agent stats display
  - [x] 26.1 Create StatsPanel class
    - Show panel on agent click with: name, confidence, wins, losses, XP, level
    - Hide panel on click outside agent
    - Render panel with VGA styling
    - Support keyboard navigation (ESC to close)
    - _Requirements: 8.5, 8.6, 19.5_

- [x] 27. Implement ParticleEffect system
  - [x] 27.1 Create ParticleEffect class
    - Define particle types: sparkle (green/yellow), explosion (red/orange)
    - Update particle position and opacity based on deltaTime
    - Remove particles when lifetime expires
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ]* 27.2 Write property test for state-based particle spawning
    - **Property 19: State-Based Particle Spawning**
    - **Validates: Requirements 9.1, 9.2**
  
  - [ ]* 27.3 Write property test for particle physics update
    - **Property 20: Particle Physics Update**
    - **Validates: Requirements 9.3**
  
  - [ ]* 27.4 Write property test for particle cleanup
    - **Property 21: Particle Cleanup**
    - **Validates: Requirements 9.4**
  
  - [x] 27.5 Implement ParticlePool for object pooling
    - Create pool of 100 pre-allocated particles
    - Implement spawn() and return-to-pool logic
    - Limit active particles to 100
    - _Requirements: 9.5, 9.6, 17.1_
  
  - [ ]* 27.6 Write property test for particle count limit
    - **Property 22: Particle Count Limit**
    - **Validates: Requirements 9.6**

- [x] 28. Implement UIOverlay to coordinate UI elements
  - [x] 28.1 Create UIOverlay class
    - Manage active dialog bubbles
    - Manage stats panel visibility
    - Manage active particles
    - Implement update(deltaTime) for all UI elements
    - Implement render(ctx) to draw all UI elements to ui layer
    - _Requirements: 8.1, 8.5, 9.1, 9.2_

- [x] 29. Add click interaction for agent stats
  - [x] 29.1 Implement click detection on agents
    - Convert click coordinates using scale factor
    - Detect which agent was clicked (if any)
    - Show StatsPanel for clicked agent
    - Hide panel on click outside
    - _Requirements: 8.5, 8.6, 11.5_
  
  - [ ]* 29.2 Write property test for click coordinate conversion
    - **Property 23: Click Coordinate Conversion**
    - **Validates: Requirements 11.5**

- [x] 30. Checkpoint - Verify UI overlay elements work
  - Ensure dialog bubbles appear above agents
  - Ensure stats panel shows on agent click
  - Ensure particles spawn and animate correctly
  - Ensure all tests pass, ask the user if questions arise.

### Phase 7: Scene Layout & Objects

- [ ] 31. Implement SceneLayout with zones and objects
  - [ ] 31.1 Create SceneLayout configuration
    - Define desk positions for 5 agents
    - Define meeting room center and seats
    - Define server room and market screens zones
    - Define obstacle tiles (desks, walls)
    - Define decoration positions (plants, coffee machine, cables)
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_

- [ ] 32. Render scene objects to object layer
  - [ ] 32.1 Render desks at agent positions
    - Draw 2x1 tile desks at each agent's home position
    - Draw monitors on desks
    - _Requirements: 7.2_
  
  - [ ] 32.2 Render meeting room table
    - Draw circular table at meeting room center
    - _Requirements: 7.3_
  
  - [ ] 32.3 Render decorations
    - Draw plants, coffee machine, cables at specified positions
    - _Requirements: 7.5_
  
  - [ ] 32.4 Render server room and market screens
    - Draw server racks in server room zone
    - Draw market screens in market screens zone
    - _Requirements: 7.6_

- [ ] 33. Optimize static layer rendering
  - [ ] 33.1 Pre-render floor and objects to offscreen canvas
    - Render floor layer once at initialization
    - Render object layer once at initialization
    - Only redraw dynamic layers (agents, ui) each frame
    - _Requirements: 7.6, 10.3, 10.4_

- [ ] 34. Checkpoint - Verify scene layout renders correctly
  - Ensure desks appear at correct positions
  - Ensure meeting room table is visible
  - Ensure decorations render correctly
  - Ensure static layers are cached
  - Ensure all tests pass, ask the user if questions arise.

### Phase 8: Integration & Polish

- [ ] 35. Integrate canvas with existing dashboard HTML
  - [ ] 35.1 Modify dashboard.html to replace #agent-grid
    - Remove existing #agent-grid HTML
    - Add canvas element with id="trading-floor-canvas"
    - Maintain header, ticker tape, sidebar, director banner
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ] 35.2 Add CSS for canvas styling
    - Apply pixel-perfect rendering CSS (image-rendering: pixelated)
    - Add responsive scaling CSS
    - Maintain VGA color scheme
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

- [ ] 36. Synchronize canvas with sidebar stats
  - [ ] 36.1 Update sidebar on journal events
    - Update KPIs when trade executes
    - Update battle log with agent actions
    - Maintain existing sidebar functionality
    - _Requirements: 13.6, 19.2, 19.3, 19.4_

- [x] 37. Implement error handling and recovery
  - [x] 37.1 Handle journal load failures
    - Show error overlay "Sin conexión con journal.jsonl"
    - Retry after 30 seconds
    - Continue rendering scene in IDLE state
    - _Requirements: 12.1, 12.2_
  
  - [x] 37.2 Handle sprite load failures
    - Fallback to CSS box-shadow sprites
    - Log warning to console
    - _Requirements: 12.3_
  
  - [x] 37.3 Handle pathfinding failures
    - Skip movement if no path found
    - Transition to next state immediately
    - Log warning with details
    - _Requirements: 12.4_
  
  - [ ]* 37.4 Write property test for FSM error resilience
    - **Property 24: FSM Error Resilience**
    - **Validates: Requirements 12.5**

- [ ] 38. Implement performance monitoring and optimization
  - [ ] 38.1 Create PerformanceMonitor utility
    - Calculate FPS each frame
    - Detect when FPS drops below 30
    - Apply mobile optimizations automatically
    - _Requirements: 10.1, 10.2, 10.5_
  
  - [ ] 38.2 Implement mobile detection and optimizations
    - Detect mobile devices via user agent
    - Reduce particle count to 10 on mobile
    - Target 30 FPS on mobile
    - Disable shadows on mobile
    - Use touch events instead of mouse events
    - _Requirements: 11.6_

- [x] 39. Implement memory management and cleanup
  - [x] 39.1 Add cleanup methods to all systems
    - Remove event listeners in destroy()
    - Cancel requestAnimationFrame in stop()
    - Clear particle arrays when particles expire
    - Dispose offscreen canvases when layers destroyed
    - Limit journal entries to last 1000
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_
  
  - [ ]* 39.2 Write property test for journal entry limit
    - **Property 26: Journal Entry Limit**
    - **Validates: Requirements 17.6**

- [x] 40. Add accessibility features
  - [x] 40.1 Implement accessibility attributes
    - Add aria-label to canvas element
    - Update battle log with text descriptions of agent actions
    - Log state transitions to battle log
    - Support keyboard navigation for stats panel
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 41. Browser compatibility testing
  - [x] 41.1 Test on target browsers
    - Test on Chrome 60+
    - Test on Firefox 55+
    - Test on Safari 11+
    - Test on Edge 79+
    - Verify no vendor prefixes needed
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [x] 42. Create test journal for integration testing
  - [x] 42.1 Create journal_test.jsonl with test scenarios
    - Full cycle flow (CYCLE → DECISION → EXECUTION)
    - Multiple cycles
    - Error conditions
    - Edge cases
    - _Requirements: 16.6_

- [x] 43. Final checkpoint - Complete integration testing
  - Ensure full cycle flow works end-to-end
  - Ensure multiple cycles work without memory leaks
  - Ensure error handling works gracefully
  - Ensure UI interactions work correctly
  - Ensure performance targets are met (60 FPS desktop, 30-45 FPS mobile)
  - Ensure browser compatibility across all target browsers
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at the end of each phase
- Property tests validate universal correctness properties from the design
- Unit tests validate specific examples and edge cases
- The implementation uses vanilla JavaScript (ES6 modules) without build process
- All sprite rendering uses pixel-perfect alignment (no anti-aliasing)
- The system maintains the VGA 16-color palette and "Press Start 2P" font
- Static layers (floor, objects) are rendered once to offscreen canvas for performance
- Dynamic layers (agents, ui) are redrawn every frame
- Object pooling is used for particles to avoid memory allocation during gameplay
- The canvas replaces the existing #agent-grid while maintaining all other dashboard elements
