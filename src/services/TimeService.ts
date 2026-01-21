import { store } from '../store';

export const TimeService = {
  /**
    * Tính toán thời gian thực tế dựa trên Offset từ Server
    * Trả về số miligiây (number) để lưu vào Dexie cho nhẹ và chuẩn Type
    */
  getCurrent(): number {
    const { offset } = store.getState().kiosk;
    return Date.now() + offset;
  },
}