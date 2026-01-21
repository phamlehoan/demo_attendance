import { useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setNetworkInfo } from '../store';
import { responseWrapper, type ApiResponseType } from './helpers';
import api, { API_CONFIG } from '../services/api';
import type { AxiosRequestConfig } from 'axios';
import dayjs from 'dayjs';

interface TimeAnchor { serverT: number; perfT: number; }

export const useNetworkStatus = () => {
  const dispatch = useDispatch();
  const timeAnchor = useRef<TimeAnchor | null>(null);

  const updateNetworkState = useCallback((srvTimeMs: number, rtt: number, pEnd: number) => {
    const correctedServerTime = srvTimeMs + rtt / 2;
    timeAnchor.current = { serverT: correctedServerTime, perfT: pEnd };
    const newOffset = correctedServerTime - Date.now();
    
    localStorage.setItem('server_time_offset', newOffset.toString());
    dispatch(setNetworkInfo({ online: true, offset: newOffset, rtt }));
  }, [dispatch]);

  const handleOffline = useCallback(() => {
    const savedOffset = Number(localStorage.getItem('server_time_offset')) || 0;
    dispatch(setNetworkInfo({ online: false, offset: savedOffset, rtt: null }));
  }, [dispatch]);

  const pingServer = useCallback(async (): Promise<boolean> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const pStart = performance.now();

    try {
      const res = await responseWrapper<
        ApiResponseType<{ timestamp: number | string }>, 
        [string, Record<string, unknown>, AxiosRequestConfig]
      >(
        api.get,
        [API_CONFIG.ENDPOINTS.HEARTBEAT, { _t: Date.now() }, { signal: controller.signal }]
      );

      const pEnd = performance.now();
      const srvTimeMs = dayjs(res.timestamp).valueOf();
      updateNetworkState(srvTimeMs, Math.round(pEnd - pStart), pEnd);
      clearTimeout(timeoutId);
      return true;

    } catch (err: unknown) {
      // Khử any: Kiểm tra nếu là lỗi timeout từ AbortController
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const isTimeout = isAbort || (err as { problem?: string })?.problem === 'TIMEOUT_ERROR';

      try {
        const cfStart = performance.now();
        const cfRes = await fetch(`https://www.cloudflare.com/cdn-cgi/trace?cb=${Math.random()}`, {
          signal: controller.signal,
          cache: 'no-store'
        });

        if (cfRes.ok) {
          const text = await cfRes.text();
          const pEnd = performance.now();
          const tsLine = text.split('\n').find(l => l.startsWith('ts='));
          if (tsLine) {
            const srvTimeMs = parseFloat(tsLine.split('=')[1]) * 1000;
            updateNetworkState(srvTimeMs, isTimeout ? 5001 : Math.floor(pEnd - cfStart), pEnd);
            return true;
          }
        }
        throw new Error();
      } catch {
        handleOffline();
        return false;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }, [updateNetworkState, handleOffline]);

  useEffect(() => {
    pingServer();
    const interval = setInterval(pingServer, 15000);
    const handleStatus = () => pingServer();
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, [pingServer]);

  return { pingServer, timeAnchor };
};
