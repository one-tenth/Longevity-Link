// elderlyupload.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function ElderlyUpload() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* 標題列 */}
      <View style={styles.header}>
        <Image source={require('../img/elderlyupload/add-photo.png')} style={styles.icon} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/elderlyupload/logo.png')} style={styles.logo} />
      </View>

      {/* 標題文字 */}
      <Text style={styles.pageTitle}>拍照上傳</Text>

      {/* 血壓按鈕 */}
      <TouchableOpacity style={styles.bigButton}>
        <Image source={require('../img/elderlyupload/blood preasure.png')} style={styles.bigIcon} />
        <Text style={styles.bigText}>血壓</Text>
      </TouchableOpacity>

      {/* 藥袋按鈕 */}
      <TouchableOpacity style={styles.bigButton}>
        <Image source={require('../img/elderlyupload/medicine.png')} style={styles.bigIcon} />
        <Text style={styles.bigText}>藥袋</Text>
      </TouchableOpacity>

      {/* 回首頁 */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push('/ElderHome')}
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
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#65B6E4',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  icon: {
    width: 40,
    height: 40,
    marginTop: 15,
  },
  logo: {
    width: 60,
    height: 60,
    marginTop: 15,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#000',
    marginTop: 15,
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 30,
  },
  bigButton: {
    width: '85%',
    height: 110,
    backgroundColor: '#F4C80B',
    borderRadius: 15,
    borderWidth: 3,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bigIcon: {
    width: 60,
    height: 60,
    marginRight: 20,
  },
  bigText: {
    fontSize: 36,
    fontWeight: '900',
  },
  backButton: {
    width: '60%',
    height: 50,
    backgroundColor: '#F58402',
    borderRadius: 15,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  backText: {
    fontSize: 24,
    fontWeight: '900',
  },
});
