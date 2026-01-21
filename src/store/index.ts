import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { KioskState } from '../types';

const initialState: KioskState = {
  online: window.navigator.onLine,
  offset: Number(localStorage.getItem('server_time_offset')) || 0,
  rtt: null as number | null,
};

const kioskSlice = createSlice({
  name: 'kiosk',
  initialState,
  reducers: {
    setNetworkInfo: (state, action: PayloadAction<{ online: boolean; offset: number, rtt: number | null }>) => {
      state.online = action.payload.online;
      state.offset = action.payload.offset;
      state.rtt = action.payload.rtt;
    }
  }
});

export const { setNetworkInfo } = kioskSlice.actions;
export const store = configureStore({ reducer: { kiosk: kioskSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
