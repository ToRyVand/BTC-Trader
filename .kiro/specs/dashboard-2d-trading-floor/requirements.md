# Requirements Document

## Introduction

Este documento especifica los requisitos funcionales y no funcionales para el Dashboard 2D Trading Floor, una visualización interactiva estilo RPG que transforma el dashboard HTML/CSS estático actual en un escenario 2D animado donde los agentes de trading se mueven, analizan el mercado, y reaccionan a las decisiones del director (Claude).

El sistema mantiene toda la funcionalidad existente del dashboard (sidebar con KPIs, header con precio BTC, ticker tape) mientras reemplaza el grid estático de agentes con un canvas 2D que muestra un escenario de oficina de trading con sprites animados, pathfinding, y sincronización en tiempo real con journal.jsonl.

## Glossary

- **Canvas2DEngine**: Motor principal que gestiona el game loop, renderizado, y coordinación de subsistemas
- **Agent**: Entidad que representa un agente de trading (TICKER, LA MAQUINA, ECONOMISTA, PERIODISTA, JEFE RIESGO) con sprite animado y FSM
- **Tile**: Unidad básica del grid (32x32 pixels), puede ser walkable o obstacle
- **Sprite**: Imagen 24x24px que representa un agente en un frame específico
- **FSM**: Finite State Machine que controla los estados de cada agente (IDLE, WALKING, ANALYZING, etc.)
- **LayerManager**: Sistema que gestiona las 4 capas de renderizado (floor, objects, agents, ui)
- **PathFinder**: Algoritmo A* que calcula rutas entre tiles evitando obstáculos
- **EventSystem**: Sistema que sincroniza eventos del journal.jsonl con animaciones del canvas
- **UIOverlay**: Capa que renderiza elementos UI sobre el canvas (burbujas, panels, partículas)
- **journal.jsonl**: Archivo que contiene el log de eventos del sistema de trading en tiempo real
- **VGA Palette**: Paleta de 16 colores estilo CRT/VGA usada en el dashboard

## Requirements

### Requirement 1: Canvas Initialization and Rendering

**User Story:** Como usuario del dashboard, quiero ver un escenario 2D renderizado en un canvas HTML5, para que pueda visualizar el entorno de trading de forma inmersiva.

#### Acceptance Criteria

1. WHEN the dashboard loads, THE Canvas2DEngine SHALL initialize a canvas element with dimensions 640x480 pixels (20x15 tiles at 32px per tile)
2. THE Canvas2DEngine SHALL disable image smoothing to achieve pixel-perfect rendering
3. THE Canvas2DEngine SHALL create 4 rendering layers with correct z-index ordering (floor: 0, objects: 1, agents: 2, ui: 3)
4. WHEN the canvas is initialized, THE Canvas2DEngine SHALL render a checkerboard floor pattern using VGA colors
5. THE Canvas2DEngine SHALL execute a game loop at 60 FPS using requestAnimationFrame
6. WHEN the browser window is resized, THE Canvas2DEngine SHALL scale the canvas proportionally while maintaining aspect ratio

---

### Requirement 2: Agent Representation and Initialization

**User Story:** Como usuario del dashboard, quiero ver 5 agentes representados como sprites animados en el escenario, para que pueda identificar cada agente y su rol.

#### Acceptance Criteria

1. THE System SHALL create 5 Agent instances with unique IDs: 'tech', 'quant', 'fund', 'sent', 'risk'
2. WHEN an Agent is created, THE System SHALL assign it a home desk position in the grid
3. WHEN an Agent is created, THE System SHALL assign it a color from the VGA palette based on its type
4. WHEN an Agent is created, THE System SHALL initialize its FSM in the IDLE state
5. THE System SHALL render each Agent as a 24x24px sprite at its current tile position
6. WHEN the system starts, THE System SHALL position all agents at their home desks

---

### Requirement 3: Sprite Animation System

**User Story:** Como usuario del dashboard, quiero ver animaciones fluidas cuando los agentes se mueven o realizan acciones, para que el dashboard se sienta dinámico y vivo.

#### Acceptance Criteria

1. THE SpriteSystem SHALL load sprite sheets for each agent type with 24x24px frames
2. THE SpriteSystem SHALL support 14 animation types per agent: idle (4 directions), walk (4 directions), think, signal_buy, signal_sell, signal_hold, celebrate, panic
3. WHEN an animation plays, THE AnimationController SHALL advance frames based on deltaTime and configured FPS
4. WHEN a looping animation completes, THE AnimationController SHALL restart from the first frame
5. WHEN a non-looping animation completes, THE AnimationController SHALL stop at the last frame
6. THE SpriteSystem SHALL fallback to CSS box-shadow sprites if PNG sprite sheets fail to load

