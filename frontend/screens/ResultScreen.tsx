import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function ResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const { ocrResult, analysisResult, photoUri } = route.params;

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('OCR:', ocrResult);
    console.log('AI 分析:', analysisResult);
    console.log('照片 URI:', photoUri);
  }, [ocrResult, analysisResult, photoUri]);

  const handleBackToCamera = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      navigation.navigate('ElderlyUpload'); // 改成你的拍照頁面路由名稱
      setLoading(false);
    }, 500);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} />}

      <Text style={styles.title}>🔍 辨識結果：</Text>
      {Array.isArray(ocrResult) ? (
        ocrResult.map((line, idx) => (
          <Text key={idx} style={styles.textLine}>
            {line}
          </Text>
        ))
      ) : (
        <Text style={styles.textLine}>{ocrResult}</Text>
      )}

      <Text style={styles.title}>🧠 AI 分析結果：</Text>
      <Text style={styles.analysisText}>{analysisResult}</Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleBackToCamera}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>返回拍照</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  photo: {
    width: 300,
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  textLine: {
    fontSize: 16,
    marginVertical: 2,
    alignSelf: 'flex-start',
  },
  analysisText: {
    fontSize: 18,
    marginTop: 10,
    color: '#333',
    alignSelf: 'flex-start',
  },
  button: {
    marginTop: 30,
    backgroundColor: '#007aff',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
  },
});
