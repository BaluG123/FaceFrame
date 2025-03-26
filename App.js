import { StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';

const App = () => {
  const frameWidth = 300;
  const frameHeight = 400;
  
  const device = useCameraDevice('front');
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
      console.log(frame,'@frame')
      const faces = detectFaces(frame);
      console.log(faces,'####')
      
      // Check if faces array exists and has at least one face
      if (!faces || faces.length === 0) {
        setInstruction('No face detected');
        return;
      }

      const singleFace = faces[0];

      console.log(singleFace,'###')
      
      // Check if face object and bounds exist
      if (!singleFace || !singleFace.bounds) {
        setInstruction('Face detection error');
        return;
      }

      const faceBounds = singleFace.bounds;
      
      // Check if all required properties exist
      if (typeof faceBounds.x === 'undefined' || 
          typeof faceBounds.y === 'undefined' ||
          typeof faceBounds.width === 'undefined' ||
          typeof faceBounds.height === 'undefined') {
        setInstruction('Adjusting detection...');
        return;
      }

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
      
      // Check if face is centered enough (20% margin)
      const isCentered = centerOffsetX < (frameWidth * 0.2) && centerOffsetY < (frameHeight * 0.2);
      
      // Check if face is the right size
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
    <View style={{ flex: 1, backgroundColor: 'black' }}>
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
          
          <View style={[styles.overlay, { 
            width: frameWidth, 
            height: frameHeight,
            marginLeft: -frameWidth/2,
            marginTop: -frameHeight/2
          }]}>
            <View style={styles.frameBorder} />
          </View>
          
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
  instructionContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameBorder: {
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderColor: 'white',
    borderRadius: 10,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
  },
});

export default App;