import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../config';
import { getToken } from '../api/client';

type HubName = 'chat' | 'call';

export function useSignalR(hub: HubName) {
  const connRef = useRef<signalR.HubConnection | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let conn: signalR.HubConnection;

    (async () => {
      const token = await getToken();
      conn = new signalR.HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}/hubs/${hub}`, {
          accessTokenFactory: () => token ?? '',
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      connRef.current = conn;

      try {
        await conn.start();
        setConnected(true);
      } catch (e) {
        console.warn(`[SignalR] ${hub} connect error`, e);
      }

      conn.onreconnected(() => setConnected(true));
      conn.onclose(() => setConnected(false));
    })();

    return () => {
      conn?.stop().catch(() => {});
    };
  }, [hub]);

  return { connRef, connected };
}
