import { useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setNetworkInfo } from '../store';
import { responseWrapper, type ApiResponseType } from './helpers';
import api, { API_CONFIG } from '../services/api';

interface TimeAnchor { serverT: number; perfT: number; }

export const useNetworkStatus = () => {
  const dispatch = useDispatch();
  const timeAnchor = useRef<TimeAnchor | null>(null);

  const pingServer = useCallback(async () => {
    const pStart = performance.now();
    
    try {
      // --- CHẶNG 1: GỌI HEARTBEAT SERVER CHÍNH ---
      const res = await responseWrapper<ApiResponseType<{ timestamp: number | string }>, [string, object]>(
        api.get, 
        [API_CONFIG.ENDPOINTS.HEARTBEAT, { _t: Date.now() }]
      );

      const pEnd = performance.now();
      const measuredRtt = Math.round(pEnd - pStart);
      
      const srvTimeMs = typeof res.timestamp === 'string' 
        ? new Date(res.timestamp).getTime() 
        : res.timestamp;

      // Tính toán Anchor chính xác
      const correctedServerTime = srvTimeMs + (measuredRtt / 2);
      timeAnchor.current = { serverT: correctedServerTime, perfT: pEnd };

      const newOffset = correctedServerTime - Date.now();
      localStorage.setItem('server_time_offset', newOffset.toString());
      
      dispatch(setNetworkInfo({ online: true, offset: newOffset, rtt: measuredRtt }));

    } catch {
      // --- CHẶNG 2: FAILOVER SANG CLOUDFLARE (Dùng logic cũ của bạn) ---
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const cfStart = performance.now();

        const uniqueId = Math.random().toString(36).substring(7);
        // Dùng fetch trực tiếp để tránh qua middleware của apisauce/helpers
        const res = await fetch(`https://www.cloudflare.com/cdn-cgi/trace?cb=${uniqueId}`, {
          method: 'GET',
          mode: 'cors',
          signal: controller.signal,
          cache: 'no-store'
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const text = await res.text();
          const pEnd = performance.now();
          const measuredRtt = Math.floor(pEnd - cfStart);

          const tsLine = text.split('\n').find(l => l.startsWith('ts='));
          if (tsLine) {
            const srvTimeMs = parseFloat(tsLine.split('=')[1]) * 1000;
            
            // Anchor thời gian từ Cloudflare
            const correctedCfTime = srvTimeMs + (measuredRtt / 2);
            timeAnchor.current = { serverT: correctedCfTime, perfT: pEnd };
            
            const newOffset = correctedCfTime - Date.now();
            localStorage.setItem('server_time_offset', newOffset.toString());

            dispatch(setNetworkInfo({ online: true, offset: newOffset, rtt: measuredRtt }));
            console.warn("Server Main Down. Failover to Cloudflare Time successful.");
            return;
          }
        }
        throw new Error();
      } catch {
        // --- CHẶNG 3: THỰC SỰ MẤT MẠNG ---
        const savedOffset = Number(localStorage.getItem('server_time_offset')) || 0;
        dispatch(setNetworkInfo({ online: false, offset: savedOffset, rtt: null }));
      }
    }
  }, [dispatch]);

  useEffect(() => {
    pingServer();
    const interval = setInterval(pingServer, 15000);
    return () => clearInterval(interval);
  }, [pingServer]);
};