---

### Requirement 4: Pathfinding and Movement

**User Story:** Como usuario del dashboard, quiero ver a los agentes moverse de forma natural entre diferentes ubicaciones del escenario, para que sus acciones sean creíbles y fluidas.

#### Acceptance Criteria

1. THE PathFinder SHALL implement A* algorithm with Manhattan distance heuristic
2. WHEN a path is requested, THE PathFinder SHALL return an array of tiles from start to end avoiding obstacles
3. IF no valid path exists, THE PathFinder SHALL return an empty array
4. THE MovementSystem SHALL move agents smoothly between tiles at 2 tiles per second (64 pixels/second)
5. WHEN an agent moves, THE MovementSystem SHALL update the agent's direction based on movement vector
6. WHEN an agent moves, THE System SHALL play the appropriate walk animation for the agent's direction
7. WHEN an agent reaches its destination tile, THE MovementSystem SHALL transition the agent to the next FSM state

---

### Requirement 5: Agent State Machine

**User Story:** Como usuario del dashboard, quiero que los agentes transicionen entre diferentes estados de forma lógica, para que sus comportamientos reflejen el flujo del ciclo de trading.

#### Acceptance Criteria

1. THE AgentStateMachine SHALL support 8 states: IDLE, WALKING_TO_STATION, ANALYZING, WALKING_TO_MEETING, SIGNALING, WAITING_DIRECTOR, CELEBRATING, PANICKING
2. WHEN a state transition is requested, THE AgentStateMachine SHALL validate it against the allowed transitions map
3. IF a transition is invalid, THE AgentStateMachine SHALL reject it and log a warning
4. WHEN a valid transition occurs, THE AgentStateMachine SHALL execute onExit callback for the current state
5. WHEN a valid transition occurs, THE AgentStateMachine SHALL execute onEnter callback for the new state
6. THE AgentStateMachine SHALL maintain previousState for debugging purposes

---

### Requirement 6: Journal Event Processing

**User Story:** Como usuario del dashboard, quiero que las animaciones del canvas se sincronicen con los eventos del journal.jsonl, para que vea en tiempo real lo que está sucediendo en el sistema de trading.

#### Acceptance Criteria

1. THE EventSystem SHALL poll journal.jsonl every 8 seconds using fetch API
2. WHEN a new journal entry is detected, THE EventSystem SHALL process it based on its event type
3. WHEN a CYCLE event is processed, THE EventSystem SHALL transition all agents to WALKING_TO_STATION state
4. WHEN a DECISION event is processed, THE EventSystem SHALL emit a director:verdict event with the decision data
5. WHEN an EXECUTION event is processed, THE EventSystem SHALL transition agents to CELEBRATING or PANICKING based on profit/loss
6. THE EventSystem SHALL ignore journal entries with timestamps older than or equal to the last processed timestamp

---

### Requirement 7: Scene Layout and Objects

**User Story:** Como usuario del dashboard, quiero ver un escenario de oficina de trading con escritorios, sala de reuniones, y decoraciones, para que el entorno sea reconocible y contextual.

#### Acceptance Criteria

1. THE SceneLayout SHALL define a 20x15 tile grid with designated zones: desks, meeting room, server room, market screens
2. THE System SHALL render 5 desk objects at positions (2,2), (7,2), (12,2), (17,2), (2,7) with 2x1 tile size
3. THE System SHALL render a circular meeting table at the center of the meeting room zone
4. THE System SHALL mark desk tiles and wall tiles as non-walkable obstacles
5. THE System SHALL render decorative objects (plants, coffee machine, cables) at specified positions
6. THE System SHALL render static layers (floor, objects) to offscreen canvases for performance optimization

---

### Requirement 8: UI Overlay Elements

**User Story:** Como usuario del dashboard, quiero ver burbujas de diálogo con las razones de las señales y un panel de stats al hacer click en un agente, para que pueda entender las decisiones de cada agente.

#### Acceptance Criteria

1. WHEN an agent enters ANALYZING state, THE UIOverlay SHALL display a dialog bubble above the agent with the signal reason text
2. THE DialogBubble SHALL use RPG-style rendering with black background, cyan border, and pixel font
3. THE DialogBubble SHALL wrap text to a maximum width of 120 pixels
4. WHEN a dialog bubble duration expires, THE UIOverlay SHALL remove it from rendering
5. WHEN a user clicks on an agent sprite, THE UIOverlay SHALL display a stats panel with agent name, confidence, wins, losses, XP, and level
6. WHEN a user clicks outside an agent, THE UIOverlay SHALL hide the stats panel

