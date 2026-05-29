/**
 * Main entry point for 2D Trading Floor Dashboard
 */
import { Canvas2DEngine } from './engine/Canvas2DEngine.js';
import { LayerManager } from './engine/LayerManager.js';
import { SceneRenderer } from './scene/SceneRenderer.js';
import { SpriteSystem } from './sprites/SpriteSystem.js';
import { AgentController } from './agents/AgentController.js';
import { SimpleSpriteGenerator } from './sprites/SimpleSpriteGenerator.js';
import { StateManager } from './state/StateManager.js';
import { EventSystem } from './events/EventSystem.js';
import { JournalPoller } from './events/JournalPoller.js';
import { UIOverlay } from './ui/UIOverlay.js';
import { MovementSystem } from './movement/MovementSystem.js';
import { PathFinder } from './movement/PathFinder.js';
import { TileGrid } from './scene/TileGrid.js';
import { Cat } from './pet/Cat.js';

// Configuration - Isometric projection
const config = {
  gridWidth: 16,
  gridHeight: 12,
  tileSize: 64,         // 48→64: fills 896px of the 960px canvas width
  targetFPS: 60,
  pixelPerfect: true,
  iso: true
};

// Initialize when DOM is ready
const initDashboard = async () => {
    console.log('[Main] Initializing 2D Trading Floor Dashboard...');
  // Get or create canvas element
  let canvas = document.getElementById('trading-floor-canvas');
  
  if (!canvas) {
    console.log('[Main] Canvas not found, creating...');
    // Create canvas and replace #agent-grid
    canvas = document.createElement('canvas');
    canvas.id = 'trading-floor-canvas';
    canvas.style.imageRendering = 'pixelated';
    canvas.style.imageRendering = 'crisp-edges';
    canvas.style.border = '2px solid #888';
    canvas.style.background = '#000';
    canvas.style.display = 'block';
    
    // Find room container
    const room = document.getElementById('room');
    if (room) {
      // Remove old agent-grid if exists
      const oldGrid = document.getElementById('agent-grid');
      if (oldGrid) {
        oldGrid.remove();
      }
      
      // Add canvas to room
      room.appendChild(canvas);
    } else {
      console.error('[Main] Could not find #room container');
      return;
    }
  } else {
    console.log('[Main] Canvas found in DOM');
  }
  
  // Create engine
  const engine = new Canvas2DEngine(canvas, config);
  
  // Initialize engine
  await engine.init();
  
  // Initialize LayerManager
  engine.layerManager = new LayerManager(canvas, config);
  engine.layerManager.addLayer('floor', 0, { static: true });
  engine.layerManager.addLayer('objects', 1, { static: true });
  engine.layerManager.addLayer('agents', 2, { static: false });
  engine.layerManager.addLayer('ui', 3, { static: false });
  
  // Initialize SpriteSystem
  engine.spriteSystem = new SpriteSystem();
  
  // Generate simple sprites as fallback
  const simpleSprites = SimpleSpriteGenerator.generateAllAgentSprites();
  Object.entries(simpleSprites).forEach(([agentId, spriteCanvas]) => {
    engine.spriteSystem.spriteSheets.set(`${agentId}-sprite`, {
      image: spriteCanvas,
      config: { frameWidth: 64, frameHeight: 64 },
      isFallback: true
    });
  });
  
  // Initialize AgentController
  engine.agentController = new AgentController(config, engine.spriteSystem);
  engine.agents = engine.agentController.createAgents();
  
  // Initialize StateManager
  engine.stateManager = new StateManager();
  
  // Initialize EventSystem
  engine.eventSystem = new EventSystem();
  
  // Initialize JournalPoller
  engine.journalPoller = new JournalPoller(engine.eventSystem, {
    journalPath: '/journal.jsonl',
    pollInterval: 8000, // 8 seconds
    fetchTimeout: 5000, // 5 seconds
    retryDelay: 30000 // 30 seconds on error
  });
  
  // Initialize UIOverlay
  engine.uiOverlay = new UIOverlay();
  
  // Initialize MovementSystem + PathFinder + TileGrid for agent movement
  engine.tileGrid = new TileGrid(config.gridWidth, config.gridHeight, config.tileSize);
  engine.pathFinder = new PathFinder(engine.tileGrid);
  engine.movementSystem = new MovementSystem(config.tileSize);

  // Initialize SHADO the black cat mascot (setTile deferred until sceneRenderer exists)
  engine.shado = new Cat({ tileSize: config.tileSize });
  
  // Wire pathfinding failure handler — transitions agent to IDLE on failure
  engine.movementSystem.onPathFail = (agent, reason) => {
    console.warn(`[Main] Pathfinding failed for ${agent.id} (${reason}) — transitioning to IDLE`);
    engine.stateManager.transitionAgent(agent.id, 'IDLE');
  };
  
  // Setup FSM for each agent with animation callbacks
  engine.agents.forEach(agent => {
    // Create state machine for agent
    const fsm = engine.stateManager.initAgentStateMachine(agent.id, 'IDLE');
    agent.stateMachine = fsm;
    
    // Configure state callbacks for animations
    
    // IDLE state - play idle animation
    fsm.onEnter('IDLE', () => {
      console.log(`[FSM] ${agent.id} entered IDLE state`);
      if (agent.animation) {
        agent.animation.play(`idle_${agent.direction}`, true);
      }
    });
    
    // WALKING_TO_STATION - play walk animation
    fsm.onEnter('WALKING_TO_STATION', () => {
      console.log(`[FSM] ${agent.id} entered WALKING_TO_STATION state`);
      if (agent.animation) {
        agent.animation.play(`walk_${agent.direction}`, true);
      }
    });
    
    // ANALYZING - play think animation
    fsm.onEnter('ANALYZING', () => {
      console.log(`[FSM] ${agent.id} entered ANALYZING state`);
      if (agent.animation) {
        agent.animation.play('think', true);
      }
      // Show dialog bubble
      engine.uiOverlay.showDialog('Analizando...', agent, 2000);
    });
    
    // WALKING_TO_MEETING - play walk animation
    fsm.onEnter('WALKING_TO_MEETING', () => {
      console.log(`[FSM] ${agent.id} entered WALKING_TO_MEETING state`);
      if (agent.animation) {
        agent.animation.play(`walk_${agent.direction}`, true);
      }
    });
    
    // SIGNALING - play signal animation based on signal type
    fsm.onEnter('SIGNALING', () => {
      console.log(`[FSM] ${agent.id} entered SIGNALING state`);
      if (agent.animation && agent.signal) {
        const signalType = agent.signal.signal.toLowerCase(); // 'buy', 'sell', 'hold'
        agent.animation.play(`signal_${signalType}`, false);
      }
      // Show signal bubble
      if (agent.signal) {
        const signalText = agent.signal.signal.toUpperCase();
        engine.uiOverlay.showDialog(signalText, agent, 3000);
      }
    });
    
    // WAITING_DIRECTOR - play idle animation
    fsm.onEnter('WAITING_DIRECTOR', () => {
      console.log(`[FSM] ${agent.id} entered WAITING_DIRECTOR state`);
      if (agent.animation) {
        agent.animation.play(`idle_${agent.direction}`, true);
      }
    });
    
    // CELEBRATING - play celebrate animation
    fsm.onEnter('CELEBRATING', () => {
      console.log(`[FSM] ${agent.id} entered CELEBRATING state`);
      if (agent.animation) {
        agent.animation.play('celebrate', false);
      }
      // Spawn sparkle particles
      const centerX = agent.pixelPos.x + 32;
      const centerY = agent.pixelPos.y + 32;
      engine.uiOverlay.spawnParticles(centerX, centerY, 'sparkle', 15);
      
      // Show celebration bubble
      engine.uiOverlay.showDialog('¡Éxito!', agent, 2000);
    });
    
    // PANICKING - play panic animation
    fsm.onEnter('PANICKING', () => {
      console.log(`[FSM] ${agent.id} entered PANICKING state`);
      if (agent.animation) {
        agent.animation.play('panic', false);
      }
      // Spawn explosion particles
      const centerX = agent.pixelPos.x + 32;
      const centerY = agent.pixelPos.y + 32;
      engine.uiOverlay.spawnParticles(centerX, centerY, 'explosion', 20);
      
      // Show panic bubble
      engine.uiOverlay.showDialog('¡Oh no!', agent, 2000);
    });
  });
  
  // Initialize SceneRenderer
  const sceneRenderer = new SceneRenderer(config);

  // Store scene renderer for later use in render
  engine.sceneRenderer = sceneRenderer;
  
  // Set SHADO initial position now that sceneRenderer exists
  if (engine.shado) {
    engine.shado.setTile(8, 9, sceneRenderer.toIso.bind(sceneRenderer));
  }
  
  // Override engine render method with our complete isometric scene
  engine.render = function() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const time = this.elapsedTime;

    // 1. Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);

    // 2. Floor tiles
    if (this.sceneRenderer) {
      this.sceneRenderer.renderFloorTiles(ctx);
    }

    // 3. Walls (with time for left-wall BTC screen animation)
    if (this.sceneRenderer) {
      this.sceneRenderer.renderWalls(ctx, time);
    }

    // 4. Furniture + agents z-sorted
    if (this.sceneRenderer) {
      const renderList = this.sceneRenderer.getFurnitureList();
      console.log('[DEBUG] sceneRenderer OK, items:', renderList.length);

      if (this.agents) {
        this.agents.forEach(agent => {
          renderList.push({
            type: 'agent',
            x: agent.tile.x,
            y: agent.tile.y,
            agent: agent
          });
        });
      }

      // SHADO — render at current tile position for z-sorting
      if (this.shado) {
        this.shado.update(this.deltaTime / 1000, config.gridWidth, config.gridHeight, this.sceneRenderer.toIso.bind(this.sceneRenderer));
        renderList.push({
          type: 'shado',
          x: this.shado.tile.x,
          y: this.shado.tile.y,
          cat: this.shado
        });
      }

      renderList.sort((a, b) => (a.y + a.x) - (b.y + b.x));

      renderList.forEach(item => {
        if (item.type === 'agent') {
          this.renderAgent(ctx, item.agent, time);
        } else if (item.type === 'shado') {
          item.cat.render(ctx, time);
        } else {
          this.sceneRenderer.renderFurnitureItem(ctx, item, time);
        }
      });
    }

    // 5. Ambient effects (particles, vignette)
    if (this.sceneRenderer) {
      this.sceneRenderer.renderAmbientEffects(ctx, time);
    }

    // 6. FPS counter
    ctx.fillStyle = 'rgba(85,255,85,0.6)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`FPS: ${this.fps}`, 10, 18);
  };
  
  // Add renderAgent method to engine - Pixel art isometric characters
  engine.renderAgent = function(ctx, agent, time = 0) {
    let pos;
    if (this.sceneRenderer) {
      pos = this.sceneRenderer.toIso(agent.tile.x, agent.tile.y);
    } else {
      pos = { x: agent.pixelPos.x, y: agent.pixelPos.y };
    }

    const agentIndex = this.agents ? this.agents.indexOf(agent) : 0;
    const fsmState = agent.stateMachine?.getCurrentState() || 'IDLE';

    // Faster/bigger bob when walking; oscillate when analyzing
    const bobAmp  = (fsmState === 'WALKING_TO_STATION' || fsmState === 'WALKING_TO_MEETING') ? 4 : 2;
    const bobFreq = (fsmState === 'WALKING_TO_STATION' || fsmState === 'WALKING_TO_MEETING') ? 4.0
                  : fsmState === 'PANICKING' ? 6.0 : 1.6;
    const bob = Math.round(Math.sin(time * bobFreq + agentIndex * 1.2) * bobAmp);

    const px = Math.round(pos.x);
    const py = Math.round(pos.y) + bob;
    const body = agent.color || '#5555ff';

    // Shirt tint + state icon based on FSM
    const STATE_STYLE = {
      IDLE:                { shirt: body,      icon: null },
      WALKING_TO_STATION:  { shirt: '#6688ff', icon: '»'  },
      ANALYZING:           { shirt: '#ffaa00', icon: '?'  },
      WALKING_TO_MEETING:  { shirt: '#6688ff', icon: '»'  },
      SIGNALING: {
        shirt: agent.signal?.signal === 'BUY'  ? '#33cc55'
             : agent.signal?.signal === 'SELL' ? '#cc3333' : '#cccc33',
        icon:  agent.signal?.signal === 'BUY'  ? '▲'
             : agent.signal?.signal === 'SELL' ? '▼' : '—'
      },
      WAITING_DIRECTOR:    { shirt: '#8888cc', icon: '…'  },
      CELEBRATING:         { shirt: '#ffff33', icon: '★'  },
      PANICKING:           { shirt: '#ff3333', icon: '!!'  },
    };
    const ss = STATE_STYLE[fsmState] || STATE_STYLE.IDLE;

    // Per-agent style: hair color + pants color
    const STYLES = {
      tech:     { hair: '#2a1200', pants: '#1a3370' },
      quant:    { hair: '#cc9900', pants: '#1a4422' },
      fund:     { hair: '#888878', pants: '#443322' },
      sent:     { hair: '#991100', pants: '#440033' },
      risk:     { hair: '#111111', pants: '#111122' },
      director: { hair: '#aa00aa', pants: '#550055' },
    };
    const s = STYLES[agent.id] || { hair: '#444444', pants: '#333333' };

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(px, py + 1, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- SHOES ---
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(px - 9, py - 3, 7, 3);
    ctx.fillRect(px + 2,  py - 3, 7, 3);

    // --- PANTS ---
    ctx.fillStyle = s.pants;
    ctx.fillRect(px - 7, py - 14, 5, 11);
    ctx.fillRect(px + 2,  py - 14, 5, 11);
    // pants crease highlight
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(px - 6, py - 14, 2, 10);
    ctx.fillRect(px + 3,  py - 14, 2, 10);

    // --- BELT ---
    ctx.fillStyle = '#111111';
    ctx.fillRect(px - 8, py - 16, 16, 2);
    ctx.fillStyle = '#998844'; // buckle
    ctx.fillRect(px - 2, py - 16, 4, 2);

    // --- SHIRT BODY ---
    ctx.fillStyle = ss.shirt;
    ctx.fillRect(px - 8, py - 30, 16, 14);
    // shirt highlight (left)
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(px - 7, py - 30, 5, 13);
    // collar
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(px - 2, py - 30, 4, 3);

    // --- ARMS ---
    ctx.fillStyle = ss.shirt;
    ctx.fillRect(px - 12, py - 29, 4, 10);
    ctx.fillRect(px + 8,  py - 29, 4, 10);

    // --- HANDS ---
    ctx.fillStyle = '#e8a070';
    ctx.fillRect(px - 12, py - 21, 4, 5);
    ctx.fillRect(px + 8,  py - 21, 4, 5);

    // --- NECK ---
    ctx.fillStyle = '#e8a070';
    ctx.fillRect(px - 2, py - 33, 4, 3);

    // --- HEAD ---
    ctx.fillStyle = '#e8a070';
    ctx.fillRect(px - 7, py - 47, 14, 14);
    // head side shadow
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    ctx.fillRect(px + 4, py - 47, 3, 14);

    // --- HAIR ---
    ctx.fillStyle = s.hair;
    ctx.fillRect(px - 8, py - 52, 16, 6);   // top
    ctx.fillRect(px - 8, py - 47, 2, 5);    // left sideburn
    ctx.fillRect(px + 6, py - 47, 2, 5);    // right sideburn

    // --- EYES ---
    ctx.fillStyle = '#111111';
    ctx.fillRect(px - 4, py - 42, 3, 3);
    ctx.fillRect(px + 1,  py - 42, 3, 3);
    // eye whites
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 3, py - 42, 1, 2);
    ctx.fillRect(px + 2,  py - 42, 1, 2);

    // --- MOUTH ---
    ctx.fillStyle = '#a04030';
    ctx.fillRect(px - 2, py - 36, 4, 1);

    // --- NAME TAG ---
    const nameW = agent.name.length * 5 + 8;
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(px - nameW / 2, py - 63, nameW, 11);
    ctx.strokeStyle = ss.shirt;
    ctx.lineWidth = 1;
    ctx.strokeRect(px - nameW / 2, py - 63, nameW, 11);
    ctx.fillStyle = '#ffffff';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(agent.name, px, py - 55);

    // --- STATE ICON ---
    if (ss.icon) {
      ctx.font = '8px monospace';
      ctx.fillStyle = ss.shirt;
      ctx.textAlign = 'center';
      ctx.fillText(ss.icon, px, py - 67);
    }

    // --- DIRECTOR SPECIAL: glasses + lucky hat ---
    if (agent.id === 'director') {
      // Gold-rimmed glasses
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(px - 7, py - 44, 5, 5);  // left frame
      ctx.fillRect(px + 2,  py - 44, 5, 5);  // right frame
      ctx.fillRect(px - 2,  py - 42, 4, 1);  // bridge
      // Lenses (dark with magenta glow)
      ctx.fillStyle = 'rgba(170,0,170,0.6)';
      ctx.fillRect(px - 6, py - 43, 3, 3);   // left lens
      ctx.fillRect(px + 3, py - 43, 3, 3);   // right lens
      // Lens shine
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(px - 5, py - 43, 1, 1);
      ctx.fillRect(px + 4, py - 43, 1, 1);

      // Lucky top hat
      const hatY = py - 57;
      // Hat brim (wide)
      ctx.fillStyle = '#aa00aa';
      ctx.fillRect(px - 11, hatY + 8, 22, 3);
      // Gold band around brim
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(px - 10, hatY + 8, 20, 1);
      // Hat crown (tall)
      ctx.fillStyle = '#aa00aa';
      ctx.fillRect(px - 7, hatY, 14, 8);
      // Crown top
      ctx.fillStyle = '#880088';
      ctx.fillRect(px - 7, hatY, 14, 2);
      // Lucky star on hat
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(px - 1, hatY + 3, 2, 2);
      ctx.fillRect(px - 2, hatY + 2, 4, 1);
      ctx.fillRect(px - 2, hatY + 4, 4, 1);
      ctx.fillRect(px, hatY + 5, 1, 2);
    }
  };
  
  // Update click handler to show agent info
  const originalHandleClick = engine.handleClick.bind(engine);
  engine.handleClick = function(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / this.clickScale;
    const y = (e.clientY - rect.top) / this.clickScale;
    
    // Check if UI overlay handled the click
    if (this.uiOverlay && this.uiOverlay.handleClick(x, y, this.canvas.width, this.canvas.height)) {
      return; // Click was handled by UI
    }
    
    // Check if clicked on an agent
    const clickedAgent = this.agentController.getAgentAtPosition(x, y);
    if (clickedAgent) {
      console.log(`[Main] Clicked on agent: ${clickedAgent.name}`, clickedAgent);
      // Show stats panel
      this.uiOverlay.toggleStats(clickedAgent);
    } else {
      // Clicked on empty space - hide stats panel
      this.uiOverlay.hideStats();
    }
  };

  // ── Keyboard navigation for accessibility ──
  let focusedAgentIndex = 0;

  const canvasEl = engine.canvas;
  canvasEl.addEventListener('keydown', (e) => {
    const agents = engine.agents;
    if (!agents || agents.length === 0) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        focusedAgentIndex = (focusedAgentIndex + 1) % agents.length;
        announceAgent(agents[focusedAgentIndex]);
        break;
        
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        focusedAgentIndex = (focusedAgentIndex - 1 + agents.length) % agents.length;
        announceAgent(agents[focusedAgentIndex]);
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        const focusedAgent = agents[focusedAgentIndex];
        if (focusedAgent) {
          engine.uiOverlay.toggleStats(focusedAgent);
          announceToScreenReader(`Estadísticas de ${focusedAgent.name} ${engine.uiOverlay.statsPanel.isVisible ? 'mostradas' : 'ocultas'}`);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        engine.uiOverlay.hideStats();
        announceToScreenReader('Panel de estadísticas cerrado');
        break;
        
      case 'Home':
        e.preventDefault();
        focusedAgentIndex = 0;
        announceAgent(agents[0]);
        break;
        
      case 'End':
        e.preventDefault();
        focusedAgentIndex = agents.length - 1;
        announceAgent(agents[agents.length - 1]);
        break;
    }
  });

  function announceAgent(agent) {
    const state = agent.stateMachine?.getCurrentState() || 'IDLE';
    const signal = agent.signal?.signal || 'N/A';
    const message = `${agent.name}, ${agent.type}. Estado: ${state}. Señal: ${signal}. Presiona Enter para estadísticas.`;
    announceToScreenReader(message);
    console.log(`[A11Y] Focused agent: ${message}`);
  }

  function announceToScreenReader(message) {
    const announcer = document.getElementById('a11y-announcer');
    if (announcer) {
      announcer.textContent = '';
      setTimeout(() => { announcer.textContent = message; }, 100);
    }
  }

  // Expose a11y announce function globally for use by event listeners
  window.announceToScreenReader = announceToScreenReader;
  
  // Start engine
  engine.start();
  
  console.log('[Main] 2D Trading Floor Dashboard initialized successfully!');
  console.log(`[Main] Canvas: ${canvas.width}x${canvas.height}px`);
  console.log(`[Main] Agents: ${engine.agents.length}`);
  
  // Expose engine globally for debugging
  window.tradingFloorEngine = engine;
  
  // Add debug functions for FSM testing
  window.testFSM = {
    // Test valid transition
    testValidTransition: () => {
      console.log('\n=== Testing Valid Transition ===');
      const agent = engine.agents[0];
      console.log(`Current state: ${agent.stateMachine.getCurrentState()}`);
      const success = engine.stateManager.transitionAgent(agent.id, 'WALKING_TO_STATION');
      console.log(`Transition to WALKING_TO_STATION: ${success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`New state: ${agent.stateMachine.getCurrentState()}`);
    },
    
    // Test invalid transition
    testInvalidTransition: () => {
      console.log('\n=== Testing Invalid Transition ===');
      const agent = engine.agents[0];
      console.log(`Current state: ${agent.stateMachine.getCurrentState()}`);
      const success = engine.stateManager.transitionAgent(agent.id, 'CELEBRATING');
      console.log(`Transition to CELEBRATING: ${success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`State unchanged: ${agent.stateMachine.getCurrentState()}`);
    },
    
    // Test full cycle
    testFullCycle: () => {
      console.log('\n=== Testing Full State Cycle ===');
      const agent = engine.agents[0];
      const states = ['WALKING_TO_STATION', 'ANALYZING', 'WALKING_TO_MEETING', 'SIGNALING', 'WAITING_DIRECTOR', 'CELEBRATING', 'IDLE'];
      
      states.forEach((state, i) => {
        setTimeout(() => {
          console.log(`\nStep ${i + 1}: Transitioning to ${state}`);
          const success = engine.stateManager.transitionAgent(agent.id, state);
          console.log(`Result: ${success ? 'SUCCESS' : 'FAILED'}`);
          console.log(`Current state: ${agent.stateMachine.getCurrentState()}`);
        }, i * 1000);
      });
    },
    
    // Get all agent states
    getStates: () => {
      console.log('\n=== Current Agent States ===');
      const states = engine.stateManager.getAgentStates();
      Object.entries(states).forEach(([agentId, state]) => {
        console.log(`${agentId}: ${state}`);
      });
      return states;
    },
    
    // Transition all agents
    transitionAll: (state) => {
      console.log(`\n=== Transitioning All Agents to ${state} ===`);
      const results = engine.stateManager.transitionAllAgents(state);
      Object.entries(results).forEach(([agentId, success]) => {
        console.log(`${agentId}: ${success ? 'SUCCESS' : 'FAILED'}`);
      });
      return results;
    }
  };
  
  console.log('\n=== FSM Debug Functions Available ===');
  console.log('window.testFSM.testValidTransition() - Test valid state transition');
  console.log('window.testFSM.testInvalidTransition() - Test invalid state transition');
  console.log('window.testFSM.testFullCycle() - Test full state cycle (7 seconds)');
  console.log('window.testFSM.getStates() - Get current states of all agents');
  console.log('window.testFSM.transitionAll(state) - Transition all agents to a state');
  
  // Setup event listeners for journal events
  setupEventListeners(engine);

  // Start journal polling
  engine.journalPoller.start();
  console.log('[Main] Journal polling started');

  // ── Debug helpers ── fire events manually without running the real bot
  window.testEvents = {
    buy: () => engine.eventSystem.emit('cycle:start', {
      timestamp: new Date().toISOString(),
      signals: { tech: 'BUY', quant: 'BUY', fund: 'BUY', sent: 'BUY', risk: 'HOLD' },
      btcPrice: 98000,
      decision: { accion: 'COMPRAR_BTC' },
      claudeDecision: { accion: 'COMPRAR_BTC', razon: 'Señal alcista fuerte', confianza: 8 }
    }),
    sell: () => engine.eventSystem.emit('cycle:start', {
      timestamp: new Date().toISOString(),
      signals: { tech: 'SELL', quant: 'SELL', fund: 'HOLD', sent: 'SELL', risk: 'SELL' },
      btcPrice: 94000,
      decision: { accion: 'VENDER_BTC' },
      claudeDecision: { accion: 'VENDER_BTC', razon: 'Divergencia bajista detectada', confianza: 7 }
    }),
    hold: () => engine.eventSystem.emit('cycle:start', {
      timestamp: new Date().toISOString(),
      signals: { tech: 'HOLD', quant: 'HOLD', fund: 'HOLD', sent: 'BUY', risk: 'HOLD' },
      btcPrice: 96500,
      decision: { accion: 'HOLD' },
      claudeDecision: { accion: 'HOLD', razon: 'Mercado lateral, sin señal clara', confianza: 5 }
    }),
    verdict: (decision = 'COMPRAR_BTC') => engine.eventSystem.emit('director:verdict', {
      timestamp: new Date().toISOString(),
      decision,
      reasoning: 'Decisión manual de test',
      confidence: 7
    }),
    trade: (profit = 15.5) => engine.eventSystem.emit('trade:executed', {
      timestamp: new Date().toISOString(),
      action: profit > 0 ? 'COMPRAR_BTC' : 'VENDER_BTC',
      profit,
      amount: 500000,
      price: 97000
    }),
    journalError: () => engine.eventSystem.emit('journal:connection:lost', {
      error: 'Test error: journal no disponible',
      errorType: 'TestError',
      timestamp: new Date().toISOString()
    }),
    journalRecover: () => engine.eventSystem.emit('journal:connection:restored', {
      afterErrors: 3,
      timestamp: new Date().toISOString()
    })
  };
  console.log('[Main] testEvents available: window.testEvents.buy() / .sell() / .hold() / .verdict() / .trade(profit) / .journalError() / .journalRecover()');

  // ── Destroy / cleanup ──
  window.destroyDashboard = () => {
    console.log('[Main] Destroying dashboard...');
    engine.destroy();
    console.log('[Main] Dashboard destroyed. Refresh to restart.');
  };
  console.log('[Main] window.destroyDashboard() — cleanup all resources');
};

