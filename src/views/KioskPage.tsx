import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useAttendanceLogic } from '../hooks/useAttendanceLogic';
import { useSyncAttendance } from '../queries/useSyncAttendance';
import { db } from '../db/db';
import { CameraModal } from '../components/CameraModal';
import { FiLogIn, FiLogOut, FiCamera, FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';
import './KioskPage.scss';
import { TkEmployeeAttendanceType } from '../types';
import { TimeService } from '../services';

export const KioskPage = () => {
  const queryClient = useQueryClient();
  
  // UI States
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isPinVisible, setIsPinVisible] = useState<boolean>(false);
  const [tick, setTick] = useState<number | null>(null);

  // Redux & Logic hooks
  // Note: Added rtt from kiosk state
  const { online, offset, rtt } = useSelector((state: RootState) => state.kiosk);
  const [currentTime, setCurrentTime] = useState(TimeService.getCurrent());

  // Hiệu ứng chạy đồng hồ mỗi giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(TimeService.getCurrent());
    }, 1000);
    return () => clearInterval(timer);
  }, [offset]);

  // Restore Synchronization logic
  const { mutate: syncNow, isPending: isSyncing } = useSyncAttendance();

  const { 
    pin, setPin, showCamera, setShowCamera, 
    currentEmp, actionType, setActionType, 
    handleNumberClick, handleVerify, handleConfirmAttendance 
  } = useAttendanceLogic();

  // History query
  const { data: history = [] } = useQuery({
    queryKey: ['ATTENDANCE_LOGS'],
    queryFn: () => db.attendances.orderBy('id').reverse().limit(50).toArray()
  });

  // Time management
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (showConfirmModal) {
      const update = () => setTick(new Date().getTime());
      update();
      timer = setInterval(update, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
      setTick(null);
    };
  }, [showConfirmModal]);

  const displayTimeFormatted = tick !== null 
    ? new Date(tick + offset).toLocaleString('en-US') 
    : "";

  // Auto-sync when online status changes to true
  useEffect(() => { 
    if (online) syncNow(); 
  }, [online, syncNow]);

  const handleOkClick = async () => {
    if (pin.length < 6) return;
    const isSuccess = await handleVerify(); 
    if (isSuccess) {
      setShowConfirmModal(true);
      setIsPinVisible(false);
    }
  };

  return (
    <div className="app-viewport dark">
      {/* RESTORED: Full-screen Syncing Overlay */}
      {isSyncing && (
        <div className="sync-overlay-full">
          <div className="sync-card">
            <div className="spinner-large"></div>
            <h2>Synchronizing...</h2>
          </div>
        </div>
      )}

      <header className="kiosk-header">
        {/* RESTORED: Detailed Network Status Logic */}
        <div className="network-info">
          {!online ? (
            <span className="status-label offline">○ Offline</span>
          ) : (
            <span className={`status-label ${(rtt ?? 0) > 500 ? 'weak' : 'online'}`}>
              {(rtt ?? 0) > 500 ? '⚠️ Weak Connection' : '● Online'} 
              {rtt !== null && ` (${rtt}ms)`}
            </span>
          )}
        </div>

        {/* CHÍNH GIỮA: Server Clock */}
        <div className="server-clock-center">
          <div className="time">
            {dayjs(currentTime).format('HH:mm:ss')}
          </div>
          <div className="date">
            {dayjs(currentTime).format('ddd, DD/MM/YYYY')}
          </div>
        </div>

        <button className="log-trigger" onClick={() => setShowLogs(true)}>
          📋 Attendance History
        </button>
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
                disabled={k === 'OK' && pin.length < 6}
                className={`num-btn ${k === 'OK' ? 'btn-ok' : ''} ${k === 'C' ? 'btn-clear' : ''}`} 
                onClick={async () => {
                  if (k === 'C') setPin('');
                  else if (k === 'OK') await handleOkClick();
                  else handleNumberClick(k.toString());
                }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && currentEmp && (
        <div className="modal-overlay">
          <div className="modal-content confirm-modal">
            <div className="user-info">
              <h2>Welcome, {currentEmp.fullName}</h2>
              <p className="current-time">{displayTimeFormatted}</p>
            </div>
            <div className="type-selector">
              <button className={`type-btn in ${actionType === TkEmployeeAttendanceType.CHECK_IN ? 'selected' : ''}`} onClick={() => setActionType(TkEmployeeAttendanceType.CHECK_IN)}>
                <FiLogIn /> CLOCK IN
              </button>
              <button className={`type-btn out ${actionType === TkEmployeeAttendanceType.CHECK_OUT ? 'selected' : ''}`} onClick={() => setActionType(TkEmployeeAttendanceType.CHECK_OUT)}>
                <FiLogOut /> CLOCK OUT
              </button>
            </div>
            <button 
              className="btn-record" 
              disabled={!actionType}
              onClick={() => { setShowConfirmModal(false); setShowCamera(true); }}
            >
              <FiCamera /> TAKE PHOTO
            </button>
            <button className="btn-back" onClick={() => setShowConfirmModal(false)}>
              <FiArrowLeft /> BACK
            </button>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <CameraModal 
          isOpen={showCamera}
          empName={currentEmp?.fullName || ''}
          onConfirm={async (photo: string) => {
            await handleConfirmAttendance(photo);
            // Trigger sync immediately after attendance is recorded
            syncNow();
            queryClient.invalidateQueries({ queryKey: ['ATTENDANCE_LOGS'] });
          }}
          onCancel={() => setShowCamera(false)}
        />
      )}

      {/* History Modal */}
      {showLogs && (
        <div className="modal-overlay" onClick={() => setShowLogs(false)}>
          <div className="modal-content log-modal" onClick={e => e.stopPropagation()}>
             <div className="modal-header">
               <h3>Attendance History</h3>
               <button className="close-btn" onClick={() => setShowLogs(false)}>✕</button>
             </div>
             <div className="modal-body scrollable-area">
               <table className="log-table">
                 <thead>
                   <tr>
                     <th>Employee</th>
                     <th>Type</th>
                     <th>Time</th>
                     <th>Photo</th>
                     <th>Status</th>
                     <th>Sync At</th>
                   </tr>
                 </thead>
                 <tbody>
                   {history.map((h) => (
                     <tr key={h.id}>
                       <td>{h.pin}</td> 
                       <td><span className={`badge ${h.type}`}>{h.type}</span></td>
                       <td>{new Date(h.checkedTime).toLocaleTimeString('en-US')}</td>
                       <td>
                        {h.imageCapture && (
                          <img src={h.imageCapture} alt="capture" className="log-thumb" width="40" />
                        )}
                       </td>
                       <td>{h.synced === 1 ? '✅ Synced' : '⏳ Pending'}</td>
                       <td>
                        {h.syncedAt ? new Date(h.syncedAt).toLocaleString('en-US') : '-'}
                       </td>
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
