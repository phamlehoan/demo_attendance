import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Button, Typography, Stack } from '@mui/material';
import './styles.scss';

interface CameraModalProps {
  isOpen: boolean;
  empName: string;
  onConfirm: (photoBase64: string) => void;
  onCancel: () => void;
}

export const CameraModal = ({ isOpen, empName, onConfirm, onCancel }: CameraModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // 1. Tạo biến cục bộ để giữ tham chiếu của ref tại thời điểm effect chạy
    const currentVideoRef = videoRef.current;

    if (isOpen) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.error("Camera error:", err));
    }

    // 2. Hàm cleanup sử dụng biến cục bộ thay vì videoRef.current
    return () => {
      if (currentVideoRef && currentVideoRef.srcObject) {
        const stream = currentVideoRef.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        currentVideoRef.srcObject = null;
      }
    };
  }, [isOpen]); // Effect chạy lại mỗi khi isOpen thay đổi

  const handleCapture = () => {
    const canvas = document.createElement("canvas");
    if (videoRef.current) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.translate(canvas.width, 0); ctx?.scale(-1, 1);
      ctx?.drawImage(videoRef.current, 0, 0);
      onConfirm(canvas.toDataURL("image/jpeg"));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Box className="camera-modal-overlay">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="modal-body"
          >
            <div className="video-container">
              <video ref={videoRef} autoPlay playsInline />
              <div className="scan-line" />
            </div>
            <Typography variant="h6" align="center" color="white" sx={{ my: 2 }}>{empName}</Typography>
            <Stack direction="row" spacing={2}>
              <Button fullWidth variant="contained" onClick={handleCapture}>XÁC NHẬN</Button>
              <Button fullWidth variant="outlined" color="inherit" onClick={onCancel}>HỦY</Button>
            </Stack>
          </motion.div>
        </Box>
      )}
    </AnimatePresence>
  );
};
