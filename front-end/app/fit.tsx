import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import GoogleFit, { Scopes } from 'react-native-google-fit';

export default function GoogleFitScreen() {
  const [steps, setSteps] = useState<number | null>(null);

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android' && Platform.Version >= 29) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('權限被拒絕', '無法讀取步數資料');
        return false;
      }
    }
    return true;
  };

  const getSteps = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const options = {
      scopes: [Scopes.FITNESS_ACTIVITY_READ, Scopes.FITNESS_ACTIVITY_WRITE],
    };

    const authResult = await GoogleFit.authorize(options);
    if (!authResult.success) {
      Alert.alert('授權失敗', authResult.message || '無法取得授權');
      return;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const today = new Date().toISOString().slice(0, 10);

    GoogleFit.getDailyStepCountSamples({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }).then((res) => {
      const stepsData = res.find(
        (r) => r.source === 'com.google.android.gms:merge_step_deltas'
      );
      const todayData = stepsData?.steps?.find((s) => s.date === today);
      if (todayData) setSteps(todayData.value);
      else Alert.alert('今天沒有步數資料');
    }).catch(() => {
      Alert.alert('讀取失敗', '請確認 Google Fit 有記錄步數');
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google Fit 步數讀取</Text>
      <Button title="讀取今日步數" onPress={getSteps} />
      <Text style={styles.steps}>
        {steps !== null ? `✅ 今日步數：${steps} 步` : '📭 尚未讀取'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, marginBottom: 20 },
  steps: { fontSize: 18, marginTop: 20 },
});