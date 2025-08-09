import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type ChildHomeNavProp = StackNavigationProp<RootStackParamList, 'ChildHome'>;

export default function ChildHome() {
  const navigation = useNavigation<ChildHomeNavProp>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#005757" />

      {/* 使用者資訊 */}
      <View style={styles.userCard}>
        <Image source={require('../img/childhome/grandpa.png')} style={styles.userIcon} />
        <View style={styles.nameRow}>
          <Text style={styles.userName}>爺爺</Text>
          <View style={{ flex: 1 }} />
          <Feather name="edit-2" size={24} color="#333" style={styles.editIcon} />
        </View>
      </View>

      {/* 健康狀況卡片（上條縮 50%，下方不動） */}
      <View style={styles.featureCardWrapper}>
        <TouchableOpacity
          style={[styles.featureCard, styles.featureCardShort]}
          onPress={() => navigation.navigate('Health')}
          activeOpacity={0.8}
        >
          <MaterialIcons name="favorite" size={28} color="#FFF" />
          <Text style={styles.featureText}>健康狀況</Text>
        </TouchableOpacity>
        <View style={styles.cardBottom} />
        <View style={styles.cardBottom_1} />
        <View style={styles.cardBottomBlank} />
      </View>

      {/* 用藥資訊卡片（已改成跟上面一樣的樣式與順序） */}
      <View style={styles.featureCardWrapper}>
        <TouchableOpacity
          style={[styles.featureCard, styles.featureCardShort]}
          onPress={() => navigation.navigate('Medicine')}
          activeOpacity={0.8}
        >
          <MaterialIcons name="medical-services" size={28} color="#FFF" />
          <Text style={styles.featureText}>用藥資訊</Text>
        </TouchableOpacity>
        <View style={styles.cardBottom} />
        <View style={styles.cardBottom_1} />
        <View style={styles.cardBottomBlank} />
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
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('index')}>
          <FontAwesome name="exchange" size={28} color="#fff" />
          <Text style={styles.settingLabel}>切換</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 整體
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  // 使用者卡片
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#0b095f',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderBottomWidth: 6,
    borderBottomColor: '#0b095f',
  },
  userIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
  },
  editIcon: { marginLeft: 10 },

  // 外框：不設圓角，避免出現縫隙
  featureCardWrapper: {
    width: '90%',
    backgroundColor: 'transparent',
    marginTop: 16,
    alignSelf: 'center',
  },

  // 上方深色條（你上面改成黑色就跟著黑色）
  featureCard: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    justifyContent: 'flex-start',
    backgroundColor: '#000',
    gap: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginBottom: 0,
  },
  // 縮 50%（兩張卡片都套用）
  featureCardShort: {
    width: '50%',
    alignSelf: 'flex-start',
  },

  // 中間黑線（若有細縫可把 marginTop 改成 -2）
  cardBottom: {
    width: '100%',
    height: 3,
    backgroundColor: '#000000',
    marginTop: -1,
    marginBottom: 0,
  },

  // 白色細隔條
  cardBottom_1: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    height: 10,
  },

  // 下方淡藍色區
  cardBottomBlank: {
    width: '100%',
    height: 120,
    backgroundColor: '#ECF5FF',
    borderRadius: 16,
    marginTop: 0,
  },

  featureText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
  },

  // 底部功能列
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
    alignSelf: 'center',
  },
  settingItem: { alignItems: 'center' },
  settingLabel: {
    color: '#fff',
    fontSize: 14,
    marginTop: 2,
    fontWeight: '900',
  },
});
