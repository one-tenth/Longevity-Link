import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App'; // 確保 App.tsx 有定義 'index' 頁面

type JoinFamilyNavProp = StackNavigationProp<RootStackParamList, 'JoinFamily'>;

export default function JoinFamily() {
  const navigation = useNavigation<JoinFamilyNavProp>();
  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');

  const handleJoin = () => {
    console.log('加入家庭:', familyName, familyCode);
    // 導向首頁（或你要的下一個頁面）
    navigation.navigate('index');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../img/family/key.png')} style={styles.icon} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/family/logo.png')} style={styles.logo} />
      </View>

      {/* 家庭名稱 */}
      <View style={styles.inputGroup}>
        <View style={styles.inputBoxTop}>
        <Image source={require('../img/family/familyName.png')} style={styles.inputIcon} />
          <Text style={styles.inputLabel}>家庭名稱</Text>
        </View>

        {/* 中間的黑線 */}
          <View style={styles.divider} />

        {/* 綠框包住白色輸入框 */}
          <View style={styles.inputOuterBox}>
            <TextInput
              style={styles.inputInnerBox}
              placeholder="Value"
              value={familyName}
              onChangeText={setFamilyName}
            />
        </View>
      </View>

      {/* 家庭代碼 */}
      <View style={styles.inputGroup}>
      <View style={styles.inputBoxTop}>
        <Image source={require('../img/family/familyName.png')} style={styles.inputIcon} />
          <Text style={styles.inputLabel}>家庭代碼</Text>
      </View>

      {/* 中間的黑線 */}
        <View style={styles.divider} />

      {/* 綠框包住白色輸入框 */}
          <View style={styles.inputOuterBox}>
            <TextInput
              style={styles.inputInnerBox}
              placeholder="Value"
              value={familyCode}
              onChangeText={setFamilyCode}
              keyboardType="numeric"
            />
        </View>
      </View>

      {/* 加入按鈕 */}
      <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
        <Text style={styles.joinText}>加入</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFF0',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    height:70,
    flexDirection: 'row', 
    justifyContent: 'space-between',
    backgroundColor: '#65B6E4',
    position: 'relative',
    marginBottom:20,
    paddingLeft:10,
    paddingRight:10,
  },
  icon: {
    width: 40, 
    height: 40,
    marginTop:15,
  },
  logo: {
    width: 60, 
    height: 60,
    marginTop:15,
  },
  title: {
    fontSize: 50, 
    fontWeight:'900', 
    color: '#000', 
  },
  inputGroup: {
    width: '75%', // ✅ 縮短整體寬度
    alignSelf: 'center',
    marginVertical: 16,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#000',
    overflow: 'hidden',
    backgroundColor: '#0000',
  },
inputBoxTop: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#549D77',
  paddingHorizontal: 12,
  paddingVertical: 10,
},

inputIcon: {
  width: 26,
  height: 26,
},

inputLabel: {
  color: '#FFF',
  fontSize: 18,
  fontWeight: '900',
  marginLeft: 'auto',
},

divider: {
  height: 4,
  backgroundColor: '#000',
},

inputOuterBox: {
  backgroundColor: '#77A88D', // ✅ 綠色外框
  padding: 8, // ✅ 裡面白色輸入框與邊框有間距
},

inputInnerBox: {
  backgroundColor: '#FFF',
  paddingVertical: 10,
  paddingHorizontal: 16,
  fontSize: 17,
  fontWeight: '900',
  borderRadius: 8,
},
  joinButton: {
    backgroundColor: '#f7941d',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 60,
    marginTop: 40,
    borderWidth: 4,
  },
  joinText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
  },
});
