/**
 * AgentStateMachine - Finite State Machine for agent behavior
 * States: IDLE, WALKING_TO_STATION, ANALYZING, WALKING_TO_MEETING, 
 *         SIGNALING, WAITING_DIRECTOR, CELEBRATING, PANICKING
 */
export class AgentStateMachine {
  constructor(agentId, initialState = 'IDLE') {
    this.agentId = agentId;
    this.currentState = initialState;
    this.previousState = null;
    this.stateEnterCallbacks = new Map();
    this.stateExitCallbacks = new Map();
    
    // Valid state transitions
    this.transitions = {
      'IDLE': ['WALKING_TO_STATION'],
      'WALKING_TO_STATION': ['ANALYZING'],
      'ANALYZING': ['WALKING_TO_MEETING'],
      'WALKING_TO_MEETING': ['SIGNALING'],
      'SIGNALING': ['WAITING_DIRECTOR'],
      'WAITING_DIRECTOR': ['CELEBRATING', 'PANICKING', 'IDLE'],
      'CELEBRATING': ['IDLE'],
      'PANICKING': ['IDLE']
    };
  }
  
  /**
   * Transition to a new state
   */
  transition(newState) {
    if (!this.canTransition(newState)) {
      console.warn(`[AgentStateMachine] Invalid transition for ${this.agentId}: ${this.currentState} -> ${newState}`);
      return false;
    }
    
    // Exit current state
    if (this.stateExitCallbacks.has(this.currentState)) {
      this.stateExitCallbacks.get(this.currentState)();
    }
    
    this.previousState = this.currentState;
    this.currentState = newState;
    
    console.log(`[AgentStateMachine] ${this.agentId}: ${this.previousState} -> ${this.currentState}`);
    
    // Enter new state
    if (this.stateEnterCallbacks.has(newState)) {
      this.stateEnterCallbacks.get(newState)();
    }
    
    return true;
  }
  
  /**
   * Check if transition is valid
   */
  canTransition(targetState) {
    const validTransitions = this.transitions[this.currentState] || [];
    return validTransitions.includes(targetState);
  }
  
  /**
   * Register callback for entering a state
   */
  onEnter(state, callback) {
    this.stateEnterCallbacks.set(state, callback);
  }
  
  /**
   * Register callback for exiting a state
   */
  onExit(state, callback) {
    this.stateExitCallbacks.set(state, callback);
  }
  
  /**
   * Get current state
   */
  getCurrentState() {
    return this.currentState;
  }
  
  /**
   * Get previous state
   */
  getPreviousState() {
    return this.previousState;
  }

  /**
   * Destroy the state machine and clear callbacks
   */
  destroy() {
    this.stateEnterCallbacks.clear();
    this.stateExitCallbacks.clear();
    this.currentState = 'IDLE';
    this.previousState = null;
  }
}
