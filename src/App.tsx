import { useState, useEffect, useCallback, useRef } from 'react';
import { dbPromise } from './db';
import type { Employee, AttendanceLog } from './db';
import { mockApi } from './mockApi';
import './App.css';

interface TimeAnchor { serverT: number; perfT: number; }

function App() {
  const [pin, setPin] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [online, setOnline] = useState<boolean>(window.navigator.onLine);
  const [rtt, setRtt] = useState<number | null>(null);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [history, setHistory] = useState<(AttendanceLog & { empName: string })[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [currentEmp, setCurrentEmp] = useState<Employee | null>(null);
  const [currentActionType, setCurrentActionType] = useState<'IN' | 'OUT' | null>(null);
  const prevOnlineRef = useRef(window.navigator.onLine);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timeAnchor = useRef<TimeAnchor | null>(null);

  // --- LẤY GIỜ CHUẨN (PRIORITY: ANCHOR > OFFSET > LOCAL) ---
  const getMonotonicTime = useCallback((): number => {
    if (timeAnchor.current) {
      const elapsed = performance.now() - timeAnchor.current.perfT;
      return Math.floor(timeAnchor.current.serverT + elapsed);
    }
    const savedOffset = Number(localStorage.getItem('server_time_offset')) || 0;
    return Date.now() + savedOffset;
  }, []);

  // --- CHECK MẠNG NHẠY BÉN (TIMEOUT 2S) ---
  const checkRealStatus = useCallback(async () => {
    // 1. Nếu trình duyệt báo offline qua navigator, set ngay lập tức
    if (!window.navigator.onLine) {
      setOnline(false);
      setRtt(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); 
    const pStart = performance.now();

    try {
      // Dùng URL ngẫu nhiên cực mạnh để phá vỡ mọi tầng Cache/Service Worker
      const uniqueId = Math.random().toString(36).substring(7);
      const res = await fetch(`https://www.cloudflare.com/cdn-cgi/trace?cache_bust=${uniqueId}`, { 
        method: 'GET',
        mode: 'cors',
        signal: controller.signal
      });

      if (res.ok) {
        const text = await res.text();
        const tsLine = text.split('\n').find(l => l.startsWith('ts='));
        if (tsLine) {
          const srvTimeMs = parseFloat(tsLine.split('=')[1]) * 1000;
          const pEnd = performance.now();
          const measuredRtt = Math.floor(pEnd - pStart);
          
          timeAnchor.current = { serverT: srvTimeMs + (measuredRtt / 2), perfT: pEnd };
          localStorage.setItem('server_time_offset', (timeAnchor.current.serverT - Date.now()).toString());
          
          setRtt(measuredRtt);
          setOnline(true);
        }
      } else {
        throw new Error("Mất kết nối server");
      }
    } catch (e) {
      // Rơi vào đây khi tắt mạng thật, hoặc fetch bị lỗi do không có route
      setOnline(false);
      setRtt(null);
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    // Kiểm tra ngay lập tức khi component mount
    checkRealStatus();

    // Lắng nghe sự kiện hệ thống của trình duyệt
    const handleOnline = () => checkRealStatus();
    const handleOffline = () => {
      setOnline(false);
      setRtt(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Interval check mỗi 5 giây
    const interval = setInterval(checkRealStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkRealStatus]);

  // --- ĐỒNG BỘ ---
  const syncEverything = useCallback(async (forceUpdateEmployees = false) => {
    if (isSyncing || !window.navigator.onLine) return;
    const db = await dbPromise;
    const unsynced = await db.getAllFromIndex('logs', 'by-synced', 0);
    const empsInDB = await db.getAll('employees');
    
    if (unsynced.length === 0 && empsInDB.length > 0 && !forceUpdateEmployees) return;

    setIsSyncing(true);
    try {
      if (empsInDB.length === 0 || forceUpdateEmployees) {
        const employees = await mockApi.fetchEmployees();
        const tx = db.transaction('employees', 'readwrite');
        await tx.store.clear();
        for (const e of employees) await tx.store.put(e);
        await tx.done;
      }
      if (unsynced.length > 0) {
        const res = await mockApi.syncLogs(unsynced);
        if (res.success) {
          const tx = db.transaction('logs', 'readwrite');
          for (const log of unsynced) await tx.store.put({ ...log, synced: 1 });
          await tx.done;
        }
      }
    } catch (e) { console.error(e); } finally { setIsSyncing(false); }
  }, [isSyncing]);

  useEffect(() => {
    const interval = setInterval(checkRealStatus, 5000);
    checkRealStatus();
    return () => clearInterval(interval);
  }, [checkRealStatus]);

  useEffect(() => {
    if (online) syncEverything();
  }, [online, syncEverything]);

  useEffect(() => {
    // Chỉ chạy sync khi trạng thái chuyển từ Offline -> Online
    if (online && !prevOnlineRef.current) {
      syncEverything();
    }
    prevOnlineRef.current = online;
  }, [online, syncEverything]);

  const handleAction = async (type: 'IN' | 'OUT') => {
    const db = await dbPromise;
    const emp = await db.getFromIndex('employees', 'by-pin', pin);
    if (emp) {
      setCurrentEmp(emp);
      setCurrentActionType(type);
      setPin('');
      setShowSuccessModal(true);
      setTimeout(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch { alert("Không thể mở Camera"); }
      }, 100);
    } else { alert("Mã PIN không đúng!"); setPin(''); }
  };

  const confirmAction = async () => {
    if (!currentEmp || !currentActionType) return;
    const canvas = document.createElement("canvas");
    if (videoRef.current) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.translate(canvas.width, 0); ctx?.scale(-1, 1);
      ctx?.drawImage(videoRef.current, 0, 0);
    }
    const db = await dbPromise;
    await db.add('logs', {
      employeeId: currentEmp.employeeId,
      timestamp: getMonotonicTime(),
      type: currentActionType,
      photo: canvas.toDataURL("image/jpeg", 0.6),
      synced: 0
    });
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    setShowSuccessModal(false);
    if (online) syncEverything();
  };

  return (
    <div className="app-viewport dark">
      {/* STATUS FIXED Ở GÓC TRÊN BÊN TRÁI */}
      <div className="network-status-fixed">
        {!online ? (
          <span className="status-label offline">○ Ngoại tuyến</span>
        ) : rtt && rtt > 500 ? (
          <span className="status-label weak">⚠️ Mạng yếu ({rtt}ms)</span>
        ) : (
          <span className="status-label online">● Trực tuyến {rtt && `(${rtt}ms)`}</span>
        )}
      </div>

      {isSyncing && <div className="sync-overlay-full"><div className="sync-card"><div className="spinner-large"></div><h2>Đang tải dữ liệu...</h2></div></div>}

      <button className="log-trigger" onClick={async () => {
        const db = await dbPromise;
        const [logs, emps] = await Promise.all([db.getAll('logs'), db.getAll('employees')]);
        setHistory(logs.map(l => ({ ...l, empName: emps.find(e => e.employeeId === l.employeeId)?.fullName || "N/A" })).sort((a,b) => b.timestamp - a.timestamp));
        setShowLogs(true);
      }}>📋 Lịch sử</button>

      <div className="kiosk-card">
        <div className="display-area">
          <div className="pin-dots">
            {[...Array(5)].map((_, i) => <span key={i} className={pin.length > i ? 'active' : ''}></span>)}
          </div>
        </div>
        <div className="numpad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map(k => (
            <button key={k} className="num-btn" onClick={() => {
              if (k === 'C') setPin('');
              else if (k === '⌫') setPin(p => p.slice(0, -1));
              else if (pin.length < 5) setPin(p => p + k.toString());
            }}>{k}</button>
          ))}
        </div>
        <div className="action-buttons">
          <button className="btn-in" onClick={() => handleAction('IN')} disabled={pin.length < 5}>CHECK IN</button>
          <button className="btn-out" onClick={() => handleAction('OUT')} disabled={pin.length < 5}>CHECK OUT</button>
        </div>
      </div>

      {showSuccessModal && currentEmp && (
        <div className="modal-overlay">
          <div className="modal-content success-modal">
            <div className="camera-container"><video ref={videoRef} autoPlay playsInline muted className="camera-feed" /><div className="camera-scanline" /></div>
            <div className="success-info">
              <h2>XÁC NHẬN</h2>
              <p className="emp-name">{currentEmp.fullName}</p>
              <div className="modal-actions">
                <button className="btn-confirm" onClick={confirmAction}>CHỤP ẢNH & GỬI</button>
                <button className="btn-cancel" onClick={() => { if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); setShowSuccessModal(false); }}>HỦY</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogs && (
        <div className="modal-overlay" onClick={() => setShowLogs(false)}>
          <div className="modal-content log-modal" onClick={e => e.stopPropagation()}>
             <div className="modal-header"><h3>Lịch sử chấm công</h3><button onClick={() => setShowLogs(false)}>✕</button></div>
             <div className="modal-body scrollable">
               <table>
                 <thead><tr><th>Nhân viên</th><th>Loại</th><th>Thời gian</th><th>Ảnh</th><th>Sync</th></tr></thead>
                 <tbody>
                   {history.map(h => (
                     <tr key={h.timestamp}>
                        <td>{h.empName}</td>
                        <td><span className={`badge ${h.type}`}>{h.type}</span></td>
                        <td>{new Date(h.timestamp).toLocaleTimeString()}</td>
                        <td>{h.photo && <img src={h.photo} className="log-thumb" alt="Log" />}</td>
                        <td>{h.synced ? '✅' : '⏳'}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
