import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App'; // 確保 App.tsx 有定義 'index'
import Svg, { Text as SvgText, TextPath, Defs, Path } from 'react-native-svg';

type JoinFamilyNavProp = StackNavigationProp<RootStackParamList, 'JoinFamily'>;

function ArcText() {
  return (
    <Svg width={360} height={90} viewBox="0 0 360 90" style={{ alignSelf: 'center' }}>
      <Defs>
        <Path id="curve" d="M60,70 Q180,10 300,70" fill="none" />
      </Defs>
      <SvgText
        fill="#000000"
        fontSize="42"
        fontWeight="bold"
        fontFamily="FascinateInline-Regular"
      >
        <TextPath href="#curve" startOffset="0%" textAnchor="start">
          .CareMate.
        </TextPath>
      </SvgText>
    </Svg>
  );
}

export default function JoinFamily() {
  const navigation = useNavigation<JoinFamilyNavProp>();
  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <ArcText />
          <Image source={require('../img/childhome/1.png')} style={styles.logo} />
          <Text style={styles.footerText}>@ 長照通</Text>
        </View>

        {/* 大卡片（左右貼齊頁面） */}
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.bigCard, styles.shadow]}>
            {/* 家庭名稱 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>家庭名稱</Text>
              <TextInput
                style={styles.input}
                placeholder="請輸入家庭名稱"
                value={familyName}
                onChangeText={setFamilyName}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                placeholderTextColor="#888"
              />
            </View>

            {/* 家庭代碼 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>家庭代碼</Text>
              <TextInput
                style={styles.input}
                placeholder="家庭代碼"
                value={familyCode}
                onChangeText={setFamilyCode}
                keyboardType="numeric"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                placeholderTextColor="#888"
              />
            </View>

            {/* 按鈕區 */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('index')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="加入家庭"
            >
              <Text style={styles.primaryBtnText}>加入</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#37613C', marginTop: 12 }]}
              onPress={() => navigation.navigate('index')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="返回主頁"
            >
              <Text style={styles.secondaryBtnText}>返回主頁</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
    width: '100%',
  },
  logo: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
    marginTop: -30,
    marginBottom: 4,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#555',
  },

  scrollContainer: {
    paddingBottom: 32,
  },

  /* 大卡片（左右貼齊頁面，上緣圓角） */
  bigCard: {
    backgroundColor: '#FCFCFC',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 20,
    width: '90%',          // 🔥 左右完全對齊頁面
    alignSelf: 'center',
  },
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
  },

  inputGroup: { marginBottom: 16 },
  label: {
    fontWeight: 'bold',
    color: '#4E6E62',
    marginBottom: 7,
    fontSize: 19,
  },
  input: {
    backgroundColor: '#B3CAD8',
    borderRadius: 8,
    borderColor: '#4E6E62',
    borderWidth: 2,
    padding: 14,
    fontSize: 16,
    color: '#2E2E2E',
    fontWeight: 'bold',
    width: '100%',          // 與大卡片等寬
  },

  /* 按鈕：等寬、圓角、置中 */
  primaryBtn: {
    backgroundColor: '#37613C',
    paddingVertical: 15,
    borderRadius: 12,
    width: '100%',          // 與大卡片等寬
    alignSelf: 'center',
    marginBottom: 5,
  },
  primaryBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 20,
    textAlign: 'center',
  },
  secondaryBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 20,
    textAlign: 'center',
  },
});