/**
 * Setup event listeners for journal events
 */
function setupEventListeners(engine) {
  console.log('[Main] Setting up event listeners...');
  
  // ── Journal connection error handling ──
  engine.eventSystem.on('journal:connection:lost', (data) => {
    console.warn('[Main] Journal connection lost:', data.error);
    showCanvasError(data.error, data.errorType);
    announceToScreenReader('Error: Sin conexión con el journal. Reintentando...');
    // Keep rendering scene in IDLE state — no FSM changes needed
  });
  
  engine.eventSystem.on('journal:connection:restored', (data) => {
    console.log('[Main] Journal connection restored after', data.afterErrors, 'errors');
    hideCanvasError();
    announceToScreenReader('Conexión con el journal restaurada');
  });
  
  // CYCLE event - agents start analyzing
  engine.eventSystem.on('cycle:start', (data) => {
    console.log('[Main] CYCLE event received:', data);
    
    // Announce to screen readers
    const accion = data.claudeDecision?.accion || 'ANALIZANDO';
    announceToScreenReader(`Nuevo ciclo de trading iniciado. Analizando mercado. Decisión: ${accion}`);
    
    // Update director panel with Claude's decision
    const dirSignal = document.getElementById('dir-signal');
    const dirReason = document.getElementById('dir-reason-text');

    if (dirSignal && dirReason && data.claudeDecision) {
      const accion = data.claudeDecision.accion || 'ESPERANDO';
      dirSignal.textContent = accion;

      const actionMap = {
        'COMPRAR_BTC': 'buy',
        'VENDER_BTC': 'sell',
        'HOLD': 'hold',
        'ESPERAR': 'wait'
      };
      dirSignal.className = actionMap[accion] || 'wait';
      dirReason.textContent = data.claudeDecision.razon || 'Analizando...';
    }
    
    // Transition all agents to WALKING_TO_STATION
    engine.agents.forEach(agent => {
      engine.stateManager.transitionAgent(agent.id, 'WALKING_TO_STATION');
    });
    
    // t=2s: WALKING_TO_STATION → ANALYZING
    setTimeout(() => {
      engine.agents.forEach(agent => {
        engine.stateManager.transitionAgent(agent.id, 'ANALYZING');
      });
    }, 2000);

    // t=3.5s: ANALYZING → WALKING_TO_MEETING  (required intermediate step)
    setTimeout(() => {
      engine.agents.forEach(agent => {
        engine.stateManager.transitionAgent(agent.id, 'WALKING_TO_MEETING');
      });
    }, 3500);

    // t=5s: WALKING_TO_MEETING → SIGNALING
    setTimeout(() => {
      // Map canvas agent IDs to journal signal keys
      const SIGNAL_MAP = {
        tech: 'trader-technical',
        quant: 'trader-quant',
        fund: 'trader-fundamental',
        sent: 'trader-sentiment',
        risk: 'trader-risk',
        director: 'claude-brain',
      };

      engine.agents.forEach(agent => {
        const journalKey = SIGNAL_MAP[agent.id] || agent.id;
        const signal = data.signals?.[journalKey] || data.signals?.[agent.id] || 'HOLD';
        agent.signal = { signal, confidence: 0.5 };
        engine.stateManager.transitionAgent(agent.id, 'SIGNALING');
      });
    }, 5000);

    // t=7s: SIGNALING → WAITING_DIRECTOR
    setTimeout(() => {
      engine.agents.forEach(agent => {
        engine.stateManager.transitionAgent(agent.id, 'WAITING_DIRECTOR');
      });
    }, 7000);
    
    // After 9 seconds: celebrate on trade action, panic on explicit loss, else idle
    setTimeout(() => {
      const accion = data.claudeDecision?.accion || data.decision?.accion || 'HOLD';
      const isLoss  = data.claudeDecision?.perdida === true;
      const isTrade = accion === 'COMPRAR_BTC' || accion === 'VENDER_BTC';

      const endState = isTrade ? (isLoss ? 'PANICKING' : 'CELEBRATING') : 'IDLE';

      engine.agents.forEach(agent => {
        engine.stateManager.transitionAgent(agent.id, endState);
      });

      if (endState !== 'IDLE') {
        setTimeout(() => {
          engine.agents.forEach(agent => {
            engine.stateManager.transitionAgent(agent.id, 'IDLE');
          });
        }, 3000);
      }
    }, 9000);
  });
  
  // DECISION event - director makes verdict
  engine.eventSystem.on('director:verdict', (data) => {
    console.log('[Main] DECISION event received:', data);

    // Announce to screen readers
    announceToScreenReader(`Decisión del Director: ${data.decision}. ${data.reasoning || ''}`);

    const dirSignal = document.getElementById('dir-signal');
    const dirReason = document.getElementById('dir-reason-text');

    if (dirSignal && dirReason) {
      const actionMap = { 'COMPRAR_BTC': 'buy', 'VENDER_BTC': 'sell', 'HOLD': 'hold', 'ESPERAR': 'wait' };
      dirSignal.textContent = data.decision;
      dirSignal.className = actionMap[data.decision] || data.decision.toLowerCase();
      dirReason.textContent = data.reasoning || 'Decisión tomada';
    }
  });
  
  // EXECUTION event - trade executed
  // Note: FSM animations are already handled by the cycle:start timer chain.
  // This handler only updates HTML status elements with trade result details.
  engine.eventSystem.on('trade:executed', (data) => {
    console.log('[Main] EXECUTION event received:', data);

    // Announce to screen readers
    const profit = typeof data.profit === 'number' ? data.profit.toFixed(2) : '?';
    const sign = data.profit > 0 ? '+' : '';
    announceToScreenReader(`Trade ejecutado. P&L: ${sign}${profit} USDT`);

    const dirReason = document.getElementById('dir-reason-text');
    if (dirReason) {
      const profit = typeof data.profit === 'number' ? data.profit.toFixed(2) : '?';
      const sign   = data.profit > 0 ? '+' : '';
      dirReason.textContent = `Trade ejecutado — P&L: ${sign}${profit} USDT`;
    }
  });
  
  console.log('[Main] Event listeners configured');
}

