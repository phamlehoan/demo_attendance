import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Button, Typography, Stack } from '@mui/material';
import './styles.scss';
import type { CameraModalProps } from '../../types';

export const CameraModal = ({ isOpen, empName, onConfirm, onCancel }: CameraModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isOpen) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then(s => { stream = s; if (videoRef.current) videoRef.current.srcObject = s; });
    }
    return () => stream?.getTracks().forEach(t => t.stop());
  }, [isOpen]);

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
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="modal-body">
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
