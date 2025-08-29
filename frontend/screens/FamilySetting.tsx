import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import Svg, { Text as SvgText, TextPath, Defs, Path } from 'react-native-svg';

/** =========================
 *  弧形標題：CareMate
 *  ========================= */
function ArcText() {
  return (
    <Svg width={360} height={90} viewBox="0 0 360 90" style={{ alignSelf: 'center' }}>
      <Defs>
        <Path id="curve" d="M60,70 Q180,10 300,70" fill="none" />
      </Defs>
      <SvgText fill="#000000" fontSize="42" fontWeight="bold" fontFamily="FascinateInline-Regular">
        <TextPath href="#curve" startOffset="0%" textAnchor="start">
          .CareMate.
        </TextPath>
      </SvgText>
    </Svg>
  );
}

type NavProp = StackNavigationProp<RootStackParamList, 'index'>;

/** =========================
 *  右下方陰影卡片
 *  ========================= */
const RBCard: React.FC<{
  radius?: number;
  bg?: string;
  style?: any;
  contentStyle?: any;
  children: React.ReactNode;
}> = ({ radius = 12, bg = '#FFF', style, contentStyle, children }) => {
  return (
    <View style={[rbStyles.wrap, { borderRadius: radius }, style]}>
      {/* 陰影層 */}
      <View style={[rbStyles.shadowLayer, { borderRadius: radius }]} />
      {/* 內容層 */}
      <View
        style={[
          rbStyles.content,
          { borderRadius: radius, backgroundColor: bg },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const rbStyles = StyleSheet.create({
  wrap: { position: 'relative' },
  shadowLayer: {
    position: 'absolute',
    top: 4, // ↓
    left: 4, // →
    right: -4,
    bottom: -4,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  content: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});

export default function CreateFamily() {
  const navigation = useNavigation<NavProp>();
  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');

  // ✅ 檢查是否已有家庭
  useEffect(() => {
    const checkFamily = async () => {
      const token = await AsyncStorage.getItem('access');
      if (!token) return;
      try {
        const res = await fetch('http://140.131.115.97:8000/account/me/', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const text = await res.text();
        if (text.startsWith('<')) return;
        const userData = JSON.parse(text);
        if (userData.FamilyID) {
          navigation.navigate('index');
        }
      } catch (err) {
        console.log('⚠️ 取得使用者資料失敗:', err);
      }
    };
    checkFamily();
  }, []);

  // ✅ 建立家庭流程
  const handleCreate = async () => {
    if (!familyName.trim()) {
      Alert.alert('錯誤', '請輸入家庭名稱');
      return;
    }
    const token = await AsyncStorage.getItem('access');
    if (!token) {
      Alert.alert('錯誤', '尚未登入，請先登入');
      return;
    }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setFamilyCode(code);
    try {
      const response = await fetch('http://140.131.115.97:8000/api/family/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ FamilyName: familyName, Fcode: code }),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('後端格式錯誤');
      }
      if (response.ok) {
        Alert.alert('成功', `家庭建立成功，代碼為 ${code}`, [
          { text: '確定', onPress: () => navigation.navigate('FamilyScreen') },
        ]);
      } else {
        Alert.alert('建立失敗', data.error || '請稍後再試');
      }
    } catch (err: any) {
      Alert.alert('錯誤', err.message || '無法建立家庭');
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <ArcText />
          <Image source={require('../img/childhome/1.png')} style={styles.logo} />
        </View>

        {/* 家庭名稱卡片 */}
        <RBCard style={{ width: '80%', marginTop: 18 }} contentStyle={{ padding: 16 }}>
          <View style={styles.cardHeaderRow}>
            <Image source={require('../img/family/familyName.png')} style={styles.inputIcon} />
            <Text style={styles.inputLabel}>家庭名稱</Text>
          </View>
          <TextInput
            style={styles.inputInnerBox}
            placeholder="請輸入家庭名稱"
            value={familyName}
            onChangeText={setFamilyName}
            placeholderTextColor="#888"
          />
        </RBCard>

        {/* 家庭代碼卡片 */}
        {familyCode ? (
          <RBCard
            style={{ width: '80%', marginTop: 22 }}
            bg="#FFFCEC"
            contentStyle={{ paddingVertical: 18, paddingHorizontal: 24, alignItems: 'center' }}
          >
            <Text style={styles.codeLabel}>您的家庭代碼為</Text>
            <Text style={styles.codeText}>{familyCode}</Text>
          </RBCard>
        ) : null}

        {/* 建立按鈕（卡片風格） */}
        <RBCard style={{ marginTop: 28 }} bg="#4E6E62">
          <TouchableOpacity onPress={handleCreate} activeOpacity={0.9} style={styles.buttonInner}>
            <Text style={styles.createText}>創建</Text>
          </TouchableOpacity>
        </RBCard>
      </View>
    </>
  );
}

const COLORS = {
  bg: '#FFFFFF',
  codeCard: '#FFFCEC',
  button: '#4E6E62',
  white: '#FFFFFF',
  black: '000',
  textGray: '#333',
  inputBg: '#F9F9F9',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 20,
    alignItems: 'center',
  },
  headerContainer: { alignItems: 'center' },
  logo: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
    marginTop: -30,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputIcon: {
    width: 26,
    height: 26,
    marginRight: 8,
  },
  inputLabel: {
    color: COLORS.textGray,
    fontSize: 18,
    fontWeight: '900',
  },
  inputInnerBox: {
    backgroundColor: COLORS.inputBg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 17,
    fontWeight: '900',
    borderRadius: 8,
  },
  codeLabel: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textGray,
  },
  codeText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.black,
    marginTop: 6,
    letterSpacing: 1,
  },
  buttonInner: {
    paddingVertical: 12,
    paddingHorizontal: 60,
    alignItems: 'center',
  },
  createText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.white,
  },
});
