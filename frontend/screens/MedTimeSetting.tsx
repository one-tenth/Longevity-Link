<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
=======
import React, { useState } from 'react';
>>>>>>> 298b1f953955929984bfe185a4810812773ff427
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import DateTimePicker from '@react-native-community/datetimepicker';
<<<<<<< HEAD
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
=======
>>>>>>> 298b1f953955929984bfe185a4810812773ff427

type MedTimeSettingNavProp = StackNavigationProp<RootStackParamList, 'MedTimeSetting'>;

type TimeItem = {
  label: string;
  time: string;
  color: string;
};

export default function TimeSettingInput() {
  const navigation = useNavigation<MedTimeSettingNavProp>();

  const [times, setTimes] = useState<TimeItem[]>([
    { label: '早上', time: '08:00', color: '#F4C80B' },
    { label: '中午', time: '12:00', color: '#F9A66C' },
    { label: '晚上', time: '18:00', color: '#A3D6F5' },
    { label: '睡前', time: '20:00', color: '#A3D6F5' }
  ]);

  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);


  // 🔽 載入時間設定
  useEffect(() => {
    loadTimeSetting();
  }, []);

  const loadTimeSetting = async () => {
    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) {
        Alert.alert('未登入', '請重新登入');
        return;
      }

      const response = await axios.get(
        'http://192.168.0.91:8000/api/get-med-time/',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = response.data;
      const updated = [...times];
      updated[0].time = data.MorningTime || '08:00';
      updated[1].time = data.NoonTime || '12:00';
      updated[2].time = data.EveningTime || '18:00';
      updated[3].time = data.Bedtime || '20:00';
      setTimes(updated);
      console.log('✅ 成功載入時間設定:', data);
    } catch (error: any) {
      console.log('⚠️ 載入失敗或尚未設定:', error.response?.data || error.message);

    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    setShowPicker(false);
    if (selectedDate && pickerIndex !== null) {
      const updated = [...times];
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      updated[pickerIndex].time = `${hours}:${minutes}`;
      setTimes(updated);
    }
  };

  const handleSave = async () => {
    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) {
        Alert.alert('登入失效', '請重新登入');
        return;
      }

      const response = await axios.post(
        'http://192.168.0.91:8000/api/create-med-time/',
        {
          MorningTime: times[0].time,
          NoonTime: times[1].time,
          EveningTime: times[2].time,
          Bedtime: times[3].time,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('✅ 儲存成功:', response.data);
      Alert.alert('成功', '時間設定已儲存！');
    } catch (error) {
      console.error('❌ 儲存失敗:', error);
      Alert.alert('儲存失敗', '請稍後再試');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('ChildHome')}>
          <Image source={require('../img/medicine/med.png')} style={styles.home} />
        </TouchableOpacity>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/medicine/logo.png')} style={styles.logo} />
      </View>

      <View style={styles.profileRow}>
        <View style={styles.profileBox}>
          <Image source={require('../img/medicine/elderly.png')} style={styles.profileIcon} />
          <Text style={styles.profileText}>爺爺</Text>
        </View>
        <Text style={styles.sectionTitle}>時間設定</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {times.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.featureButton, { backgroundColor: item.color }]}
            onPress={() => {
              setPickerIndex(index);
              setShowPicker(true);
            }}
          >
            <Text style={styles.featureText}>{item.label}</Text>
            <Text style={styles.timeText}>{item.time}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {showPicker && pickerIndex !== null && (
        <DateTimePicker
          value={new Date(`2023-01-01T${times[pickerIndex].time}`)}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}

      <View style={styles.rowButtons}>
        <TouchableOpacity style={[styles.gridButton, { backgroundColor: '#65B6E4' }]} onPress={handleSave}>
          <Text style={styles.featureText}>儲存</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.gridButton, { backgroundColor: '#F58402' }]} onPress={() => navigation.navigate('Medicine')}>
          <Text style={styles.featureText}>回前頁</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFEED'
  },
  header: {
    width: '100%',
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#65B6E4',
    paddingLeft: 10,
    paddingRight: 10,
    alignItems: 'center'
  },
  logo: {
    width: 60,
    height: 60,
    marginTop: 15
  },
  home: {
    width: 50,
    height: 50,
    marginTop: 15
  },
  title: {
    fontSize: 50,
    fontWeight: '900',
    color: '#000'
  },
  profileRow: {
    marginTop: 20,
    flexDirection: 'row',
    marginBottom: 10,
    marginLeft: 5
  },
  profileBox: {
    width: '40%',
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 1
  },
  profileIcon: {
    width: 55,
    height: 55,
    marginRight: 10
  },
  profileText: {
    fontSize: 30,
    fontWeight: '900'
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    paddingLeft: 10,
    marginTop: 20
  },
  scrollContainer: {
    width: '90%',
    marginBottom: 20,
    alignSelf: 'center'
  },
  featureButton: {
    marginTop: 5,
    width: '100%',
    padding: 5,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#000',
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  featureText: {
    fontSize: 20,
    fontWeight: '900'
  },
  timeText: {
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 8,
    padding: 4,
    width: '50%',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '900'
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 20,
    width: '90%',
    alignSelf: 'center'
  },
  gridButton: {
    width: '40%',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#000',
    alignItems: 'center',
    padding: 10
  }
});
