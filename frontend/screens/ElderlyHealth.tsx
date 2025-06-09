// elderlyhealth.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App'; // 確認 App.tsx 裡定義了這個

// ChildHome 頁面的 navigation 型別
type ElderlyHealthNavProp = StackNavigationProp<RootStackParamList, 'ElderlyHealth'>;


export default function ElderlyHealth() {
  const navigation = useNavigation<ElderlyHealthNavProp>();

  return (
    <View style={styles.container}>
      {/* 標題列 */}
      <View style={styles.header}>
        <Image source={require('../img/elderlyhealth/health.png')} style={styles.icon} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/elderlyhealth/logo.png')} style={styles.logo} />
      </View>

      {/* 頁面標題 */}
      <Text style={styles.pageTitle}>健康狀況</Text>

      {/* 步數卡片 */}
      <View style={styles.card}>
        <Image source={require('../img/elderlyhealth/walk.png')} style={styles.cardIcon} />
        <Text style={styles.cardText}>3,820步</Text>
      </View>

      {/* 血壓卡片 */}
      <View style={styles.cardLarge}>
        <Image source={require('../img/elderlyhealth/blood preasure.png')} style={styles.cardIconLarge} />
        <View style={styles.bpTextGroup}>
          <Text style={styles.bpText}>收縮壓：120</Text>
          <Text style={styles.bpText}>舒張壓：80</Text>
          <Text style={styles.bpText}>脈搏：80</Text>
        </View>
      </View>

      {/* 回首頁 */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('ElderHome')}
      >
        <Text style={styles.backText}>回首頁</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFEED',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#65B6E4',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  icon: {
    width: 50,
    height: 50,
    marginTop: 10,
  },
  logo: {
    width: 70,
    height: 70,
    marginTop: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#000',
    marginTop: 15,
  },
  pageTitle: {
    fontSize: 38,
    fontWeight: '900',
    marginBottom: 30,
  },
  card: {
    width: '85%',
    height: 70,
    backgroundColor: '#F4C80B',
    borderRadius: 15,
    borderWidth: 3,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cardText: {
    fontSize: 28,
    fontWeight: '900',
    marginLeft: 20,
  },
  cardIcon: {
    width: 50,
    height: 50,
  },
  cardLarge: {
    width: '85%',
    backgroundColor: '#F4C80B',
    borderRadius: 15,
    borderWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginBottom: 30,
  },
  cardIconLarge: {
    width: 60,
    height: 60,
    marginRight: 20,
  },
  bpTextGroup: {
    flexDirection: 'column',
  },
  bpText: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  backButton: {
    width: '60%',
    height: 50,
    backgroundColor: '#F58402',
    borderRadius: 15,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    fontWeight: '900',
  },
});
