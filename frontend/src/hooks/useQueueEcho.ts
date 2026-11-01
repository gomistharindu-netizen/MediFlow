'use client';

import { useState, useEffect, useRef } from 'react';
import { getEcho } from '@/lib/echo';

export interface PatientCalledPayload {
  tenant_id: string;
  visit_id: number;
  token_number: number;
  patient_name: string;
  doctor_name: string;
  room_number: string;
  called_at: string;
}

export interface QueueUpdatedPayload {
  tenant_id: string;
  doctor_id: number;
  action: string;
  queue: any;
}

interface UseQueueEchoOptions {
  tenantId: string;
  doctorId?: number;
  onPatientCalled?: (payload: PatientCalledPayload) => void;
  onQueueUpdated?: (payload: QueueUpdatedPayload) => void;
}

export function useQueueEcho({
  tenantId,
  doctorId,
  onPatientCalled,
  onQueueUpdated,
}: UseQueueEchoOptions) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastCalled, setLastCalled] = useState<PatientCalledPayload | null>(null);

  const callbacksRef = useRef({ onPatientCalled, onQueueUpdated });
  useEffect(() => {
    callbacksRef.current = { onPatientCalled, onQueueUpdated };
  });

  useEffect(() => {
    if (!tenantId) return;

    const echo = getEcho();
    if (!echo) return;

    const pusherClient = (echo.connector as any)?.pusher;

    if (pusherClient && pusherClient.connection) {
      const updateState = (state: string) => {
        if (state === 'connected') {
          setIsConnected(true);
          setConnectionState('connected');
        } else if (state === 'connecting') {
          setIsConnected(false);
          setConnectionState('connecting');
        } else {
          setIsConnected(false);
          setConnectionState('disconnected');
        }
      };

      updateState(pusherClient.connection.state);
      pusherClient.connection.bind('state_change', (states: { current: string }) => {
        updateState(states.current);
      });
    }

    const channelName = `tenant.${tenantId}.queue`;
    const channel = echo.channel(channelName);

    channel.listen('.PatientCalled', (payload: PatientCalledPayload) => {
      setLastCalled(payload);
      if (callbacksRef.current.onPatientCalled) {
        callbacksRef.current.onPatientCalled(payload);
      }
    });

    channel.listen('.QueueUpdated', (payload: QueueUpdatedPayload) => {
      // If doctorId is specified, filter for this doctor or all doctors
      if (!doctorId || payload.doctor_id === doctorId) {
        if (callbacksRef.current.onQueueUpdated) {
          callbacksRef.current.onQueueUpdated(payload);
        }
      }
    });

    return () => {
      echo.leaveChannel(channelName);
    };
  }, [tenantId, doctorId]);

  return {
    isConnected,
    connectionState,
    lastCalled,
  };
}
