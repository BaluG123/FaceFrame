import { StyleSheet, Text, View } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { Camera, useCameraDevice, useFrameProcessor,runOnJS } from 'react-native-vision-camera';
import { Face, useFaceDetector } from 'react-native-vision-camera-face-detector';

const App = () => {
  const frameWidth = 200;
  const frameHeight = 250;
  
  const device = useCameraDevice('front');
  const { detectFaces } = useFaceDetector();
  const [instruction, setInstruction] = useState('Fit your face in the frame.');
  const [hasPermission, setHasPermission] = useState(false);

  // Add this useEffect for camera permission
  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermission();
      setHasPermission(cameraPermission === 'granted');
    })();
  }, []);

  const checkIfFaceFits = (faceBounds, frameWidth = 200, frameHeight = 250) => {
    'worklet';
    // Get the center coordinates of the frame
    const frameCenterX = frameWidth / 2;
    const frameCenterY = frameHeight / 2;
    
    // Calculate the face center point
    const faceCenterX = faceBounds.x + faceBounds.width / 2;
    const faceCenterY = faceBounds.y + faceBounds.height / 2;
    
    // Calculate distance between centers
    const centerOffsetX = Math.abs(faceCenterX - frameCenterX);
    const centerOffsetY = Math.abs(faceCenterY - frameCenterY);
    
    // Calculate percentage of frame filled by face
    const faceArea = faceBounds.width * faceBounds.height;
    const frameArea = frameWidth * frameHeight;
    const fillPercentage = faceArea / frameArea;
    
    // Check if face is centered enough
    const isCentered = centerOffsetX < (frameWidth * 0.15) && centerOffsetY < (frameHeight * 0.15);
    
    // Check if face is the right size (not too big or too small)
    const isRightSize = fillPercentage > 0.3 && fillPercentage < 0.8;
    
    // Check if face is mostly contained within the frame
    const faceLeft = faceBounds.x;
    const faceRight = faceBounds.x + faceBounds.width;
    const faceTop = faceBounds.y;
    const faceBottom = faceBounds.y + faceBounds.height;
    
    const isContained = 
      faceLeft > 0 - (faceBounds.width * 0.1) &&
      faceRight < frameWidth + (faceBounds.width * 0.1) &&
      faceTop > 0 - (faceBounds.height * 0.1) &&
      faceBottom < frameHeight + (faceBounds.height * 0.1);
    
    // Face fits if it's centered, the right size, and mostly contained
    return isCentered && isRightSize && isContained;
  };

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    // Removed the runAsync wrapper
    const faces = detectFaces(frame);
    const singleFace = faces.length > 0 ? faces[0] : null;
    
    if (singleFace) {
      // Implement face fitting logic here based on singleFace.bounds and overlay dimensions
      const isFaceFitted = checkIfFaceFits(singleFace.bounds);
      
      if (isFaceFitted) {
        runOnJS(setInstruction)('Good fit!');
      } else {
        runOnJS(setInstruction)('Adjust your position.');
      }
    } else {
      runOnJS(setInstruction)('No face detected.');
    }
  }, [detectFaces]);

  return (
    <View style={{ flex: 1 }}>
      {!hasPermission ? (
        <View style={styles.permissionContainer}>
          <Text>Camera permission is required.</Text>
        </View>
      ) : device != null ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          frameProcessor={frameProcessor}
        />
      ) : (
        <Text>No camera device found.</Text>
      )}
      
      {hasPermission && device && (
        <>
          <View style={[styles.overlay, { width: frameWidth, height: frameHeight }]}>
            <View style={styles.frameBorder} />
          </View>
          
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>{instruction}</Text>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  instructionContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  overlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -100, // frameWidth/2
    marginTop: -125, // frameHeight/2
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameBorder: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;