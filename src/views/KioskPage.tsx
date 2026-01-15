import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAttendanceLogic } from '../hooks/useAttendanceLogic';
import { CameraModal } from '../components';
import { attendanceQueries } from '../queries/attendanceQueries';
import { type AttendanceDisplayLog } from '../types/attendance';
import { FiLogIn, FiLogOut, FiCamera, FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';
import './KioskPage.scss';

export const KioskPage = () => {
  const queryClient = useQueryClient();
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isPinVisible, setIsPinVisible] = useState<boolean>(false);

  const { online, rtt, isSyncing, getMonotonicTime, syncEverything } = useNetworkStatus();
  const { 
    pin, showCamera, currentEmp, actionType,
    handleNumberClick, handleVerify, 
    handleConfirmAttendance, setShowCamera, setPin, setActionType 
  } = useAttendanceLogic();

  // Sử dụng Query tập trung với Type-safe
  const { data: history = [] } = useQuery(attendanceQueries.getHistory);

  useEffect(() => {
    if (!isSyncing) {
      queryClient.invalidateQueries({ queryKey: ['ATTENDANCE_LOGS'] });
    }
  }, [isSyncing, queryClient]);

  const handleOkClick = async () => {
    if (pin.length < 4) return;
    const isSuccess = await handleVerify(); 
    if (isSuccess) {
      setShowConfirmModal(true);
      setIsPinVisible(false);
    }
  };

  return (
    <div className="app-viewport dark">
      {isSyncing && (
        <div className="sync-overlay-full">
          <div className="sync-card">
            <div className="spinner-large"></div>
            <h2>Đang đồng bộ dữ liệu...</h2>
          </div>
        </div>
      )}

      <header className="kiosk-header">
        <div className="network-info">
          {!online ? (
            <span className="status-label offline">○ Ngoại tuyến</span>
          ) : (
            // Kiểm tra RTT để quyết định màu sắc và nội dung label
            <span className={`status-label ${(rtt ?? 0) > 500 ? 'weak' : 'online'}`}>
              {(rtt ?? 0) > 500 ? '⚠️ Mạng yếu' : '● Trực tuyến'} 
              {rtt !== null && ` (${rtt}ms)`}
            </span>
          )}
        </div>
        <button className="log-trigger" onClick={() => setShowLogs(true)}>📋 Lịch sử chấm công</button>
      </header>

      <main className="kiosk-main">
        <div className="kiosk-card">
          <div className="display-area">
            <div className="pin-display-wrapper">
              <div className="pin-dots">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`pin-slot ${pin.length > i ? 'filled' : ''}`}>
                    {pin.length > i ? (isPinVisible ? pin[i] : '●') : ''}
                  </div>
                ))}
              </div>
              <button className="toggle-visibility" onClick={() => setIsPinVisible(!isPinVisible)}>
                {isPinVisible ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className="numpad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map(k => (
              <button 
                key={k} 
                className={`num-btn ${k === 'OK' ? 'btn-ok' : ''} ${k === 'C' ? 'btn-clear' : ''}`} 
                onClick={() => {
                  if (k === 'C') setPin('');
                  else if (k === 'OK') handleOkClick();
                  else handleNumberClick(k.toString());
                }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* CONFIRM MODAL */}
      {showConfirmModal && currentEmp && (
        <div className="modal-overlay">
          <div className="modal-content confirm-modal">
            <div className="user-info">
              <h2>Xin chào, {currentEmp.fullName}</h2>
              <p>{new Date().toLocaleDateString('vi-VN')} | {new Date().toLocaleTimeString('vi-VN')}</p>
            </div>
            <div className="type-selector">
              <button className={`type-btn in ${actionType === 'IN' ? 'selected' : ''}`} onClick={() => setActionType('IN')}>
                <FiLogIn /> Clock In
              </button>
              <button className={`type-btn out ${actionType === 'OUT' ? 'selected' : ''}`} onClick={() => setActionType('OUT')}>
                <FiLogOut /> Clock Out
              </button>
            </div>
            <button className="btn-record" onClick={() => { setShowConfirmModal(false); setShowCamera(true); }}>
              <FiCamera /> Record Your Attendance with Photo
            </button>
            <button className="btn-back" onClick={() => setShowConfirmModal(false)}> <FiArrowLeft /> Back </button>
          </div>
        </div>
      )}

      {/* CAMERA MODAL */}
      {showCamera && (
        <CameraModal 
          isOpen={showCamera}
          empName={currentEmp?.fullName || ''}
          onConfirm={async (photo) => {
            const currentTime = getMonotonicTime();
            await handleConfirmAttendance(photo, currentTime);
            syncEverything();
          }}
          onCancel={() => setShowCamera(false)}
        />
      )}

      {/* LOGS MODAL */}
      {showLogs && (
        <div className="modal-overlay" onClick={() => setShowLogs(false)}>
          <div className="modal-content log-modal" onClick={e => e.stopPropagation()}>
             <div className="modal-header">
               <h3>Lịch sử chấm công</h3>
               <button className="close-btn" onClick={() => setShowLogs(false)}>✕</button>
             </div>
             <div className="modal-body scrollable-area">
               <table className="log-table">
                 <thead>
                   <tr>
                     <th>Nhân viên</th>
                     <th>Loại</th>
                     <th>Thời gian</th>
                     <th>Ảnh</th>
                     <th>Sync</th>
                   </tr>
                 </thead>
                 <tbody>
                   {history.map((h: AttendanceDisplayLog) => (
                     <tr key={h.id || h.timestamp}>
                       <td className="emp-name-cell">{h.empName}</td>
                       <td><span className={`badge ${h.type}`}>{h.type}</span></td>
                       <td className="time-cell">{new Date(h.timestamp).toLocaleTimeString('vi-VN')}</td>
                       <td>{h.photo && <img src={h.photo} className="log-thumb" alt="Log" />}</td>
                       <td className="sync-status">{h.synced === 1 ? '✅' : '⏳'}</td>
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
};
