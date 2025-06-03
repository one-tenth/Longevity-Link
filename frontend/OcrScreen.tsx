import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

export default function CameraScreen() {
  const navigation = useNavigation();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: '需要相機權限',
            message: '我們需要你的許可來使用相機功能',
            buttonNeutral: '稍後再問',
            buttonNegative: '拒絕',
            buttonPositive: '允許',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('權限請求錯誤:', err);
        return false;
      }
    } else {
      return true;
    }
  };

  const uploadImageToBackend = async (uri: string) => {
    const formData = new FormData();
    formData.append('image', {
      uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    try {
      setLoading(true);
      const response = await axios.post('http://172.20.10.5:8000/api/ocr/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigation.navigate('Result', {
        ocrResult: response.data.text,
        analysisResult: response.data.analysis,
        photoUri: uri,  // 傳送照片 URI
      });

      setPhotoUri(null);
    } catch (error: any) {
      console.error('上傳錯誤:', error?.message ?? error);
      Alert.alert('上傳或辨識錯誤', error?.message ?? '請確認後端服務');
    } finally {
      setLoading(false);
    }
  };

  const openCamera = async () => {
    if (loading) return;

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('權限不足', '請到設定開啟相機權限');
      return;
    }

    launchCamera(
      { mediaType: 'photo', saveToPhotos: true },
      async response => {
        if (response.didCancel) {
          console.log('使用者取消拍照');
        } else if (response.errorCode) {
          console.warn('相機錯誤:', response.errorMessage);
        } else if (response.assets && response.assets.length > 0) {
          const uri = response.assets[0].uri;
          setPhotoUri(uri ?? null);
          if (uri) {
            await uploadImageToBackend(uri);
          }
        }
      },
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={openCamera}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? '辨識中...' : '拍照並辨識'}</Text>
      </TouchableOpacity>

      {photoUri && <Image source={{ uri: photoUri }} style={styles.previewImage} />}
      {loading && <ActivityIndicator size="large" color="#007aff" style={{ marginTop: 20 }} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  button: {
    backgroundColor: '#007aff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    width: '80%',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  buttonText: { color: 'white', fontSize: 16 },
  previewImage: {
    width: 300,
    height: 300,
    borderRadius: 8,
    marginVertical: 16,
  },
});
