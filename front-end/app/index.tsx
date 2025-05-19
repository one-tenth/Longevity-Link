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

const GoogleFitStepScreen = () => {
  const [steps, setSteps] = useState<number | null>(null);

  const requestActivityPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android' && Platform.Version >= 29) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        {
          title: '需要活動辨識權限',
          message: '此應用程式需要讀取您的 Google Fit 步數資料',
          buttonPositive: '確定',
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('權限被拒絕', '無法讀取步數資料');
        return false;
      }
    }
    return true;
  };

  const authorizeAndFetchSteps = async () => {
    const hasPermission = await requestActivityPermission();
    if (!hasPermission) return;

    const options = {
      scopes: [
        Scopes.FITNESS_ACTIVITY_READ,
        Scopes.FITNESS_ACTIVITY_WRITE,
      ],
    };

    const authResult = await GoogleFit.authorize(options);
    if (!authResult.success) {
      Alert.alert('授權失敗', authResult.message || '無法取得授權');
      return;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // 今天凌晨
    const todayDateStr = new Date().toISOString().slice(0, 10); // e.g. 2025-05-17

    GoogleFit.getDailyStepCountSamples({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    })
      .then((res) => {
        console.log('📦 所有資料來源：', res.map((r) => r.source));

        const androidSteps = res.find((r) =>
          r.source === 'com.google.android.gms:merge_step_deltas'
        );

        if (androidSteps && androidSteps.steps.length > 0) {
          console.log('📆 所有步數資料：', androidSteps.steps);

          const todayStepEntry = androidSteps.steps.find(
            (s) => s.date === todayDateStr
          );

          if (todayStepEntry) {
            setSteps(todayStepEntry.value);
          } else {
            Alert.alert('今天沒有步數資料');
          }
        } else {
          Alert.alert('無步數資料');
        }
      })
      .catch((err) => {
        console.error('讀取步數失敗', err);
        Alert.alert('讀取失敗', '請確認 Google Fit 有記錄步數');
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google Fit 步數讀取</Text>
      <Button title="讀取今日步數" onPress={authorizeAndFetchSteps} />
      <Text style={styles.steps}>
        {steps !== null ? `✅ 今日步數：${steps} 步` : '📭 尚未讀取'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, marginBottom: 20 },
  steps: { fontSize: 18, marginTop: 20 },
});

export default GoogleFitStepScreen;
