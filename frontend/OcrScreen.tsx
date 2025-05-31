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
import { useNavigation, useNavigationState } from '@react-navigation/native';

export default function CameraScreen() {
  const navigation = useNavigation();
  const currentRouteName = useNavigationState(state => state.routes[state.index].name);

  console.log('🚀 現在在頁面:', currentRouteName);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 請求相機權限
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
      return true; // iOS 自動處理
    }
  };

  // 傳圖片到後端 API
  const uploadImageToBackend = async (uri: string) => {
    const formData = new FormData();
    formData.append('image', {
      uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    console.log('📤 上傳圖片 URI:', uri);

    try {
      setLoading(true);
      const response = await axios.post('http://192.168.0.55:8000/api/ocr/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ 辨識成功:', response.data);

      navigation.navigate('Result', {
        ocrResult: response.data.text,
        analysisResult: response.data.analysis,
      });

      setPhotoUri(null); // 傳完清掉照片
    } catch (error: any) {
      console.error('❌ 上傳錯誤:', error?.message ?? error);
      Alert.alert('上傳或辨識錯誤', error?.message ?? '請確認後端是否有開啟');
    } finally {
      setLoading(false);
    }
  };

  // 開啟相機並處理圖片
  const openCamera = async () => {
    if (loading) {
      return; // 避免正在 loading 時又點到
    }

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('權限不足', '請到設定開啟相機權限');
      return;
    }

    launchCamera(
      {
        mediaType: 'photo',
        saveToPhotos: true,
      },
      async response => {
        if (response.didCancel) {
          console.log('⚠️ 使用者取消了拍照');
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
      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={openCamera} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? '辨識中...' : '拍照並辨識'}</Text>
      </TouchableOpacity>

      {photoUri && (
        <Image source={{ uri: photoUri }} style={styles.previewImage} />
      )}

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
    backgroundColor: '#A0A0A0', // loading 時按鈕變灰
  },
  buttonText: { color: 'white', fontSize: 16 },
  previewImage: {
    width: 300,
    height: 300,
    borderRadius: 8,
    marginVertical: 16,
  },
});
