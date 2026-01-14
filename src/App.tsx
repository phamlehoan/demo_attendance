import { useState, useEffect, useCallback, useRef } from 'react';
import { dbPromise } from './db';
import { mockApi } from './mockApi';
import './App.css';

function App() {
  const [pin, setPin] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [online, setOnline] = useState(window.navigator.onLine);
  const [rtt, setRtt] = useState<number | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  
  // Dùng Ref để theo dõi trạng thái online trước đó, tránh chạy sync lặp lại vô tận
  const prevOnlineRef = useRef(window.navigator.onLine);

  // 1. Hàm đồng bộ cốt lõi
  const syncEverything = useCallback(async (forceUpdateEmployees = false) => {
    if (isSyncing || !window.navigator.onLine) return;

    const db = await dbPromise;
    const unsynced = await db.getAllFromIndex('logs', 'by-synced', 0);
    const currentEmployees = await db.getAll('employees');

    // Chỉ thực sự bật Overlay Sync nếu có dữ liệu cần xử lý
    const needsSync = unsynced.length > 0 || currentEmployees.length === 0 || forceUpdateEmployees;
    if (!needsSync) return;

    setIsSyncing(true);
    try {
      // A. Cập nhật nhân viên (Nếu máy trống hoặc được yêu cầu)
      if (currentEmployees.length === 0 || forceUpdateEmployees) {
        const employees = await mockApi.fetchEmployees();
        const txEmp = db.transaction('employees', 'readwrite');
        await txEmp.store.clear();
        for (const e of employees) await txEmp.store.put(e);
        await txEmp.done;
      }

      // B. Đẩy logs chưa đồng bộ
      if (unsynced.length > 0) {
        const res = await mockApi.syncLogs(unsynced);
        if (res.success) {
          const txLog = db.transaction('logs', 'readwrite');
          for (const log of unsynced) {
            await txLog.store.put({ ...log, synced: 1 });
          }
          await txLog.done;
        }
      }
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // 2. Kiểm tra Internet thực tế qua Google DNS
  const checkRealStatus = useCallback(async () => {
    if (!window.navigator.onLine) {
      setOnline(false);
      return;
    }
    try {
      const start = Date.now();
      const response = await fetch(`https://dns.google/resolve?name=google.com&t=${start}`, { 
        method: 'GET',
        cache: 'no-store'
      });
      if (response.ok) {
        setRtt(Date.now() - start);
        setOnline(true);
      } else {
        setOnline(false);
      }
    } catch {
      setOnline(false);
    }
  }, []);

  // 3. Hàm tải lịch sử (Đã thêm lại để sửa lỗi của bạn)
  const loadHistory = async () => {
    const db = await dbPromise;
    const logs = await db.getAll('logs');
    const emps = await db.getAll('employees');
    const enriched = logs.map(log => ({
      ...log,
      empName: emps.find(e => e.employeeId === log.employeeId)?.fullName || "Unknown"
    }));
    setHistory(enriched.sort((a, b) => b.timestamp - a.timestamp));
    setShowLogs(true);
  };

  // Watcher: Chỉ kích hoạt Sync khi trạng thái chuyển từ Offline -> Online
  useEffect(() => {
    if (online && !prevOnlineRef.current) {
      syncEverything(true); 
    }
    prevOnlineRef.current = online;
  }, [online, syncEverything]);

  useEffect(() => {
    const handleHardwareChange = () => {
      if (!window.navigator.onLine) setOnline(false);
      else checkRealStatus();
    };

    window.addEventListener('online', handleHardwareChange);
    window.addEventListener('offline', handleHardwareChange);
    const interval = setInterval(checkRealStatus, 5000);
    
    // Lần đầu mở app: sync nếu cần
    syncEverything(); 

    return () => {
      window.removeEventListener('online', handleHardwareChange);
      window.removeEventListener('offline', handleHardwareChange);
      clearInterval(interval);
    };
  }, [checkRealStatus, syncEverything]);

  const handleAction = async (type: 'IN' | 'OUT') => {
    if (isSyncing || pin.length < 5) return;
    const db = await dbPromise;
    const emp = await db.getFromIndex('employees', 'by-pin', pin);
    
    if (emp) {
      await db.add('logs', { 
        employeeId: emp.employeeId, 
        timestamp: Date.now(), 
        type, 
        synced: 0 
      });
      alert(`[${type}] THÀNH CÔNG: ${emp.fullName}`);
      setPin('');
      // Nếu đang online, gửi cái log này lên luôn
      if (online) syncEverything(); 
    } else {
      alert("Mã PIN không chính xác!");
      setPin('');
    }
  };

  return (
    <div className="app-viewport dark">
      {/* Overlay chỉ hiện khi thực sự có quá trình đồng bộ diễn ra */}
      <div className={`sync-overlay-full ${isSyncing ? 'visible' : ''}`}>
        <div className="sync-card">
          <div className="spinner-large"></div>
          <h2>Đang đồng bộ</h2>
          <p>Hệ thống đang cập nhật dữ liệu...</p>
        </div>
      </div>

      <div className={`network-status ${online ? (rtt && rtt > 1500 ? 'weak' : 'online') : 'offline'}`}>
        {online ? (rtt && rtt > 1500 ? '⚠ Mạng yếu' : '● Trực tuyến') : '○ Ngoại tuyến'}
      </div>
      
      <button className="log-trigger" onClick={loadHistory}>📋 Lịch sử</button>

      <div className="kiosk-card">
        <div className="display-area">
          <div className="pin-dots">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={pin.length > i ? 'active' : ''}></span>
            ))}
          </div>
        </div>

        <div className="numpad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map((key) => (
            <button key={key} className="num-btn" onClick={() => {
              if (key === 'C') setPin('');
              else if (key === '⌫') setPin(p => p.slice(0, -1));
              else if (pin.length < 5) setPin(p => p + key.toString());
            }}>{key}</button>
          ))}
        </div>

        <div className="action-buttons">
          <button className="btn-in" onClick={() => handleAction('IN')} disabled={pin.length < 5}>CHECK IN</button>
          <button className="btn-out" onClick={() => handleAction('OUT')} disabled={pin.length < 5}>CHECK OUT</button>
        </div>
      </div>

      {showLogs && (
        <div className="modal-overlay" onClick={() => setShowLogs(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Dữ liệu Logs trong máy</h3>
              <button onClick={() => setShowLogs(false)}>✕</button>
            </div>
            <div className="modal-body">
              <table>
                <thead>
                  <tr><th>Nhân viên</th><th>Loại</th><th>Thời gian</th><th>Sync</th></tr>
                </thead>
                <tbody>
                  {history.map(log => (
                    <tr key={log.timestamp}>
                      <td style={{ fontWeight: '600' }}>{log.empName}</td>
                      <td><span className={`badge ${log.type}`}>{log.type}</span></td>
                      <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td>{log.synced ? '✅' : '⏳'}</td>
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
