import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import MlkitOcr from 'react-native-mlkit-ocr';

export default function App() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string[]>([]);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const sdkInt = Platform.Version;
      try {
        if (sdkInt >= 33) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          );
          return result === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
          );
          return result === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.warn('權限錯誤:', err);
        return false;
      }
    }
    return true;
  };

  const pickImageAndRecognize = async () => {
    const granted = await requestPermissions();
    if (!granted) {
      alert('請先允許存取相簿權限');
      return;
    }

    ImagePicker.launchImageLibrary({ mediaType: 'photo' }, async response => {
      if (response.didCancel || !response.assets?.[0]?.uri) return;

      const uri = response.assets[0].uri;
      setImageUri(uri);

      try {
        const result = await MlkitOcr.detectFromFile(uri);
        setOcrResult(result.map(r => r.text));
      } catch (error) {
        console.warn('OCR 錯誤:', error);
        alert('辨識失敗，請重試');
      }
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.button} onPress={pickImageAndRecognize}>
        <Text style={styles.buttonText}>選擇照片並辨識</Text>
      </TouchableOpacity>

      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      {ocrResult.map((line, idx) => (
        <Text key={idx} style={styles.text}>{line}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  button: { backgroundColor: '#007aff', padding: 12, borderRadius: 8 },
  buttonText: { color: 'white', fontWeight: 'bold' },
  image: { width: 300, height: 300, marginVertical: 20 },
  text: { fontSize: 16, marginVertical: 2 },
});
`