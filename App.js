import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const frameWidth = 350;
const frameHeight = 350;
const frameLeft = (screenWidth - frameWidth) / 2;
const frameTop = (screenHeight - frameHeight) / 2;
const frameRight = frameLeft + frameWidth;
const frameBottom = frameTop + frameHeight;

const App = () => {
  const device = useCameraDevice('front');
  console.log(device, '##');
  const { detectFaces } = useFaceDetector();
  const [instruction, setInstruction] = useState('Fit your face in the frame');
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermission();
      setHasPermission(cameraPermission === 'granted');
    })();
  }, []);

  const frameProcessor = (frame) => {
    try {
      console.log(frame, '@frame');
      const faces = detectFaces(frame);
      console.log(faces, '####');

      if (!faces || faces.length === 0) {
        setInstruction('No face detected');
        return;
      }

      const singleFace = faces[0];
      console.log(singleFace, '###');

      if (!singleFace || !singleFace.bounds) {
        setInstruction('Face detection error');
        return;
      }

      const faceBounds = singleFace.bounds;

      if (typeof faceBounds.x === 'undefined' ||
          typeof faceBounds.y === 'undefined' ||
          typeof faceBounds.width === 'undefined' ||
          typeof faceBounds.height === 'undefined') {
        setInstruction('Adjusting detection...');
        return;
      }

      const frameCenterX = frameWidth / 2;
      const frameCenterY = frameHeight / 2;

      const faceCenterX = faceBounds.x + faceBounds.width / 2;
      const faceCenterY = faceBounds.y + faceBounds.height / 2;

      const centerOffsetX = Math.abs(faceCenterX - frameCenterX);
      const centerOffsetY = Math.abs(faceCenterY - frameCenterY);

      const faceArea = faceBounds.width * faceBounds.height;
      const frameArea = frameWidth * frameHeight;
      const fillPercentage = faceArea / frameArea;

      const isCentered = centerOffsetX < (frameWidth * 0.2) && centerOffsetY < (frameHeight * 0.2);
      const isRightSize = fillPercentage > 0.25 && fillPercentage < 0.7;

      if (isCentered && isRightSize) {
        setInstruction('Perfect! Hold still');
      } else if (!isCentered) {
        setInstruction('Move to center');
      } else if (fillPercentage <= 0.25) {
        setInstruction('Move closer');
      } else {
        setInstruction('Move back');
      }
    } catch (error) {
      console.error('Face detection error:', error);
      setInstruction('Detection error');
    }
  };

  return (
    <View style={styles.container}>
      {!hasPermission ? (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission is required</Text>
        </View>
      ) : device != null ? (
        <>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            frameProcessor={frameProcessor}
          />

          {/* Top overlay: covers from top of screen to the top of the frame */}
          <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: frameTop }]} />

          {/* Bottom overlay: covers from the bottom of the frame to the bottom of the screen */}
          <View style={[styles.overlay, { top: frameBottom, left: 0, right: 0, bottom: 0 }]} />

          {/* Left overlay: covers from left of screen to the left edge of the frame */}
          <View style={[styles.overlay, { top: frameTop, left: 0, width: frameLeft, height: frameHeight }]} />

          {/* Right overlay: covers from right edge of the frame to the right of the screen */}
          <View style={[styles.overlay, { top: frameTop, right: 0, width: screenWidth - frameRight, height: frameHeight }]} />

          {/* Frame border (the visible clear area) */}
          <View style={[styles.frameContainer, {
            width: frameWidth,
            height: frameHeight,
            left: frameLeft,
            top: frameTop,
          }]}>
            <View style={styles.frameBorder} />
          </View>

          {/* Instruction text */}
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>{instruction}</Text>
          </View>
        </>
      ) : (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>No camera device found</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 1,
  },
  frameContainer: {
    position: 'absolute',
    borderRadius: 10,
    zIndex: 2,
  },
  frameBorder: {
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderColor: 'white',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 3,
  },
  instructionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    textAlign: 'center',
    maxWidth: '80%',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
  },
});

export default App;
