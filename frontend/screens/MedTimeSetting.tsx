import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App'; // 確認 App.tsx 裡定義了這個

// ElderHome 頁面的 navigation 型別
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
    { label: '飯後', time: '08:30', color: '#F4C80B' },
    { label: '中午', time: '12:00', color: '#F9A66C' },
    { label: '飯後', time: '12:30', color: '#F9A66C' },
    { label: '晚上', time: '18:00', color: '#A3D6F5' },
    { label: '飯後', time: '18:30', color: '#A3D6F5' },
    { label: '睡前', time: '20:00', color: '#A3D6F5' }
  ]);

  const handleChange = (value: string, index: number) => {
    const updated = [...times];
    updated[index].time = value;
    setTimes(updated);
  };

  const handleSave = () => {
    console.log('目前時間設定：', times);
    Alert.alert('已儲存設定', '時間已成功儲存！');
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
            onPress={() => { /* 可選：添加點擊事件 */ }}
          >
            <Text style={styles.featureText}>{item.label}</Text>
            <TextInput
              style={styles.timeInput}
              value={item.time}
              onChangeText={(text) => handleChange(text, index)}
              placeholder="例如 08:00"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

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
    borderWidth: 3, // 框粗體設為 3
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
    fontWeight: '900' // 字粗體設為 900
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: '900', // 字粗體設為 900
    textAlign: 'center',
    paddingLeft: 10,
    marginTop: 20
  },
  scrollContainer: {
    width: '90%',
    marginBottom: 20,
    alignSelf: 'center' // 確保滾動區域置中
  },
  featureButton: {
    marginTop: 5,
    width: '100%',
    padding: 5,
    borderRadius: 12,
    borderWidth: 3, // 框粗體設為 3
    borderColor: '#000',
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  featureText: {
    fontSize: 20,
    fontWeight: '900' // 字粗體設為 900
  },
  timeInput: {
    backgroundColor: '#fff',
    borderWidth: 3, // 框粗體設為 3
    borderColor: '#000',
    borderRadius: 8,
    padding: 4,
    width: '50%',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '900' // 字粗體設為 900
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 20,
    width: '90%',
    alignSelf: 'center' // 確保按鈕區域置中
  },
  gridButton: {
    width: '40%',
    borderRadius: 12,
    borderWidth: 3, // 框粗體設為 3
    borderColor: '#000',
    alignItems: 'center',
    padding: 10
  },
});