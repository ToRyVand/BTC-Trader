/**
 * JournalPoller - Polls journal.jsonl for new trading events
 * Reads JSONL format (one JSON object per line) and emits events
 */
export class JournalPoller {
  constructor(eventSystem, config = {}) {
    this.eventSystem = eventSystem;
    this.journalPath = config.journalPath || '/journal.jsonl';
    this.pollInterval = config.pollInterval || 8000; // 8 seconds
    this.fetchTimeout = config.fetchTimeout || 5000; // 5 seconds
    this.retryDelay = config.retryDelay || 30000; // 30 seconds on error
    
    this.lastProcessedTimestamp = 0;
    this.isPolling = false;
    this.pollTimer = null;
    this.consecutiveErrors = 0;
    // Skip all entries already in the file on first poll — only react to NEW events
    this.skipHistoryOnStart = config.skipHistoryOnStart !== false;
    
    console.log('[JournalPoller] Initialized', {
      journalPath: this.journalPath,
      pollInterval: this.pollInterval,
      fetchTimeout: this.fetchTimeout
    });
  }
  
  /**
   * Start polling the journal file
   */
  start() {
    if (this.isPolling) {
      console.warn('[JournalPoller] Already polling');
      return;
    }
    
    this.isPolling = true;
    console.log('[JournalPoller] Starting polling...');
    
    // Poll immediately, then at intervals
    this.poll();
  }
  
  /**
   * Stop polling the journal file
   */
  stop() {
    if (!this.isPolling) {
      return;
    }
    
    this.isPolling = false;
    
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    
    console.log('[JournalPoller] Stopped polling');
  }
  