---

### Requirement 9: Particle Effects

**User Story:** Como usuario del dashboard, quiero ver efectos visuales cuando los agentes celebran o entran en pánico, para que las emociones sean más expresivas y el dashboard más atractivo.

#### Acceptance Criteria

1. WHEN an agent enters CELEBRATING state, THE UIOverlay SHALL spawn 10 sparkle particles at the agent's position
2. WHEN an agent enters PANICKING state, THE UIOverlay SHALL spawn 10 explosion particles at the agent's position
3. THE ParticleEffect SHALL update particle positions and opacity based on deltaTime
4. WHEN a particle's lifetime expires, THE UIOverlay SHALL remove it from the active particles array
5. THE System SHALL use object pooling for particles to avoid memory allocation during gameplay
6. THE System SHALL limit the maximum number of active particles to 100

---

### Requirement 10: Performance Optimization

**User Story:** Como usuario del dashboard, quiero que el canvas se renderice a 60 FPS en desktop y 30-45 FPS en mobile, para que la experiencia sea fluida y responsive.

#### Acceptance Criteria

1. THE Canvas2DEngine SHALL achieve 60 FPS on desktop browsers (Chrome 60+, Firefox 55+, Safari 11+)
2. THE Canvas2DEngine SHALL achieve 30-45 FPS on mobile devices
3. THE LayerManager SHALL render static layers (floor, objects) only once to offscreen canvases
4. THE LayerManager SHALL render dynamic layers (agents, ui) every frame
5. WHEN FPS drops below 30, THE System SHALL reduce particle count and disable shadow effects
6. THE System SHALL use dirty rectangle tracking to minimize redraw areas

---

### Requirement 11: Responsive Design

**User Story:** Como usuario del dashboard, quiero que el canvas se adapte a diferentes tamaños de pantalla, para que pueda usar el dashboard en desktop, tablet, y mobile.

#### Acceptance Criteria

1. WHEN the browser window is resized, THE Canvas2DEngine SHALL calculate the optimal scale factor to fit the container
2. THE Canvas2DEngine SHALL apply CSS transform scale to the canvas element
3. THE Canvas2DEngine SHALL maintain the canvas aspect ratio (4:3) during scaling
4. THE Canvas2DEngine SHALL not scale the canvas beyond 1x (no upscaling)
5. WHEN a user clicks on the canvas, THE System SHALL convert click coordinates using the current scale factor
6. THE System SHALL detect mobile devices and apply mobile-specific optimizations

---

### Requirement 12: Error Handling

**User Story:** Como usuario del dashboard, quiero que el sistema maneje errores gracefully sin romper la experiencia, para que el dashboard siga funcionando incluso si hay problemas de red o datos.

#### Acceptance Criteria

1. IF journal.jsonl fetch fails, THE EventSystem SHALL log an error and retry after 30 seconds
2. IF journal.jsonl fetch fails, THE System SHALL display an error overlay message "Sin conexión con journal.jsonl"
3. IF a sprite sheet fails to load, THE SpriteSystem SHALL fallback to CSS box-shadow sprites
4. IF pathfinding fails to find a route, THE MovementSystem SHALL skip movement and transition the agent to the next state immediately
5. IF an invalid FSM transition is attempted, THE AgentStateMachine SHALL reject it and log a warning without crashing
6. THE System SHALL implement fetch timeout of 5 seconds for journal.jsonl requests

---

### Requirement 13: Integration with Existing Dashboard

**User Story:** Como usuario del dashboard, quiero que el canvas 2D reemplace el grid de agentes actual sin afectar el resto del dashboard, para que mantenga toda la funcionalidad existente.

#### Acceptance Criteria

