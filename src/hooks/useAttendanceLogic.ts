import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { dbPromise, type Employee, type AttendanceLog } from '../services/db';

export const useAttendanceLogic = () => {
  const [pin, setPin] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [currentEmp, setCurrentEmp] = useState<Employee | null>(null);
  
  // Vẫn giữ actionType ở đây để KioskPage sử dụng thông qua setActionType
  const [actionType, setActionType] = useState<'IN' | 'OUT'>('IN');
  
  const queryClient = useQueryClient();

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) setPin(prev => prev + num);
  };

  const handleDelete = () => setPin(prev => prev.slice(0, -1));

  // HÀM MỚI: Chỉ verify mã PIN, không tự mở camera
  const handleVerify = async (): Promise<boolean> => {
    if (pin.length < 4) {
      toast.error('Mã PIN quá ngắn');
      return false;
    }

    const db = await dbPromise;
    const emp = await db.getFromIndex('employees', 'by-pin', pin);
    
    if (emp) {
      setCurrentEmp(emp);
      // Mặc định reset về 'IN' mỗi lần verify mới hoặc giữ nguyên tùy bạn
      setActionType('IN'); 
      setPin(''); 
      return true; // Trả về true để KioskPage biết và mở Popup xác nhận
    } else {
      toast.error('Sai mã PIN');
      setPin('');
      return false;
    }
  };

  const handleConfirmAttendance = useCallback(async (photo: string, timestamp: number) => {
    if (!currentEmp) return;

    const newLog: AttendanceLog = {
      id: crypto.randomUUID(),
      employeeId: currentEmp.employeeId,
      timestamp: timestamp,
      type: actionType, // Sử dụng giá trị IN/OUT đã chọn trong Popup
      photo: photo,
      synced: 0,
    };

    const db = await dbPromise;
    await db.add('logs', newLog);
    
    setShowCamera(false);
    toast.info(`Đã ghi nhận ${actionType} cho ${currentEmp.fullName}`);
    
    queryClient.invalidateQueries({ queryKey: ['ATTENDANCE_LOGS'] });
    setCurrentEmp(null);
  }, [currentEmp, actionType, queryClient]);

  return { 
    pin, 
    showCamera, 
    currentEmp, 
    actionType, // Trả về để KioskPage binding vào nút IN/OUT trong Popup
    setActionType, // Trả về để KioskPage thay đổi khi người dùng nhấn chọn
    handleNumberClick, 
    handleDelete, 
    handleVerify, 
    handleConfirmAttendance, 
    setShowCamera,
    setPin
  };
};
