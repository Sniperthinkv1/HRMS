/**
 * SSE (Server-Sent Events) Service for Session Conflict Notifications
 * Listens for force_logout events and handles automatic logout
 */

import { API_CONFIG } from "../config/apiConfig";

export type SSEEventType = 'force_logout' | 'ip_conflict' | 'session_conflict' | 'login_attempt_blocked' | 'connected';

export interface SSEEventData {
  ip_address: string;
  user?: {
    email: string;
    name: string;
    role: string;
  };
  existing_user?: {
    email: string;
    name: string;
    role: string;
  };
  reason?: string;
  action?: string;
}

export interface SSEEventHandler {
  (eventType: SSEEventType, data: SSEEventData): void;
}

class SSEService {
  private eventSource: EventSource | null = null;
  private handlers: Map<SSEEventType, SSEEventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  /**
   * Connect to SSE endpoint
   */
  connect(): void {
    if (this.eventSource) {
      console.warn('SSE already connected');
      return;
    }

    const API_BASE = API_CONFIG.getApiUrl();
    const sseUrl = `${API_BASE}/sse/session-conflicts/`;

    console.log('🔌 Connecting to SSE:', sseUrl);

    try {
      this.eventSource = new EventSource(sseUrl);

      // Listen to ALL events (including unknown ones)
      this.eventSource.onmessage = (e) => {
        console.log('📨 SSE Message received (generic):', e);
      };

      this.eventSource.addEventListener('connected', (e) => {
        console.log('✅ SSE Connected:', e.data);
        this.reconnectAttempts = 0;
        this.emit('connected', JSON.parse(e.data));
      });

      this.eventSource.addEventListener('force_logout', (e) => {
        console.log('🚪 Force Logout Event received!');
        console.log('🚪 Event data:', e.data);
        console.log('🚪 Event type:', e.type);
        const data = JSON.parse(e.data);
        console.log('🚪 Parsed data:', data);
        console.log('🚪 Emitting to handlers...');
        this.emit('force_logout', data);
        console.log('🚪 Emitted!');
      });

      this.eventSource.addEventListener('ip_conflict', (e) => {
        console.log('⚠️ IP Conflict Event:', e.data);
        const data = JSON.parse(e.data);
        this.emit('ip_conflict', data);
      });

      this.eventSource.addEventListener('session_conflict', (e) => {
        console.log('⚠️ Session Conflict Event:', e.data);
        const data = JSON.parse(e.data);
        this.emit('session_conflict', data);
      });

      this.eventSource.addEventListener('login_attempt_blocked', (e) => {
        console.log('🚫 Login Attempt Blocked:', e.data);
        const data = JSON.parse(e.data);
        this.emit('login_attempt_blocked', data);
      });

      this.eventSource.onerror = (error) => {
        console.error('❌ SSE Error:', error);
        this.handleError();
      };

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      this.handleError();
    }
  }

  /**
   * Disconnect from SSE
   */
  disconnect(): void {
    if (this.eventSource) {
      console.log('Disconnecting SSE...');
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Register event handler
   */
  on(eventType: SSEEventType, handler: SSEEventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Unregister event handler
   */
  off(eventType: SSEEventType, handler: SSEEventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all registered handlers
   */
  private emit(eventType: SSEEventType, data: SSEEventData): void {
    console.log(`📢 Emitting ${eventType} to handlers...`);
    const handlers = this.handlers.get(eventType);
    console.log(`📢 Found ${handlers?.length || 0} handlers for ${eventType}`);
    
    if (handlers && handlers.length > 0) {
      handlers.forEach((handler, index) => {
        console.log(`📢 Calling handler ${index + 1}...`);
        handler(eventType, data);
        console.log(`✅ Handler ${index + 1} called`);
      });
    } else {
      console.warn(`⚠️ No handlers registered for event: ${eventType}`);
    }
  }

  /**
   * Handle SSE errors and attempt reconnection
   */
  private handleError(): void {
    this.disconnect();

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  /**
   * Check if SSE is connected
   */
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}

// Export singleton instance
export const sseService = new SSEService();

