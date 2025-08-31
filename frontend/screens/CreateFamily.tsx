import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import Svg, { Text as SvgText, TextPath, Defs, Path } from 'react-native-svg';

/** =========================
 *  弧形標題：CareMate（置中）
 *  ========================= */
function ArcText() {
  return (
    <Svg width={420} height={120} viewBox="0 0 360 90" style={{ alignSelf: 'center' }}>
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

type CreateFamilyNavProp = StackNavigationProp<RootStackParamList, 'CreateFamily'>;

export default function CreateFamily() {
  const navigation = useNavigation<CreateFamilyNavProp>();

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.container}>
        {/* Header：置中顯示 CareMate */}
        <View style={styles.headerContainer}>
          <ArcText />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formWrapper}>
            {/* 中間圖示（加陰影） */}
            <Image
              source={require('../img/family/basic-needs.png')}
              style={styles.house}
            />

            {/* 按鈕區塊 */}
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('FamilySetting')}
              activeOpacity={0.85}
            >
              <View style={styles.buttonInner}>
                <Text style={styles.buttonText}>創建家庭</Text>
              </View>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('JoinFamily')}
              activeOpacity={0.85}
            >
              <View style={styles.buttonInner}>
                <Text style={styles.buttonText}>加入家庭</Text>
              </View>
            </TouchableOpacity> */}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFCEC', paddingTop: 12 },

  // 標題置中
  headerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 19,
    transform: [{ scale: 0.90 }],
  },

  scrollContainer: { paddingBottom: 40 },

  // 白色面板
  formWrapper: {
    backgroundColor: '#FCFCFC',
    borderRadius: 30,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 38,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },

  // 中間圖示：加明顯陰影
  house: {
    width: 240,
    height: 240,
    marginVertical: 40,
    resizeMode: 'contain',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 8,
  },

  // 按鈕
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 18, // 高度加大
    width: '85%', // ✅ 按鈕變寬
    alignSelf: 'center', // 水平置中
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 5,
  },
  buttonInner: {
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 26, // 文字變大
    color: '#000',
    fontWeight: '900',
  },
});
