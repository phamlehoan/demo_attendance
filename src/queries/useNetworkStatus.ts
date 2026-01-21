import { useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setNetworkInfo } from '../store';
import { responseWrapper, type ApiResponseType } from './helpers';
import api, { API_CONFIG } from '../services/api';

export const useNetworkStatus = () => {
  const dispatch = useDispatch();

  const pingServer = useCallback(async () => {
    // T1: Ghi lại thời điểm bắt đầu (Monotonic time)
    const pStart = performance.now();
    
    try {
      const res = await responseWrapper<ApiResponseType<{ timestamp: number }>, [string, object]>(
        api.get, 
        [API_CONFIG.ENDPOINTS.HEARTBEAT, { _t: Date.now() }]
      );

      // T4: Ghi lại thời điểm nhận phản hồi
      const pEnd = performance.now();
      
      // RTT: Tổng thời gian vòng xoay mạng
      const rtt = Math.round(pEnd - pStart);
      
      const srvTimeMs = typeof res.timestamp === 'string' 
        ? new Date(res.timestamp).getTime() 
        : res.timestamp;

      // Tính toán Server Time chuẩn (giả định độ trễ đi và về bằng nhau = RTT/2)
      const correctedServerTime = srvTimeMs + (rtt / 2);
      const newOffset = correctedServerTime - Date.now();

      // Lưu Offset để dùng khi mất mạng
      localStorage.setItem('server_time_offset', newOffset.toString());
      
      // QUAN TRỌNG: Gửi cả online, offset và rtt vào Redux
      dispatch(setNetworkInfo({ 
        online: true, 
        offset: newOffset,
        rtt: rtt 
      }));

    } catch {
      // Khi mất mạng, lấy offset cũ từ LocalStorage, RTT set về null
      const savedOffset = Number(localStorage.getItem('server_time_offset')) || 0;
      dispatch(setNetworkInfo({ 
        online: false, 
        offset: savedOffset,
        rtt: null 
      }));
    }
  }, [dispatch]);

  useEffect(() => {
    pingServer();
    const interval = setInterval(pingServer, 15000); // Check mỗi 15 giây
    return () => clearInterval(interval);
  }, [pingServer]);
};