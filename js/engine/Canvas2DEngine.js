/**
 * Canvas2DEngine - Main engine for 2D trading floor visualization
 * Manages game loop, rendering, and coordination of all subsystems
 */
export class Canvas2DEngine {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.lastFrameTime = 0;
    this.running = false;
    this.fps = 0;
    this.frameCount = 0;
    this.fpsUpdateTime = 0;
    this.elapsedTime = 0;
    this.animFrameId = null;
    
    // Subsystems (initialized in init())
    this.layerManager = null;
    this.spriteSystem = null;
    this.movementSystem = null;
    this.stateManager = null;
    this.eventSystem = null;
    this.uiOverlay = null;
    this.agentController = null;
    this.journalPoller = null;
    this.sceneRenderer = null;
    this.tileGrid = null;
    this.pathFinder = null;
    
    // Agents
    this.agents = [];
    
    // Scale for responsive design
    this.clickScale = 1;
    
    // Bound handlers for cleanup
    this._boundHandleResize = () => this.handleResize();
    this._boundHandleClick = (e) => this.handleClick(e);
  }
  
  async init() {
    // Disable image smoothing for pixel-perfect rendering
    this.ctx.imageSmoothingEnabled = false;

    // Set canvas dimensions - larger for isometric view with better centering
    this.canvas.width = 960;
    this.canvas.height = 720; // AUMENTADO de 640 a 720 para más espacio vertical
    
    console.log(`[Canvas2DEngine] Initialized ${this.canvas.width}x${this.canvas.height}px canvas`);
    
    // Initialize subsystems (will be added in subsequent tasks)
    // this.layerManager = new LayerManager(this.canvas, this.config);
    // this.spriteSystem = new SpriteSystem();
    // ... etc
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Handle initial resize
    this.handleResize();
  }
  
  start() {
    if (this.running) return;
    
    this.running = true;
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.lastFrameTime;
    this.frameCount = 0;
    
    console.log('[Canvas2DEngine] Starting game loop');
    this.gameLoop();
  }
  
  stop() {
    this.running = false;
    console.log('[Canvas2DEngine] Stopped game loop');
  }
  
  gameLoop() {
    if (!this.running) return;
    
    const currentTime = performance.now();
    this.deltaTime = (currentTime - this.lastFrameTime) / 1000; // seconds
    this.lastFrameTime = currentTime;
    
    // Update FPS counter
    this.frameCount++;
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }
    
    // Update
    this.update(this.deltaTime);
    
    // Render
    this.render();
    
    // Next frame
    requestAnimationFrame(() => this.gameLoop());
  }
  
  update(deltaTime) {
    this.elapsedTime += deltaTime;

    this.agents.forEach(agent => {
      if (agent.animation) {
        agent.animation.update(deltaTime);
      }
    });
  }
  
  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render layers (will be implemented with LayerManager)
    // this.layerManager?.renderAll(this.ctx);
    
    // Temporary: render FPS counter
    this.ctx.fillStyle = '#55ff55';
    this.ctx.font = '8px "Press Start 2P"';
    this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
  }
  
  handleResize() {
    const container = this.canvas.parentElement;
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate scale to fit container while maintaining aspect ratio
    const scaleX = containerWidth / this.canvas.width;
    const scaleY = containerHeight / this.canvas.height;
    const scale = Math.min(scaleX, scaleY, 1.5); // Permitir escalar hasta 1.5x para mejor visibilidad
    
    // Apply CSS transform for scaling
    this.canvas.style.transform = `scale(${scale})`;
    this.canvas.style.transformOrigin = 'top left';
    
    // Update click coordinate conversion
    this.clickScale = scale;
    
    console.log(`[Canvas2DEngine] Resized to scale ${scale.toFixed(2)}`);
  }
  
  setupEventListeners() {
    window.addEventListener('resize', this._boundHandleResize);
    this.canvas.addEventListener('click', this._boundHandleClick);
  }
  
  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / this.clickScale;
    const y = (e.clientY - rect.top) / this.clickScale;
    
    console.log(`[Canvas2DEngine] Click at (${Math.floor(x)}, ${Math.floor(y)})`);
    
    // Check if clicked on an agent (will be implemented later)
    // const clickedAgent = this.getAgentAtPosition(x, y);
    // if (clickedAgent) {
    //   this.uiOverlay?.showStatsPanel(clickedAgent, clickedAgent.stats);
    // }
  }
  
  destroy() {
    console.log('[Canvas2DEngine] Destroying all subsystems...');
    
    this.stop();
    
    window.removeEventListener('resize', this._boundHandleResize);
    this.canvas.removeEventListener('click', this._boundHandleClick);
    
    if (this.journalPoller) this.journalPoller.stop();
    if (this.eventSystem) this.eventSystem.clear();
    if (this.uiOverlay) this.uiOverlay.destroy();
    if (this.agentController) this.agentController.destroy();
    if (this.sceneRenderer) this.sceneRenderer.destroy?.();
    if (this.layerManager) this.layerManager.destroy?.();
    if (this.spriteSystem) this.spriteSystem.destroy?.();
    
    this.agents.forEach(agent => {
      if (agent.stateMachine) agent.stateMachine.destroy();
    });
    this.agents = [];
    
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    this.running = false;
    console.log('[Canvas2DEngine] Destroyed');
  }
}
