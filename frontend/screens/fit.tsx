import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  ScrollView,
  StyleSheet,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import GoogleFit, { Scopes } from 'react-native-google-fit';

export default function GoogleFitScreen() {
  const [steps, setSteps] = useState<any[]>([]);
  const [error, setError] = useState('');

  // 🟡 步驟 1：動態請求權限（Android 10+）
  const requestActivityPermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 29) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
          {
            title: '需要活動辨識權限',
            message: '我們需要讀取您的步數資料來顯示健康資訊。',
            buttonNeutral: '稍後再問',
            buttonNegative: '拒絕',
            buttonPositive: '同意',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('❌ ACTIVITY_RECOGNITION 權限被拒絕');
          setError('請允許活動辨識權限才能讀取步數');
          return false;
        }
      } catch (err) {
        console.warn('❌ 請求權限錯誤', err);
        setError('請求權限時發生錯誤');
        return false;
      }
    }
    return true;
  };

  // 🟢 步驟 2：初始化 Google Fit 授權
  const initGoogleFit = () => {
    const options = {
      scopes: [
        Scopes.FITNESS_ACTIVITY_READ,
        Scopes.FITNESS_ACTIVITY_WRITE,
      ],
    };

    GoogleFit.authorize(options)
      .then(authResult => {
        if (authResult.success) {
          console.log('✅ 授權成功');
          fetchStepData();
        } else {
          console.log('❌ 授權失敗', authResult.message);
          setError('Google Fit 授權失敗');
        }
      })
      .catch(err => {
        console.log('❌ 授權錯誤', err);
        setError('Google Fit 授權錯誤');
      });
  };

  // 📊 步驟 3：抓取步數資料
  const fetchStepData = () => {
    const options = {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    };

    GoogleFit.getDailyStepCountSamples(options)
      .then(results => {
        console.log('📊 步數資料:', results);

        const fitData = results.find(
          result => result.source === 'com.google.android.gms:estimated_steps'
        );

        if (fitData && fitData.steps) {
          setSteps(fitData.steps);
          setError('');
        } else {
          setSteps([]);
          setError('找不到步數資料');
        }
      })
      .catch(err => {
        console.error('取得步數錯誤', err);
        setError('取得步數錯誤');
      });
  };

  useEffect(() => {
    requestActivityPermission().then(granted => {
      if (granted) {
        initGoogleFit();
      }
    });
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🚶 Google Fit 步數資料</Text>

      <Button title="🔄 重新取得步數" onPress={fetchStepData} />

      {error ? <Text style={styles.error}>❌ {error}</Text> : null}

      {steps.length > 0 ? (
        steps.map((item, index) => (
          <View key={index} style={styles.stepItem}>
            <Text>📅 {item.date}：{item.value} 步</Text>
          </View>
        ))
      ) : !error ? (
        <Text style={styles.placeholder}>📭 尚無步數資料</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  stepItem: {
    marginVertical: 8,
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
  placeholder: {
    color: '#666',
    marginTop: 20,
  },
});
