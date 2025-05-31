import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function ResultScreen({ route }) {
  const navigation = useNavigation();
  const { ocrResult, analysisResult } = route.params;

  const [loading, setLoading] = useState(false);

  // 一進頁面就印出辨識結果
  useEffect(() => {
    console.log('🔍 OCR 辨識結果:', ocrResult);
    console.log('🧠 AI 分析結果:', analysisResult);
  }, [ocrResult, analysisResult]);

  const handleBackToCamera = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      navigation.navigate('OcrScreen');
      setLoading(false);
    }, 500);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* <Text style={styles.title}>🔍 辨識結果：</Text>
      {ocrResult.map((line: string, idx: number) => (
        <Text key={idx} style={styles.textLine}>
          {line}
        </Text>
      ))} */}

      <Text style={styles.title}>🧠 AI 分析結果：</Text>
      <Text style={styles.analysisText}>{analysisResult}</Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleBackToCamera}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>返回拍照</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20, 
    alignItems: 'center',
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