1. THE System SHALL replace the #agent-grid HTML element with a canvas element
2. THE System SHALL maintain the existing header (#hdr) with BTC price, LND/Boltz status, and clock
3. THE System SHALL maintain the existing ticker tape (#ticker-tape) with market data scroll
4. THE System SHALL maintain the existing sidebar (#sidebar) with KPIs, kill-switch, and battle log
5. THE System SHALL maintain the existing director banner (#director) above the canvas
6. WHEN journal events occur, THE System SHALL update sidebar stats in real-time

---

### Requirement 14: Browser Compatibility

**User Story:** Como usuario del dashboard, quiero que el canvas funcione en navegadores modernos, para que pueda acceder al dashboard desde diferentes plataformas.

#### Acceptance Criteria

1. THE System SHALL support Chrome 60 or higher
2. THE System SHALL support Firefox 55 or higher
3. THE System SHALL support Safari 11 or higher
4. THE System SHALL support Edge 79 or higher
5. THE System SHALL use only standard HTML5 Canvas 2D APIs without vendor prefixes
6. THE System SHALL not require polyfills for modern browsers

---

### Requirement 15: Asset Management

**User Story:** Como desarrollador, quiero que el sistema cargue y gestione sprites y assets de forma eficiente, para que el dashboard tenga buen rendimiento y sea fácil de mantener.

#### Acceptance Criteria

1. THE SpriteSystem SHALL load sprite sheets asynchronously using Image API
2. THE SpriteSystem SHALL cache loaded sprite sheets in memory
3. THE SpriteSystem SHALL pre-render CSS box-shadow sprites to offscreen canvases for performance
4. THE System SHALL use the existing "Press Start 2P" font loaded via Google Fonts
5. THE System SHALL not require external dependencies beyond browser APIs
6. THE System SHALL organize sprite assets in an assets/sprites/ directory

---

### Requirement 16: Testing and Validation

**User Story:** Como desarrollador, quiero que el sistema tenga tests automatizados para componentes críticos, para que pueda validar que el pathfinding, FSM, y animaciones funcionan correctamente.

#### Acceptance Criteria

1. THE PathFinder SHALL have unit tests validating correct path calculation between walkable tiles
2. THE PathFinder SHALL have unit tests validating obstacle avoidance
3. THE AgentStateMachine SHALL have unit tests validating valid transitions are allowed
4. THE AgentStateMachine SHALL have unit tests validating invalid transitions are rejected
5. THE AnimationController SHALL have unit tests validating frame advancement with deltaTime
6. THE EventSystem SHALL have unit tests validating journal entry processing and event emission

---

### Requirement 17: Memory Management

**User Story:** Como usuario del dashboard, quiero que el sistema no tenga memory leaks, para que pueda dejar el dashboard abierto durante horas sin degradación de performance.

#### Acceptance Criteria

1. THE System SHALL use object pooling for particles to avoid repeated allocation/deallocation
2. THE System SHALL remove event listeners when the engine is destroyed
3. THE System SHALL cancel requestAnimationFrame when the game loop is stopped
4. THE System SHALL clear particle arrays when particles expire
5. THE System SHALL dispose of offscreen canvases when layers are destroyed
6. THE System SHALL not accumulate journal entries beyond the last 1000 entries

---

### Requirement 18: Visual Consistency

**User Story:** Como usuario del dashboard, quiero que el canvas 2D mantenga la estética VGA pixel-art del dashboard actual, para que la experiencia visual sea coherente.

#### Acceptance Criteria

1. THE System SHALL use the VGA 16-color palette defined in the existing dashboard CSS
2. THE System SHALL render sprites with pixel-perfect alignment (no anti-aliasing)
3. THE System SHALL use the "Press Start 2P" font for dialog bubbles and UI text
4. THE System SHALL apply the same CRT overlay effect used in the current dashboard
5. THE System SHALL use the same border and panel colors as the existing dashboard
6. THE System SHALL maintain the same color scheme for agent types (blue for tech, green for quant, etc.)

---

### Requirement 19: Accessibility

**User Story:** Como usuario con necesidades de accesibilidad, quiero que el canvas tenga alternativas textuales, para que pueda entender el estado del sistema sin depender solo de las animaciones.

#### Acceptance Criteria

1. THE Canvas element SHALL have an aria-label describing its purpose
2. THE System SHALL update the sidebar battle log with text descriptions of agent actions
3. WHEN an agent transitions to a new state, THE System SHALL log the transition to the battle log
4. WHEN a trade is executed, THE System SHALL update the sidebar with profit/loss information
5. THE System SHALL maintain keyboard navigation for the stats panel (ESC to close)
6. THE System SHALL provide text alternatives for all visual-only information

---

### Requirement 20: Development and Deployment

**User Story:** Como desarrollador, quiero que el sistema use vanilla JavaScript sin build process, para que sea fácil de desarrollar, debuggear, y deployar.

#### Acceptance Criteria

1. THE System SHALL use ES6 modules without requiring a bundler
2. THE System SHALL not require npm dependencies for core functionality
3. THE System SHALL work with a simple HTTP server (python -m http.server)
4. THE System SHALL organize code in logical modules under a js/ directory
5. THE System SHALL provide optional minification scripts for production deployment
6. THE System SHALL include source maps for debugging minified code
