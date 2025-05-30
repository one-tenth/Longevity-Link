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

export default function CameraScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<string>('');  // <-- AI 分析結果
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
        console.warn(err);
        return false;
      }
    } else {
      return true;
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

    console.log('上傳圖片的 URI:', uri);
    console.log('FormData:', formData);

    try {
      setLoading(true);
      const response = await axios.post('http://192.168.0.55:8000/api/ocr/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setOcrResult(response.data.text);  // OCR 文字結果
      setAnalysisResult(response.data.analysis);  // AI 分析結果
    } catch (error) {
      console.warn('上傳錯誤:', error);
      Alert.alert('上傳或辨識錯誤', error?.message ?? '請確認後端是否有開啟');
    } finally {
      setLoading(false);
    }
  };

  // 開啟相機並處理圖片
  const openCamera = async () => {
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
          console.log('使用者取消了拍照');
        } else if (response.errorCode) {
          console.warn('相機錯誤:', response.errorMessage);
        } else if (response.assets && response.assets.length > 0) {
          const uri = response.assets[0].uri;
          setPhotoUri(uri ?? null);
          setOcrResult([]);         // 清空上次的結果
          setAnalysisResult('');    // 清空上次的分析
          if (uri) await uploadImageToBackend(uri);
        }
      },
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.button} onPress={openCamera}>
        <Text style={styles.buttonText}>拍照並辨識</Text>
      </TouchableOpacity>

      {photoUri && (
        <Image source={{ uri: photoUri }} style={styles.previewImage} />
      )}

      {loading && <ActivityIndicator size="large" color="#007aff" />}

      {/* OCR 辨識結果 */}
      {ocrResult.length > 0 && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>🔍 辨識結果：</Text>
          {ocrResult.map((line, idx) => (
            <Text key={idx} style={styles.textLine}>
              {line}
            </Text>
          ))}
        </View>
      )}

      {/* AI 分析結果 */}
      {analysisResult !== '' && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>🧠 AI 分析結果：</Text>
          <Text style={styles.analysisText}>
            {analysisResult}
          </Text>
        </View>
      )}
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
  },
  buttonText: { color: 'white', fontSize: 16 },
  previewImage: {
    width: 300,
    height: 300,
    borderRadius: 8,
    marginVertical: 16,
  },
  resultContainer: {
    marginTop: 20,
    width: '100%',
  },
  resultTitle: {
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 10,
  },
  textLine: {
    fontSize: 16,
    marginVertical: 2,
  },
  analysisText: {
    fontSize: 18,
    marginTop: 10,
    color: '#f0eded',
  },
});


