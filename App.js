import React, { StyleSheet, Text, View, TouchableOpacity, Platform, Dimensions, Alert } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import { PermissionsAndroid } from "react-native";
import ImagePicker from 'react-native-image-crop-picker';

const App = () => {
  const frameSize = 350; // dp size of the frame
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const device = useCameraDevice('front');
  const camera = useRef(null);
  const [instruction, setInstruction] = useState('Fit your face in the frame');
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [hasStoragePermission, setHasStoragePermission] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [permissionError, setPermissionError] = useState('');

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const cameraPermission = await Camera.requestCameraPermission();
      setHasCameraPermission(cameraPermission === 'granted');

      let storagePermissionGranted = true;
      if (Platform.OS === 'android') {
        storagePermissionGranted = await requestAndroidStoragePermission();
      }
      setHasStoragePermission(storagePermissionGranted);

      if (cameraPermission !== 'granted') {
        setPermissionError('Camera permission denied');
      } else if (!storagePermissionGranted) {
        setPermissionError('Storage permission denied');
      } else {
        setPermissionError('');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setPermissionError(`Permission error: ${error.message}`);
      Alert.alert('Permission Error', `Failed to request permissions: ${error.message}`);
    }
  };

  async function requestAndroidStoragePermission() {
    try {
      if (Platform.Version >= 33) {
        const permissions = [PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES];
        const statuses = await PermissionsAndroid.requestMultiple(permissions);
        return statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === 'granted';
      } else if (Platform.Version >= 29) {
        const readPermission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        return readPermission === PermissionsAndroid.PERMISSIONS.GRANTED;
      } else {
        const statuses = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);
        return statuses[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === 'granted' &&
               statuses[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === 'granted';
      }
    } catch (error) {
      console.error('Error requesting Android storage permissions:', error);
      return false;
    }
  }

  const capturePhoto = async () => {
    if (isSaving || !camera.current) {
      if (isSaving) console.log('Already saving...');
      if (!camera.current) console.error('Camera ref is null!');
      return;
    }

    setIsSaving(true);
    setInstruction('Capturing...');

    try {
      // 1. Capture Full Photo
      const photoOptions = {
        qualityPrioritization: 'speed',
        flash: 'off',
      };
      const photo = await camera.current.takePhoto(photoOptions);
      console.log('Photo captured:', `Path: ${photo.path}, W: ${photo.width}, H: ${photo.height}, Orientation: ${photo.orientation}`);

      // 2. Calculate Crop Region (only the 350x350 frame)
      const photoWidth = photo.width;
      const photoHeight = photo.height;
      const frameX_dp = (screenWidth - frameSize) / 2; // Left edge of frame in dp
      const frameY_dp = (screenHeight - frameSize) / 2; // Top edge of frame in dp

      // Calculate scale factors based on photo and screen dimensions
      let scaleX = photoWidth / screenWidth;
      let scaleY = photoHeight / screenHeight;
      const screenAR = screenWidth / screenHeight;
      const photoAR = photoWidth / photoHeight;

      let previewCroppedX_pixels = 0;
      let previewCroppedY_pixels = 0;

      // Adjust for aspect ratio differences
      if (photoAR > screenAR) {
        // Photo wider than screen: height matches, width cropped
        scaleX = photoHeight / screenHeight;
        scaleY = photoHeight / screenHeight;
        const effectivePhotoWidthInPreview = photoWidth * (screenHeight / photoHeight);
        previewCroppedX_pixels = (effectivePhotoWidthInPreview - screenWidth) / 2 * scaleX;
      } else if (photoAR < screenAR) {
        // Photo taller than screen: width matches, height cropped
        scaleX = photoWidth / screenWidth;
        scaleY = photoWidth / screenWidth;
        const effectivePhotoHeightInPreview = photoHeight * (screenWidth / photoWidth);
        previewCroppedY_pixels = (effectivePhotoHeightInPreview - screenHeight) / 2 * scaleY;
      }

      // Convert frame coordinates from dp to pixels
      const cropX = Math.max(0, Math.floor((frameX_dp * scaleX) + previewCroppedX_pixels));
      const cropY = Math.max(0, Math.floor((frameY_dp * scaleY) + previewCroppedY_pixels));
      const cropWidth = Math.floor(frameSize * scaleX);
      const cropHeight = Math.floor(frameSize * scaleY);

      // Ensure crop stays within photo bounds
      const adjustedCropWidth = Math.min(cropWidth, photoWidth - cropX);
      const adjustedCropHeight = Math.min(cropHeight, photoHeight - cropY);

      if (cropX + adjustedCropWidth > photoWidth || cropY + adjustedCropHeight > photoHeight) {
        console.warn('Crop region adjusted to fit photo bounds:', {
          cropX, cropY, adjustedCropWidth, adjustedCropHeight, photoWidth, photoHeight
        });
      }

      console.log('Cropping frame content:', {
        path: `file://${photo.path}`,
        cropX, cropY,
        width: adjustedCropWidth,
        height: adjustedCropHeight
      });
      setInstruction('Processing...');

      // 3. Crop to just the frame content
      const croppedImage = await ImagePicker.openCropper({
        path: `file://${photo.path}`,
        width: adjustedCropWidth,    // Exact pixel width of frame area
        height: adjustedCropHeight,  // Exact pixel height of frame area
        cropperCircleOverlay: false,
        cropping: true,
        showCropGuidelines: false,
        showCropFrame: false,
        hideBottomControls: true,
        enableRotationGesture: false,
        freeStyleCropEnabled: false,
        compressImageQuality: 1.0,   // No compression
        cropperToolbarTitle: '',     // Hide toolbar
        cropperChooseText: '',       // Hide buttons
        cropperCancelText: '',       // Hide buttons
        includeBase64: false,
      });

      console.log('Cropped image:', `Path: ${croppedImage.path}, W: ${croppedImage.width}, H: ${croppedImage.height}`);
      setInstruction('Saving to gallery...');

      // 4. Save to Camera Roll
      await CameraRoll.save(croppedImage.path, {
        type: 'photo',
        album: 'Camera App'
      });

      setInstruction('Photo saved!');

    } catch (error) {
      console.error('Error capturing or cropping photo:', error);
      setInstruction(`Error: ${error.message}`);
      Alert.alert('Error', `Failed to process photo: ${error.message}`);
    } finally {
      setTimeout(() => {
        setInstruction('Fit your face in the frame');
        setIsSaving(false);
      }, 2000);
    }
  };

  const renderCameraContent = () => {
    if (!hasCameraPermission || !hasStoragePermission) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            {permissionError || 'Camera and storage permissions are required'}
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
            <Text style={styles.permissionButtonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!device) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>No front camera device found</Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          photo={true}
        />

        <View style={styles.darkOverlay}>
          <View style={styles.darkArea} />
          <View style={styles.middleRow}>
            <View style={styles.darkArea} />
            <View style={styles.frameVisualGuide}>
              <View style={styles.frameBorder} />
            </View>
            <View style={styles.darkArea} />
          </View>
          <View style={styles.darkArea} />
        </View>

        <TouchableOpacity
          style={styles.captureButton}
          onPress={capturePhoto}
          disabled={isSaving}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>{instruction}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      {renderCameraContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  darkArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: '100%',
  },
  middleRow: {
    flexDirection: 'row',
    height: 350,
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  frameVisualGuide: {
    width: 350,
    height: 350,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  frameBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderColor: 'white',
    borderRadius: 10,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    textAlign: 'center',
    overflow: 'hidden',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    padding: 20,
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  captureButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
});

export default App;