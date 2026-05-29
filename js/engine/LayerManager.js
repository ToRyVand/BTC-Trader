/**
 * LayerManager - Manages rendering layers for optimization
 * Layers: floor (0), objects (1), agents (2), ui (3)
 */
export class LayerManager {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.layers = new Map();
    this.dirtyRects = [];
  }
  
  addLayer(name, zIndex, options = {}) {
    const { static: isStatic = false } = options;
    
    // Create offscreen canvas for this layer
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = this.canvas.width;
    layerCanvas.height = this.canvas.height;
    
    const ctx = layerCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // Pixel-perfect rendering
    
    const layer = {
      name,
      zIndex,
      canvas: layerCanvas,
      ctx,
      isStatic,
      dirty: true
    };
    
    this.layers.set(name, layer);
    console.log(`[LayerManager] Added layer "${name}" (z:${zIndex}, static:${isStatic})`);
    
    return layer;
  }
  
  getLayer(name) {
    return this.layers.get(name);
  }
  
  markDirty(layerName, x, y, width, height) {
    const layer = this.layers.get(layerName);
    if (layer) {
      layer.dirty = true;
    }
    
    if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
      this.dirtyRects.push({ x, y, width, height });
    }
  }
  
  clearLayer(layerName) {
    const layer = this.layers.get(layerName);
    if (layer && !layer.isStatic) {
      layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    }
  }
  
  renderAll(ctx) {
    // Get layers sorted by z-index
    const sortedLayers = Array.from(this.layers.values())
      .sort((a, b) => a.zIndex - b.zIndex);
    
    // Composite all layers to main canvas
    sortedLayers.forEach(layer => {
      ctx.drawImage(layer.canvas, 0, 0);
    });
    
    // Clear dirty rects for next frame
    this.dirtyRects = [];
  }
  
  destroy() {
    this.layers.clear();
    this.dirtyRects = [];
    console.log('[LayerManager] Destroyed');
  }
}
