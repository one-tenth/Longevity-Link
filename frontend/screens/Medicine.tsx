import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

type MedicineNavProp = StackNavigationProp<RootStackParamList, 'Medicine'>;

export default function Medicine() {
  const navigation = useNavigation<MedicineNavProp>();

  return (
    <View style={styles.container}>
      {/* Header */}
     {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('ChildHome')}>
          <FontAwesome name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'FascinateInline-Regular', fontSize: 40, color: '#FFF' }}>.CareMate.</Text>
      </View>



      {/* 藥物功能卡片 */}
      <View style={styles.labelCard}>
        <View style={styles.sideBar} />
        <TouchableOpacity style={styles.cardContent} onPress={() => navigation.navigate('MedTimeSetting')}>
          <MaterialCommunityIcons name="alarm" size={26} color="#005757" />
          <Text style={styles.labelText}>用藥時間設定</Text>

        </TouchableOpacity>
      </View>

      <View style={styles.labelCard}>
        <View style={styles.sideBar} />
        <TouchableOpacity style={styles.cardContent} onPress={() => navigation.navigate('MedRemind')}>
          <MaterialCommunityIcons name="pill" size={26} color="#005757" />
          <Text style={styles.labelText}>用藥提醒</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.labelCard}>
        <View style={styles.sideBar} />
        <TouchableOpacity style={styles.cardContent} onPress={() => navigation.navigate('MedInfo')}>
          <MaterialCommunityIcons name="clipboard-text" size={26} color="#005757" />
          <Text style={styles.labelText}>用藥資訊</Text>
        </TouchableOpacity>
      </View>

      {/* 底部功能列 */}
      <View style={styles.bottomBox}>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('Profile')}>
          <FontAwesome name="user" size={28} color="#fff" />
          <Text style={styles.settingLabel}>個人</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('FamilySetting')}>
          <FontAwesome name="home" size={28} color="#fff" />
          <Text style={styles.settingLabel}>家庭</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('ChildHome')}>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    color: '#FFF',
    fontFamily: 'FascinateInline-Regular',
  },
  backButton: { position: 'absolute', left: 10 },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 10,
    width: '90%',
  },
  profileText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#005757',
  },

  labelCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    width: '90%',
    height: 80,
    marginTop: 20,
    overflow: 'hidden',
    elevation: 2,
  },
  sideBar: {
    width: 10,
    backgroundColor: '#007979',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  labelText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#005757',
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
