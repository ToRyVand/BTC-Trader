/**
 * EventSystem - Pub/Sub event bus for dashboard communication
 * Allows components to emit and listen to events without tight coupling
 */
export class EventSystem {
  constructor() {
    this.listeners = new Map(); // eventName -> Set of callback functions
    console.log('[EventSystem] Initialized');
  }
  
  /**
   * Register a listener for an event
   * @param {string} eventName - Name of the event to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    
    this.listeners.get(eventName).add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventName);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(eventName);
        }
      }
    };
  }
  
  /**
   * Emit an event with optional data
   * @param {string} eventName - Name of the event to emit
   * @param {*} data - Data to pass to listeners
   */
  emit(eventName, data = null) {
    const listeners = this.listeners.get(eventName);
    
    if (!listeners || listeners.size === 0) {
      console.log(`[EventSystem] No listeners for event: ${eventName}`);
      return;
    }
    
    console.log(`[EventSystem] Emitting event: ${eventName}`, data);
    
    // Call all listeners with the data
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventSystem] Error in listener for ${eventName}:`, error);
      }
    });
  }
  
  /**
   * Remove all listeners for an event (or all events if no name provided)
   * @param {string} [eventName] - Optional event name to clear
   */
  clear(eventName = null) {
    if (eventName) {
      this.listeners.delete(eventName);
      console.log(`[EventSystem] Cleared listeners for: ${eventName}`);
    } else {
      this.listeners.clear();
      console.log('[EventSystem] Cleared all listeners');
    }
  }
  
  /**
   * Get count of listeners for an event
   * @param {string} eventName - Event name
   * @returns {number} Number of listeners
   */
  getListenerCount(eventName) {
    const listeners = this.listeners.get(eventName);
    return listeners ? listeners.size : 0;
  }
  
  /**
   * Get all registered event names
   * @returns {string[]} Array of event names
   */
  getEventNames() {
    return Array.from(this.listeners.keys());
  }
}
