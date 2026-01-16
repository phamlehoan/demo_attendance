import { useState, useEffect, useCallback, useRef } from 'react';
import { dbPromise } from '../services/db';
import { mockApi } from '../mockApi';

interface TimeAnchor { serverT: number; perfT: number; }

export const useNetworkStatus = () => {
  const [online, setOnline] = useState<boolean>(window.navigator.onLine);
  const [rtt, setRtt] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  const timeAnchor = useRef<TimeAnchor | null>(null);
  const syncLock = useRef<boolean>(false);

  // --- HÀM PING KIỂM TRA MẠNG THẬT & TÍNH RTT ---
  const pingServer = useCallback(async (): Promise<boolean> => {
    if (!window.navigator.onLine) {
      setOnline(false);
      setRtt(null);
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const pStart = performance.now(); // Bắt đầu đo RTT

    try {
      const uniqueId = Math.random().toString(36).substring(7);
      const res = await fetch(`https://www.cloudflare.com/cdn-cgi/trace?cb=${uniqueId}`, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
        cache: 'no-store'
      });

      if (res.ok) {
        const text = await res.text();
        const pEnd = performance.now();
        const measuredRtt = Math.floor(pEnd - pStart); // Tính RTT

        const tsLine = text.split('\n').find(l => l.startsWith('ts='));
        if (tsLine) {
          const srvTimeMs = parseFloat(tsLine.split('=')[1]) * 1000;
          
          // Anchor thời gian chính xác (Server Time + 1/2 RTT)
          timeAnchor.current = { 
            serverT: srvTimeMs + (measuredRtt / 2), 
            perfT: pEnd 
          };
          
          localStorage.setItem('server_time_offset', (timeAnchor.current.serverT - Date.now()).toString());
          
          setRtt(measuredRtt);
          setOnline(true);
          return true;
        }
      }
      throw new Error();
    } catch {
      setOnline(false);
      setRtt(null);
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  // --- LOGIC ĐỒNG BỘ (BẢO VỆ GẮT GAO) ---
  const syncEverything = useCallback(async (forceUpdateEmployees = false) => {
    if (syncLock.current) return;

    // 1. Kiểm tra mạng thực tế trước khi hiện Loading
    const isReallyOnline = await pingServer();
    if (!isReallyOnline) return;

    const db = await dbPromise;
    
    // Kiểm tra dữ liệu hiện tại
    const unsynced = await db.getAllFromIndex('logs', 'by-synced', 0);
    const empsInDB = await db.getAll('employees');

    // Nếu không có log để sync VÀ đã có nhân viên VÀ không yêu cầu force update -> Thoát
    if (unsynced.length === 0 && empsInDB.length > 0 && !forceUpdateEmployees) return;

    syncLock.current = true;
    setIsSyncing(true);

    try {
      // 2. Đồng bộ nhân viên (Chạy khi DB trống HOẶC khi forceUpdateEmployees = true)
      if (empsInDB.length === 0 || forceUpdateEmployees) {
        const employees = await mockApi.fetchEmployees();
        const tx = db.transaction('employees', 'readwrite');
        await tx.store.clear();
        for (const e of employees) await tx.store.put(e);
        await tx.done;
        console.log("Employees updated successfully.");
      }

      // 3. Đồng bộ Log chấm công
      if (unsynced.length > 0) {
        const res = await mockApi.syncLogs(unsynced);
        if (res.success) {
          const tx = db.transaction('logs', 'readwrite');
          const now = Date.now();
          for (const log of unsynced) {
            // Cập nhật trạng thái và thời điểm sync thành công
            await tx.store.put({ ...log, synced: 1, syncedAt: now });
          }
          await tx.done;
        }
      }
    } catch (e) {
      console.error("Sync Error:", e);
    } finally {
      setIsSyncing(false);
      syncLock.current = false;
    }
  }, [pingServer]);

  // Kiểm tra định kỳ
  useEffect(() => {
    pingServer();
    const handleEvent = () => pingServer();
    window.addEventListener('online', handleEvent);
    window.addEventListener('offline', handleEvent);
    const interval = setInterval(pingServer, 5000);

    return () => {
      window.removeEventListener('online', handleEvent);
      window.removeEventListener('offline', handleEvent);
      clearInterval(interval);
    };
  }, [pingServer]);

  // Tự động kích hoạt khi mạng quay trở lại
  useEffect(() => {
    if (online) syncEverything();
  }, [online, syncEverything]);

  // Hàm lấy giờ chuẩn monotonic
  const getMonotonicTime = useCallback(() => {
    if (timeAnchor.current) {
      const elapsed = performance.now() - timeAnchor.current.perfT;
      return Math.floor(timeAnchor.current.serverT + elapsed);
    }
    const savedOffset = Number(localStorage.getItem('server_time_offset')) || 0;
    return Date.now() + savedOffset;
  }, []);

  return { online, rtt, isSyncing, getMonotonicTime, syncEverything };
};
