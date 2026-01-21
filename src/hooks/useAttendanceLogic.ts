import { useState } from "react";
import { SyncService } from "../services";
import { toast } from "react-toastify";
import type { LocalEmployee, TkEmployeeAttendanceType } from "../types";

export const useAttendanceLogic = () => {
  const [pin, setPin] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [currentEmp, setEmp] = useState<LocalEmployee | null>(null);
  const [actionType, setActionType] = useState<TkEmployeeAttendanceType | null>(
    null,
  );

  const handleNumberClick = (val: string) => {
    if (pin.length < 6) setPin((p) => p + val);
  };

  const handleVerify = async () => {
    const emp = await SyncService.getEmployeeByPin(pin);
    if (emp) {
      setEmp(emp);
      return true;
    }
    toast.error("Mã PIN không đúng");
    setPin("");
    return false;
  };

  const handleConfirmAttendance = async (photo: string) => {
    if (!currentEmp || !actionType) return;

    try {
      // actionType lúc này đã là TkEmployeeAttendanceType.CHECK_IN / CHECK_OUT từ UI
      await SyncService.saveAttendance(
        currentEmp.employeeId,
        currentEmp.pin,
        actionType as TkEmployeeAttendanceType,
        photo,
      );

      // Thông báo thành công, đóng camera, v.v.
      setShowCamera(false);
      setPin("");
    } catch (error) {
      console.error("Lỗi lưu DB:", error);
    }
  };

  return {
    pin,
    setPin,
    showCamera,
    setShowCamera,
    currentEmp,
    actionType,
    setActionType,
    handleNumberClick,
    handleVerify,
    handleConfirmAttendance,
  };
};