  /**
   * Poll the journal file once
   */
  async poll() {
    if (!this.isPolling) {
      return;
    }
    
    try {
      console.log('[JournalPoller] Polling journal...');
      
      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.fetchTimeout);
      
      const response = await fetch(this.journalPath, {
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      
      // Parse JSONL (one JSON object per line)
      const lines = text.trim().split('\n').filter(line => line.trim());
      const entries = [];
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          entries.push(entry);
        } catch (parseError) {
          console.warn('[JournalPoller] Failed to parse line:', line, parseError);
        }
      }
      
      console.log(`[JournalPoller] Parsed ${entries.length} entries`);

      // On first poll, skip all history — only watch for future events
      if (this.lastProcessedTimestamp === 0 && this.skipHistoryOnStart && entries.length > 0) {
        const latestTs = Math.max(...entries.map(e => new Date(e.timestamp).getTime() || 0));
        this.lastProcessedTimestamp = latestTs;
        console.log(`[JournalPoller] Skipping ${entries.length} historical entries, anchored to latest ts`);
        this.consecutiveErrors = 0;
        this.pollTimer = setTimeout(() => this.poll(), this.pollInterval);
        return;
      }

      // Process new entries (filter by timestamp)
      const newEntries = entries.filter(entry => {
        const timestamp = new Date(entry.timestamp).getTime();
        return timestamp > this.lastProcessedTimestamp;
      });
      
      if (newEntries.length > 0) {
        console.log(`[JournalPoller] Found ${newEntries.length} new entries`);
        
        // Sort by timestamp ascending
        newEntries.sort((a, b) => {
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });
        
        // Process each entry
        for (const entry of newEntries) {
          this.processEntry(entry);
          
          // Update last processed timestamp
          const timestamp = new Date(entry.timestamp).getTime();
          if (timestamp > this.lastProcessedTimestamp) {
            this.lastProcessedTimestamp = timestamp;
          }
        }
      } else {
        console.log('[JournalPoller] No new entries');
      }
      
      // Reset error counter on success
      if (this.consecutiveErrors > 0) {
        this.eventSystem.emit('journal:connection:restored', {
          afterErrors: this.consecutiveErrors,
          timestamp: new Date().toISOString()
        });
      }
      this.consecutiveErrors = 0;
      this.lastError = null;
      
      // Schedule next poll
      this.pollTimer = setTimeout(() => this.poll(), this.pollInterval);
      
    } catch (error) {
      this.consecutiveErrors++;
      this.lastError = error;
      
      if (error.name === 'AbortError') {
        console.error('[JournalPoller] Fetch timeout');
      } else {
        console.error('[JournalPoller] Fetch error:', error.message);
      }
      
      // Emit connection lost event on first error
      if (this.consecutiveErrors === 1) {
        this.eventSystem.emit('journal:connection:lost', {
          error: error.message,
          errorType: error.name || 'Unknown',
          timestamp: new Date().toISOString()
        });
      }
      
      // Emit status update on each error
      this.eventSystem.emit('journal:connection:error', {
        consecutiveErrors: this.consecutiveErrors,
        error: error.message,
        willRetryIn: Math.min(this.retryDelay, this.pollInterval * Math.pow(2, this.consecutiveErrors - 1))
      });
      
      // Retry with delay (exponential backoff up to retryDelay)
      const delay = Math.min(this.retryDelay, this.pollInterval * Math.pow(2, this.consecutiveErrors - 1));
      console.log(`[JournalPoller] Retrying in ${delay}ms (error #${this.consecutiveErrors})`);
      
      this.pollTimer = setTimeout(() => this.poll(), delay);
    }
  }
  
  /**
   * Process a single journal entry
   * @param {Object} entry - Journal entry object
   */
  processEntry(entry) {
    const { event, timestamp } = entry;
    
    console.log(`[JournalPoller] Processing event: ${event}`, { timestamp, entry });
    
    switch (event) {
      case 'CYCLE':
        this.processCycleEvent(entry, timestamp);
        break;
        
      case 'DECISION':
        this.processDecisionEvent(entry, timestamp);
        break;
        
      case 'EXECUTION':
        this.processExecutionEvent(entry, timestamp);
        break;
        
      case 'ERROR':
        console.warn(`[JournalPoller] ERROR event:`, entry.detail);
        break;
        
      default:
        console.log(`[JournalPoller] Unknown event type: ${event}`);
    }
  }
  
  /**
   * Process CYCLE event - agents start analyzing
   * @param {Object} entry - Full journal entry
   * @param {string} timestamp - Event timestamp
   */
  processCycleEvent(entry, timestamp) {
    console.log('[JournalPoller] CYCLE event:', entry);
    
    // Extract signals from agent_signals array
    const signals = {};
    if (entry.agent_signals && Array.isArray(entry.agent_signals)) {
      entry.agent_signals.forEach(agentSignal => {
        // Map agent names to our agent IDs
        const agentMap = {
          'trader-technical': 'tech',
          'trader-quant': 'quant',
          'trader-fundamental': 'fund',
          'trader-sentiment': 'sent',
          'trader-risk': 'risk'
        };
        
        const agentId = agentMap[agentSignal.agent];
        if (agentId) {
          signals[agentId] = agentSignal.signal; // 'BUY', 'SELL', 'HOLD'
        }
      });
    }
    
    // Emit cycle:start event with signals data
    this.eventSystem.emit('cycle:start', {
      timestamp,
      signals,
      btcPrice: entry.btc_price,
      decision: entry.decision,
      claudeDecision: entry.claude_decision
    });
  }
  
  /**
   * Process DECISION event - director makes verdict
   * @param {Object} entry - Full journal entry
   * @param {string} timestamp - Event timestamp
   */
  processDecisionEvent(entry, timestamp) {
    console.log('[JournalPoller] DECISION event:', entry);
    
    // Emit director:verdict event
    this.eventSystem.emit('director:verdict', {
      timestamp,
      decision: entry.decision || entry.claude_decision?.accion || 'HOLD',
      confidence: entry.confidence || entry.claude_decision?.confianza || 0,
      reasoning: entry.reasoning || entry.claude_decision?.razon || 'Sin razón'
    });
  }
  
  /**
   * Process EXECUTION event - trade executed
   * @param {Object} entry - Full journal entry
   * @param {string} timestamp - Event timestamp
   */
  processExecutionEvent(entry, timestamp) {
    console.log('[JournalPoller] EXECUTION event:', entry);
    
    // Emit trade:executed event
    this.eventSystem.emit('trade:executed', {
      timestamp,
      action: entry.action || entry.result?.action || 'UNKNOWN',
      profit: entry.profit || 0,
      amount: entry.amount || entry.result?.amount_sats || 0,
      price: entry.price || entry.btc_price || 0
    });
  }
  
  /**
   * Reset the last processed timestamp (useful for testing)
   */
  reset() {
    this.lastProcessedTimestamp = 0;
    this.consecutiveErrors = 0;
    this.lastError = null;
    console.log('[JournalPoller] Reset');
  }

  /**
   * Stop polling and clean up resources
   */
  destroy() {
    this.stop();
    this.eventSystem = null;
    console.log('[JournalPoller] Destroyed');
  }
}
