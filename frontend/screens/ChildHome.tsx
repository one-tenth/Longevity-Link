import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

// ✅ CLI 專用 icon import 方法
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Entypo from 'react-native-vector-icons/Entypo';

type ChildHomeNavProp = StackNavigationProp<RootStackParamList, 'ChildHome'>;

export default function ChildHome() {
  const navigation = useNavigation<ChildHomeNavProp>();

  return (
    <View style={styles.container}>
      {/* 標題列 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Setting')}>
          <Feather name="settings" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* 使用者資訊 */}
      <View style={styles.userBox}>
        <FontAwesome name="user-circle" size={60} color="#00474f" style={styles.userIconLarge} />
        <Text style={styles.userText}>爺爺</Text>
        <Feather name="edit-2" size={20} color="#030852" />
      </View>

      {/* 警示區塊 */}
      <View style={styles.alertBox}>
        <MaterialIcons name="warning" size={40} color="#e74c3c" style={styles.alertIcon} />
        <View>
          <Text style={styles.alertText}>時間：20:00</Text>
          <Text style={styles.alertText}>來電號碼：</Text>
          <Text style={styles.alertText}>0900-123-456</Text>
        </View>
      </View>

      {/* 功能按鈕 1 */}
      <View style={styles.gridRow}>
        <TouchableOpacity style={[styles.gridBox, { backgroundColor: '#00474f' }]}>
          <Entypo name="location-pin" size={40} color="#fff" />
          <Text style={styles.gridTextWhite}>即時位置</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.gridBox, { backgroundColor: '#030852' }]}>
          <MaterialIcons name="favorite" size={40} color="#fff" />
          <Text style={styles.gridTextWhite}>健康狀況</Text>
        </TouchableOpacity>
      </View>

      {/* 功能按鈕 2 */}
      <View style={styles.gridRow}>
        <TouchableOpacity
          style={[styles.gridBox, { backgroundColor: '#006d77' }]}
          onPress={() => navigation.navigate('Medicine')}>
          <MaterialIcons name="medical-services" size={40} color="#fff" />
          <Text style={styles.gridTextWhite}>用藥</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.gridBox, { backgroundColor: '#03506f' }]}
          onPress={() => navigation.navigate('HospitalRecord')}>
          <MaterialIcons name="local-hospital" size={40} color="#fff" />
          <Text style={styles.gridTextWhite}>看診</Text>
        </TouchableOpacity>
      </View>

      {/* 通話紀錄 */}
      <TouchableOpacity style={styles.callBox}>
        <Feather name="phone-call" size={30} color="#fff" />
        <Text style={styles.callText}>通話紀錄</Text>
      </TouchableOpacity>

      {/* 切換帳號 */}
      <TouchableOpacity onPress={() => navigation.navigate('index')}>
        <Text style={styles.switchText}>切換使用者</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e6f4ff',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    height: 70,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: '#00474f',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  userBox: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 20,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },
  userIconLarge: {
    marginRight: 20,
  },
  userText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#030852',
    flex: 1,
  },
  alertBox: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },
  alertIcon: {
    marginRight: 15,
  },
  alertText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#030852',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 15,
  },
  gridBox: {
    width: '48%',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 3,
  },
  gridTextWhite: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  callBox: {
    width: '90%',
    marginTop: 20,
    backgroundColor: '#00474f',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  callText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  switchText: {
    fontSize: 16,
    color: '#030852',
    fontWeight: 'bold',
    marginTop: 25,
  },
});