/**
 * Show error overlay on canvas
 */
function showCanvasError(message, type) {
  const overlay = document.getElementById('error-overlay');
  const detail = document.getElementById('err-detail');
  const retry = document.getElementById('err-retry');
  const status = document.getElementById('status');
  
  if (overlay) overlay.classList.add('visible');
  if (detail) detail.textContent = message || 'Error desconocido';
  if (retry) retry.textContent = 'Reintentando en 30s...';
  if (status) {
    status.textContent = '⚠ Sin conexión con journal.jsonl — Canvas en IDLE';
    status.className = 'status-bar err';
  }
  
  // Update journal LED in header
  const dotJrn = document.getElementById('dot-jrn');
  if (dotJrn) dotJrn.className = 'led r';
}

/**
 * Hide error overlay on canvas
 */
function hideCanvasError() {
  const overlay = document.getElementById('error-overlay');
  const status = document.getElementById('status');
  const dotJrn = document.getElementById('dot-jrn');
  
  if (overlay) overlay.classList.remove('visible');
  if (status) {
    status.textContent = '✓ V7 ACTIVO · Canvas 960x640 + 6 personajes RPG + SHADO 🐈‍⬛ · Journal poll cada 8s';
    status.className = 'status-bar ok';
  }
  if (dotJrn) dotJrn.className = 'led g';
}

// Run immediately if DOM is already loaded, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
