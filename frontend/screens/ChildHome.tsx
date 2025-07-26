import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import AsyncStorage from '@react-native-async-storage/async-storage';

import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Entypo from 'react-native-vector-icons/Entypo';

type ChildHomeNavProp = StackNavigationProp<RootStackParamList, 'ChildHome'>;

interface Member {
  UserID: number;
  Name: string;
  RelatedID?: number | null;
}

export default function ChildHome() {
  const navigation = useNavigation<ChildHomeNavProp>();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [hasElder, setHasElder] = useState<boolean>(true);

  useEffect(() => {
    const loadSelectedMember = async () => {
      const stored = await AsyncStorage.getItem('selectedMember');
      if (stored) {
        const parsed: Member = JSON.parse(stored);
        if (!parsed.RelatedID) {
          Alert.alert('錯誤', '請選擇一位長者，才能進行操作。');
          setHasElder(false);
        } else {
          setSelectedMember(parsed);
        }
      } else {
        setHasElder(false);
        Alert.alert('尚未選擇長者', '請先至家庭頁面選擇一位長者。');
      }
    };
    const unsubscribe = navigation.addListener('focus', loadSelectedMember);
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>CareMate</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Setting')}>
          <Feather name="settings" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* User Info 可點擊切換 */}
      <TouchableOpacity onPress={() => navigation.navigate('FamilyScreen')}>
        <View style={styles.userCard}>
          <FontAwesome name="user-circle" size={50} color="#F0F8FF" />
          <Text style={styles.userName}>{selectedMember?.Name || '請選擇成員'}</Text>
          <Feather name="edit-2" size={18} color="#F0F8FF" />
        </View>
      </TouchableOpacity>

      {/* 功能按鈕 */}
      <TouchableOpacity style={styles.featureBox} onPress={() => hasElder && navigation.navigate('Location')}>
        <Entypo name="location-pin" size={28} color="#fff" />
        <Text style={styles.featureText}>即時位置</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.featureBox} onPress={() => hasElder && navigation.navigate('Health')}>
        <MaterialIcons name="favorite" size={28} color="#fff" />
        <Text style={styles.featureText}>健康狀況</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.featureBox} onPress={() => hasElder && navigation.navigate('Medicine')}>
        <MaterialIcons name="medical-services" size={28} color="#fff" />
        <Text style={styles.featureText}>用藥資訊</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.featureBox} onPress={() => hasElder && navigation.navigate('HospitalRecord')}>
        <MaterialIcons name="local-hospital" size={28} color="#fff" />
        <Text style={styles.featureText}>看診記錄</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.featureBox} onPress={() => hasElder && navigation.navigate('CallRecord')}>
        <Feather name="phone-call" size={28} color="#fff" />
        <Text style={styles.featureText}>通話紀錄</Text>
      </TouchableOpacity>

      {/* 底部按鈕 */}
      <TouchableOpacity onPress={() => navigation.navigate('index')} style={styles.switchBox}>
        <Feather name="user" size={20} color="#3a111c" />
        <Text style={styles.switchText}>切換使用者</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('FamilyScreen')} style={styles.switchBox}>
        <Feather name="user" size={20} color="#3a111c" />
        <Text style={styles.switchText}>家庭</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8FF',
  },
  header: {
    backgroundColor: '#E6C3C3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  headerText: {
    color: '#800000',
    fontSize: 44,
    fontFamily: 'FascinateInline-Regular',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6495ED',
    padding: 10,
    margin: 10,
    borderRadius: 10,
    marginTop: 20,
    gap: 12,
  },
  userName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#F0F8FF',
    fontFamily: 'DelaGothicOne-Regular',
    flex: 1,
  },
  featureBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#24368e',
    padding: 16,
    borderRadius: 10,
    marginTop: 5,
    marginLeft: 20,
    marginRight: 20,
    justifyContent: 'flex-start',
    gap: 14,
  },
  featureText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  switchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    justifyContent: 'center',
    gap: 10,
  },
  switchText: {
    color: '#3a111c',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
