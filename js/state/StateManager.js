/**
 * StateManager - Global state management and FSM coordination
 * Manages system state, agent state machines, and state transitions
 */
import { AgentStateMachine } from './AgentStateMachine.js';

export class StateManager {
  constructor() {
    // Global system state
    this.systemState = 'IDLE'; // IDLE, CYCLE_ACTIVE, WAITING_DECISION, EXECUTING
    this.lastCycleTimestamp = null;
    this.activeAgents = [];
    this.directorVerdict = null;
    
    // Agent state machines
    this.agentStateMachines = new Map();
    
    // State change subscribers
    this.subscribers = new Map();
  }
  
  /**
   * Initialize state machine for an agent
   */
  initAgentStateMachine(agentId, initialState = 'IDLE') {
    const fsm = new AgentStateMachine(agentId, initialState);
    this.agentStateMachines.set(agentId, fsm);
    return fsm;
  }
  
  /**
   * Get agent's state machine
   */
  getAgentStateMachine(agentId) {
    return this.agentStateMachines.get(agentId);
  }
  
  /**
   * Transition an agent to a new state
   */
  transitionAgent(agentId, newState) {
    const fsm = this.agentStateMachines.get(agentId);
    if (!fsm) {
      console.warn(`[StateManager] No state machine found for agent: ${agentId}`);
      return false;
    }
    
    return fsm.transition(newState);
  }
  
  /**
   * Set global system state
   */
  setState(key, value) {
    const oldValue = this[key];
    this[key] = value;
    
    // Notify subscribers
    this.notifySubscribers(key, value, oldValue);
    
    console.log(`[StateManager] State changed: ${key} = ${value}`);
  }
  
  /**
   * Get global system state
   */
  getState(key) {
    return this[key];
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    this.subscribers.get(key).push(callback);
  }
  
  /**
   * Notify subscribers of state change
   */
  notifySubscribers(key, newValue, oldValue) {
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      callbacks.forEach(callback => callback(newValue, oldValue));
    }
  }
  
  /**
   * Get current state of all agents
   */
  getAgentStates() {
    const states = {};
    this.agentStateMachines.forEach((fsm, agentId) => {
      states[agentId] = fsm.getCurrentState();
    });
    return states;
  }
  
  /**
   * Transition all agents to a state
   */
  transitionAllAgents(newState) {
    const results = {};
    this.agentStateMachines.forEach((fsm, agentId) => {
      results[agentId] = fsm.transition(newState);
    });
    return results;
  }

  /**
   * Destroy state manager and clean up all state machines
   */
  destroy() {
    this.agentStateMachines.forEach((fsm, agentId) => fsm.destroy());
    this.agentStateMachines.clear();
    this.subscribers.clear();
    console.log('[StateManager] Destroyed');
  }
}
