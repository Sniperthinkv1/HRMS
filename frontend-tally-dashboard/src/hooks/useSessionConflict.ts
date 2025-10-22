/**
 * React Hook for Session Conflict Detection via SSE
 * Automatically handles force logout events
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { sseService, SSEEventData } from '../services/sseService';
import { logout } from '../services/authService';

export interface SessionConflictModalData {
  show: boolean;
  message: string;
  reason: string;
}

export function useSessionConflict() {
  const [modalData, setModalData] = useState<SessionConflictModalData>({
    show: false,
    message: '',
    reason: '',
  });

  // Use ref to track connection and avoid reconnects
  const isConnectedRef = useRef(false);
  const handlerRef = useRef<((eventType: string, data: SSEEventData) => void) | null>(null);

  const handleLogout = useCallback(() => {
    // Clear everything and redirect to login
    logout();
  }, []);

  const closeModal = useCallback(() => {
    setModalData(prev => ({ ...prev, show: false }));
    // Immediately logout when closing modal
    handleLogout();
  }, [handleLogout]);

  // Create stable handler function that uses ref
  useEffect(() => {
    handlerRef.current = (eventType: string, data: SSEEventData) => {
      console.log('🚪 Force Logout Received:', data);
      console.log('🚪 Event Type:', eventType);
      console.log('🚪 Setting modal to show...');

      let message = 'Another login was detected. ';
      
      if (data.reason?.includes('same IP')) {
        message += 'Someone else logged in from this IP address.';
      } else if (data.reason?.includes('another location')) {
        message += 'You logged in from another location.';
      } else {
        message += data.reason || 'Your session has been terminated.';
      }

      setModalData({
        show: true,
        message,
        reason: data.reason || 'Session conflict',
      });

      console.log('✅ Modal data set:', { show: true, message });

      // Auto logout after showing modal
      setTimeout(() => {
        console.log('⏰ Auto logout triggered');
        logout();
      }, 5000);
    };
  });

  // Single effect for SSE connection - runs only once
  useEffect(() => {
    const accessToken = localStorage.getItem('access');
    console.log('🔑 Access token:', accessToken ? 'EXISTS' : 'NOT FOUND');
    
    if (!accessToken) {
      console.log('❌ No access token, skipping SSE connection');
      return;
    }

    if (isConnectedRef.current) {
      console.log('⚠️ SSE already connected, skipping...');
      return;
    }

    console.log('🔌 Initializing SSE connection...');
    isConnectedRef.current = true;
    
    // Wrapper function that always calls the latest handler
    const eventHandler = (eventType: string, data: SSEEventData) => {
      if (handlerRef.current) {
        handlerRef.current(eventType, data);
      }
    };
    
    // Connect to SSE
    sseService.connect();

    // Register wrapper handler
    sseService.on('force_logout', eventHandler);
    console.log('✅ Force logout handler registered');

    // Cleanup on unmount only
    return () => {
      console.log('🔌 Cleaning up SSE connection (unmount)...');
      isConnectedRef.current = false;
      sseService.off('force_logout', eventHandler);
      sseService.disconnect();
    };
  }, []); // Empty deps - only run once

  // Manual test function for debugging
  const testModal = useCallback(() => {
    console.log('🧪 Testing modal manually...');
    setModalData({
      show: true,
      message: 'This is a test message. You logged in from another location.',
      reason: 'Manual test',
    });
  }, []);

  return {
    modalData,
    closeModal,
    testModal, // For debugging
  };
}

