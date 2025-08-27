import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type NavProp = StackNavigationProp<RootStackParamList, 'ChildHome'>;


export default function HealthStatus() {
  const navigation = useNavigation<NavProp>();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [steps, setSteps] = useState<number | null>(null);
  const [bpData, setBpData] = useState<{ systolic: number; diastolic: number; pulse: number } | null>(null);

  const fetchData = async (date: Date) => {
    const token = await AsyncStorage.getItem('access');
    const selected = await AsyncStorage.getItem('selectedMember');
    if (!token || !selected) return;

    const member = JSON.parse(selected); // 👈 這就是你選的老人
    const dateStr = date.toLocaleDateString('sv-SE');

    try {
      const stepRes = await axios.get(
        `http://192.168.0.55:8000/api/fitdata/by-date/?date=${dateStr}&user_id=${member.UserID}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSteps(stepRes.data.steps);
    } catch {
      setSteps(null);
    }

    try {
      const bpRes = await axios.get(
        `http://192.168.0.55:8000/api/healthcare/by-date/?date=${dateStr}&user_id=${member.UserID}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBpData({
        systolic: bpRes.data.systolic,
        diastolic: bpRes.data.diastolic,
        pulse: bpRes.data.pulse,
      });
    } catch {
      setBpData(null);
    }
  };


  useEffect(() => {
    fetchData(selectedDate);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#005757" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('ChildHome')}>
          <FontAwesome name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'FascinateInline-Regular', fontSize: 40, color: '#FFF' }}>.CareMate.</Text>
      </View>

      {/* 日期選擇 */}
      <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.dateWrapper}>
        <FontAwesome name="calendar" size={18} color="#333" />
        <Text style={styles.dateText}>選擇日期（{selectedDate.toLocaleDateString('sv-SE')}）</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowPicker(false);
            if (date) {
              setSelectedDate(date);
              fetchData(date);
            }
          }}
        />
      )}

      {/* 步數卡片 */}
      <View style={styles.labelCard}>
        <View style={styles.sideBar} />
        <View style={styles.cardContent}>
          <Text style={styles.labelTitle}>步數</Text>
          <Text style={styles.labelValue}>{steps !== null ? `${steps} 步` : '查無紀錄'}</Text>
        </View>
      </View>

      {/* 血壓卡片 */}
      <View style={styles.labelCard}>
        <View style={styles.sideBar} />
        <View style={styles.cardContent}>
          <Text style={styles.labelTitle}>血壓</Text>
          {bpData ? (
            <>
              <Text style={styles.labelValue}>收縮壓：{bpData.systolic}</Text>
              <Text style={styles.labelValue}>舒張壓：{bpData.diastolic}</Text>
              <Text style={styles.labelValue}>脈搏：{bpData.pulse}</Text>
            </>
          ) : (
            <Text style={styles.labelValue}>查無紀錄</Text>
          )}
        </View>
      </View>

      {/* 底部按鈕列 */}
      <View style={styles.bottomBox}>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('Profile')}>
          <FontAwesome name="user" size={28} color="#fff" />
          <Text style={styles.settingLabel}>個人</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('FamilySetting')}>
          <FontAwesome name="home" size={28} color="#fff" />
          <Text style={styles.settingLabel}>家庭</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('index')}>
          <FontAwesome name="exchange" size={28} color="#fff" />
          <Text style={styles.settingLabel}>切換</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center' },
  header: {
    width: '100%',
    height: 70,
    backgroundColor: '#005757',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  backButton: { position: 'absolute', left: 10 },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'FascinateInline-Regular',
  },
  dateWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  // 新增標籤樣式
  labelCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    width: '90%',
    height: 120,
    marginTop: 20,
    overflow: 'hidden',
    elevation: 3,
  },
  sideBar: {
    width: 10,
    backgroundColor: '#007979',
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  labelTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
    color: '#005757',
  },
  labelValue: {
    fontSize: 16,
    color: '#333',
  },

  bottomBox: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 10,
    borderRadius: 50,
    width: '90%',
  },
  settingItem: { alignItems: 'center' },
  settingLabel: {
    color: '#fff',
    fontSize: 14,
    marginTop: 2,
    fontWeight: '900',
  },
});
