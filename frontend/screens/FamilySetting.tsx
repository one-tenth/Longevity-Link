import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App'; // 確保有定義 AddMember 頁面

type NavProp = StackNavigationProp<RootStackParamList, 'FamilySetting'>;

export default function FamilySetting() {
  const navigation = useNavigation<NavProp>();
  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');

  // 自動產生 4 碼家庭代碼
  useEffect(() => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setFamilyCode(code);
  }, []);

  const handleCreate = () => {
    // 這裡可以串接 API 發送 familyName 和 familyCode
    console.log('家庭名稱:', familyName);
    console.log('家庭代碼:', familyCode);
    navigation.navigate('AddMember');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../img/family/key.png')} style={styles.icon} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/family/logo.png')} style={styles.logo} />
      </View>

      {/* 輸入區 */}
    <View style={styles.inputContainer}>
    {/* 上方綠底區塊 */}
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
        placeholderTextColor="#888"
        />
    </View>
    </View>

      {/* 家庭代碼顯示 */}
      <View style={styles.codeContainer}>
        <Text style={styles.codeLabel}>您的家庭代碼為</Text>
        <Text style={styles.codeText}>{familyCode}</Text>
      </View>

      {/* 創建按鈕 */}
      <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
        <Text style={styles.createText}>創建</Text>
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
  title: {
    fontSize: 50, 
    fontWeight:'900', 
    color: '#000', 
  },
  logo: {
    width: 60, 
    height: 60,
    marginTop:15,
  },
inputContainer: {
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
  backgroundColor: '#77A88D',
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

  codeContainer: {
    marginTop: 27,
    backgroundColor: '#fff4a3',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderColor: '#ffb600',
    borderWidth: 4,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 30,
    fontWeight: '900',
    color: '#333',
  },
  codeText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#000',
    marginTop: 5,
  },
  createButton: {
    backgroundColor: '#ffb600',
    marginTop: 33,
    paddingVertical: 10,
    paddingHorizontal: 50,
    borderRadius: 10,
    borderWidth: 3,
  },
  createText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#000',
  },
});
