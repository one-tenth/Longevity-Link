// screens/ElderlyUpload.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Alert,
  PermissionsAndroid, Platform, ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as RNLocalize from 'react-native-localize';

type ElderlyUploadNavProp = StackNavigationProp<RootStackParamList, 'ElderlyUpload'>;

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
};

// ✅ 統一 API Base（自行修改成你的 IP / 網域）
const API_BASE = 'http://192.168.0.24:8000';
const ENDPOINT_BLOOD = `${API_BASE}/api/ocrblood/`;
const ENDPOINT_MED   = `${API_BASE}/api/med/analyze/`;
const ENDPOINT_ME    = `${API_BASE}/api/account/me/`; // 取得目前使用者資訊

export default function ElderlyUpload() {
  const navigation = useNavigation<ElderlyUploadNavProp>();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState<string>('使用者');

  // 🔹 先從 AsyncStorage 拿名稱，拿不到再打 /api/account/me/
  useEffect(() => {
    const loadName = async () => {
      try {
        // 1) 先看本地是否有存
        const possibleKeys = ['user_name', 'userName', 'Name', 'name'];
        let localName: string | null = null;
        for (const k of possibleKeys) {
          const v = await AsyncStorage.getItem(k);
          if (v && v.trim().length > 0) {
            localName = v.trim();
            break;
          }
        }
        if (localName) {
          setUserName(localName);
          return;
        }

        // 2) 沒有就打 API
        const token = await AsyncStorage.getItem('access');
        if (!token) return;

        const res = await axios.get(ENDPOINT_ME, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000,
        });

        // 後端回傳欄位可能是 Name / name / user_name，這裡做兼容
        const data = res?.data ?? {};
        const apiName =
          data.Name ??
          data.name ??
          data.user_name ??
          data.username ??
          '';

        if (typeof apiName === 'string' && apiName.trim()) {
          setUserName(apiName.trim());
          // Optional: 順手存回本地，之後就不用每次都打 API 了
          await AsyncStorage.setItem('user_name', apiName.trim());
        }
      } catch (err) {
        // 失敗就維持預設 "使用者"
        console.warn('讀取使用者名稱失敗：', err);
      }
    };

    loadName();
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: '需要相機權限',
            message: '我們需要你的許可來使用相機功能',
            buttonNeutral: '稍後再問',
            buttonNegative: '拒絕',
            buttonPositive: '允許',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('權限請求錯誤:', err);
        return false;
      }
    }
    return true;
  };

  // ✅ 改用 react-native-localize 取得時區，避免 Intl 崩潰
  const buildFormData = (uri: string) => {
    const now = new Date();
    const timestampUtc = now.toISOString();                // UTC ISO
    const epochMs = String(now.getTime());
    const deviceTz = RNLocalize.getTimeZone() || 'UTC';    // e.g. "Asia/Taipei"

    const formData = new FormData();
    formData.append('image', { uri, type: 'image/jpeg', name: 'photo.jpg' } as any);
    formData.append('timestamp', timestampUtc);
    formData.append('tz', deviceTz);
    formData.append('epoch_ms', epochMs);
    return formData;
  };

  const uploadImageToBackend = async (uri: string, apiEndpoint: string) => {
    const token = await AsyncStorage.getItem('access');
    const formData = buildFormData(uri);

    try {
      setLoading(true);
      const response = await axios.post(apiEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` },
        timeout: 60_000,
      });
      const { message, duplicate } = response.data || {};
      Alert.alert(duplicate ? '⚠️ 提醒' : '✅ 成功', message ?? '已完成上傳');
      setPhotoUri(null);
    } catch (error: any) {
      console.error('上傳錯誤:', error?.message ?? error);
      Alert.alert('上傳或辨識錯誤', error?.message ?? '請確認後端服務與網路連線');
    } finally {
      setLoading(false);
    }
  };

  const openCamera = async (apiEndpoint: string) => {
    if (loading) return;
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('權限不足', '請到設定開啟相機權限');
      return;
    }
    launchCamera({ mediaType: 'photo', saveToPhotos: true }, async (response) => {
      if (!response.didCancel && !response.errorCode && response.assets?.[0]?.uri) {
        const uri = response.assets[0].uri;
        setPhotoUri(uri);
        await uploadImageToBackend(uri, apiEndpoint);
      }
    });
  };

  const openGallery = async (apiEndpoint: string) => {
    if (loading) return;
    launchImageLibrary({ mediaType: 'photo' }, async (response) => {
      if (!response.didCancel && !response.errorCode && response.assets?.[0]?.uri) {
        const uri = response.assets[0].uri;
        setPhotoUri(uri);
        await uploadImageToBackend(uri, apiEndpoint);
      }
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* 上半：使用者列 */}
      <View style={styles.topArea}>
        <View style={styles.userCard}>
          <Image source={require('../img/elderlyhome/grandpa.png')} style={styles.userIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{userName}</Text>
          </View>
        </View>
      </View>

      {/* 下半：白色圓角面板 */}
      <View style={styles.panel}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          style={{ flex: 1 }}
        >
          {/* 血壓卡片 */}
          <View style={styles.topGrid}></View>
          <TouchableOpacity
            style={[styles.squareCard, styles.cardShadow, { backgroundColor: COLORS.cream }]}
            onPress={() => openCamera(ENDPOINT_BLOOD)}
            onLongPress={() => openGallery(ENDPOINT_BLOOD)}
            disabled={loading}
            activeOpacity={0.9}
          >
            <Text style={[styles.squareTitle, { color: COLORS.black }]}>血壓</Text>
            <View style={styles.squareBottomRow}>
              <View style={[styles.iconCircle, { backgroundColor: COLORS.black }]}>
                <MaterialIcons name="bloodtype" size={40} color="#fff" />
              </View>
            </View>
            <Text style={styles.hint}>點一下：相機　｜　長按：相簿</Text>
          </TouchableOpacity>

          {/* 藥袋卡片 */}
          <View style={styles.topGrid}></View>
          <TouchableOpacity
            style={[styles.squareCard, styles.cardShadow, { backgroundColor: COLORS.cream }]}
            onPress={() => openCamera(ENDPOINT_MED)}
            onLongPress={() => openGallery(ENDPOINT_MED)}
            disabled={loading}
            activeOpacity={0.9}
          >
            <Text style={[styles.squareTitle, { color: COLORS.black }]}>藥袋</Text>
            <View style={styles.squareBottomRow}>
              <View style={[styles.iconCircle, { backgroundColor: COLORS.black }]}>
                <MaterialIcons name="medication" size={40} color="#fff" />
              </View>
            </View>
            <Text style={styles.hint}>點一下：相機　｜　長按：相簿</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 底部回首頁按鈕 */}
      <TouchableOpacity
        style={[styles.homeButton, loading && styles.disabledButton]}
        onPress={() => navigation.navigate('ElderHome')}
        disabled={loading}
        activeOpacity={0.8}
      >
        <MaterialIcons name="home" size={80} color={COLORS.white} />
      </TouchableOpacity>

      {/* 載入中遮罩 */}
      {loading && (
        <View style={styles.loadingMask}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={{ color: COLORS.white, marginTop: 8 }}>處理中…</Text>
        </View>
      )}
    </View>
  );
}

const IMAGE_SIZE = 80;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  topArea: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: COLORS.black },
  userCard: {
    backgroundColor: COLORS.black,
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 3,
  },
  userIcon: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: IMAGE_SIZE / 2 },
  userName: { color: COLORS.white, fontSize: 35, fontWeight: '900' },

  panel: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  topGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  squareCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    height: 180,
    justifyContent: 'space-between',
  },
  squareTitle: { fontSize: 38, fontWeight: '900' },
  squareBottomRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  iconCircle: {
    width: 50, height: 50, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  hint: { marginTop: 8, color: '#666', fontSize: 12 },

  disabledButton: { opacity: 0.5 },

  homeButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 90,
    backgroundColor: COLORS.black,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  loadingMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// // screens/ElderlyUpload.tsx
// import React, { useState } from 'react';
// import {
//   View, Text, StyleSheet, Image, TouchableOpacity, Alert,
//   PermissionsAndroid, Platform, ScrollView, StatusBar, ActivityIndicator,
// } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
// import axios from 'axios';
// import { StackNavigationProp } from '@react-navigation/stack';
// import { RootStackParamList } from '../App';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import * as RNLocalize from 'react-native-localize';   // ✅ 新增

// type ElderlyUploadNavProp = StackNavigationProp<RootStackParamList, 'ElderlyUpload'>;

// const COLORS = {
//   white: '#FFFFFF',
//   black: '#111111',
//   cream: '#FFFCEC',
//   textDark: '#111',
//   textMid: '#333',
//   green: '#A6CFA1',
// };

// // ✅ 統一 API Base（自行修改成你的 IP / 網域）

// const API_BASE = 'http://192.168.0.24:8000';
// const ENDPOINT_BLOOD = `${API_BASE}/api/ocrblood/`;
// const ENDPOINT_MED   = `${API_BASE}/api/med/analyze/`;

// export default function ElderlyUpload() {
//   const navigation = useNavigation<ElderlyUploadNavProp>();
//   const [photoUri, setPhotoUri] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);

//   const requestCameraPermission = async () => {
//     if (Platform.OS === 'android') {
//       try {
//         const granted = await PermissionsAndroid.request(
//           PermissionsAndroid.PERMISSIONS.CAMERA,
//           {
//             title: '需要相機權限',
//             message: '我們需要你的許可來使用相機功能',
//             buttonNeutral: '稍後再問',
//             buttonNegative: '拒絕',
//             buttonPositive: '允許',
//           },
//         );
//         return granted === PermissionsAndroid.RESULTS.GRANTED;
//       } catch (err) {
//         console.warn('權限請求錯誤:', err);
//         return false;
//       }
//     }
//     return true;
//   };

//   // ✅ 改用 react-native-localize 取得時區，避免 Intl 崩潰
//   const buildFormData = (uri: string) => {
//     const now = new Date();
//     const timestampUtc = now.toISOString();           // UTC ISO
//     const epochMs = String(now.getTime());
//     const deviceTz = RNLocalize.getTimeZone() || 'UTC'; // e.g. "Asia/Taipei"

//     const formData = new FormData();
//     formData.append('image', { uri, type: 'image/jpeg', name: 'photo.jpg' } as any);
//     formData.append('timestamp', timestampUtc);
//     formData.append('tz', deviceTz);
//     formData.append('epoch_ms', epochMs);
//     return formData;
//   };

//   const uploadImageToBackend = async (uri: string, apiEndpoint: string) => {
//     const token = await AsyncStorage.getItem('access');
//     const formData = buildFormData(uri);

//     try {
//       setLoading(true);
//       const response = await axios.post(apiEndpoint, formData, {
//         headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` },
//         timeout: 60_000,
//       });
//       const { message, duplicate } = response.data || {};
//       Alert.alert(duplicate ? '⚠️ 提醒' : '✅ 成功', message ?? '已完成上傳');
//       setPhotoUri(null);
//     } catch (error: any) {
//       console.error('上傳錯誤:', error?.message ?? error);
//       Alert.alert('上傳或辨識錯誤', error?.message ?? '請確認後端服務與網路連線');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const openCamera = async (apiEndpoint: string) => {
//     if (loading) return;
//     const hasPermission = await requestCameraPermission();
//     if (!hasPermission) {
//       Alert.alert('權限不足', '請到設定開啟相機權限');
//       return;
//     }
//     launchCamera({ mediaType: 'photo', saveToPhotos: true }, async (response) => {
//       if (!response.didCancel && !response.errorCode && response.assets?.[0]?.uri) {
//         const uri = response.assets[0].uri;
//         setPhotoUri(uri);
//         await uploadImageToBackend(uri, apiEndpoint);
//       }
//     });
//   };

//   const openGallery = async (apiEndpoint: string) => {
//     if (loading) return;
//     launchImageLibrary({ mediaType: 'photo' }, async (response) => {
//       if (!response.didCancel && !response.errorCode && response.assets?.[0]?.uri) {
//         const uri = response.assets[0].uri;
//         setPhotoUri(uri);
//         await uploadImageToBackend(uri, apiEndpoint);
//       }
//     });
//   };

//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

//       {/* 上半：使用者列 */}
//       <View style={styles.topArea}>
//         <View style={styles.userCard}>
//           <Image source={require('../img/elderlyhome/grandpa.png')} style={styles.userIcon} />
//           <View style={{ flex: 1 }}>
//             <Text style={styles.userName}>爺爺</Text>
//           </View>
//         </View>
//       </View>

//       {/* 下半：白色圓角面板 */}
//       <View style={styles.panel}>
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={{ paddingBottom: 120 }}
//           style={{ flex: 1 }}
//         >
//           {/* 血壓卡片 */}
//           <View style={styles.topGrid}></View>
//           <TouchableOpacity
//             style={[styles.squareCard, styles.cardShadow, { backgroundColor: COLORS.cream }]}
//             onPress={() => openCamera(ENDPOINT_BLOOD)}
//             onLongPress={() => openGallery(ENDPOINT_BLOOD)}
//             disabled={loading}
//             activeOpacity={0.9}
//           >
//             <Text style={[styles.squareTitle, { color: COLORS.black }]}>血壓</Text>
//             <View style={styles.squareBottomRow}>
//               <View style={[styles.iconCircle, { backgroundColor: COLORS.black }]}>
//                 <MaterialIcons name="bloodtype" size={40} color="#fff" />
//               </View>
//             </View>
//             <Text style={styles.hint}>點一下：相機　｜　長按：相簿</Text>
//           </TouchableOpacity>

//           {/* 藥袋卡片 */}
//           <View style={styles.topGrid}></View>
//           <TouchableOpacity
//             style={[styles.squareCard, styles.cardShadow, { backgroundColor: COLORS.cream }]}
//             onPress={() => openCamera(ENDPOINT_MED)}
//             onLongPress={() => openGallery(ENDPOINT_MED)}
//             disabled={loading}
//             activeOpacity={0.9}
//           >
//             <Text style={[styles.squareTitle, { color: COLORS.black }]}>藥袋</Text>
//             <View style={styles.squareBottomRow}>
//               <View style={[styles.iconCircle, { backgroundColor: COLORS.black }]}>
//                 <MaterialIcons name="medication" size={40} color="#fff" />
//               </View>
//             </View>
//             <Text style={styles.hint}>點一下：相機　｜　長按：相簿</Text>
//           </TouchableOpacity>
//         </ScrollView>
//       </View>

//       {/* 底部回首頁按鈕 */}
//       <TouchableOpacity
//         style={[styles.homeButton, loading && styles.disabledButton]}
//         onPress={() => navigation.navigate('ElderHome')}
//         disabled={loading}
//         activeOpacity={0.8}
//       >
//         <MaterialIcons name="home" size={80} color={COLORS.white} />
//       </TouchableOpacity>

//       {/* 載入中遮罩 */}
//       {loading && (
//         <View style={styles.loadingMask}>
//           <ActivityIndicator size="large" color={COLORS.white} />
//           <Text style={{ color: COLORS.white, marginTop: 8 }}>處理中…</Text>
//         </View>
//       )}
//     </View>
//   );
// }

// const IMAGE_SIZE = 80;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: COLORS.black },
//   topArea: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: COLORS.black },
//   userCard: {
//     backgroundColor: COLORS.black,
//     borderRadius: 20,
//     paddingHorizontal: 4,
//     paddingVertical: 8,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//     elevation: 3,
//   },
//   userIcon: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: IMAGE_SIZE / 2 },
//   userName: { color: COLORS.white, fontSize: 35, fontWeight: '900' },

//   panel: {
//     flex: 1,
//     backgroundColor: COLORS.white,
//     borderTopLeftRadius: 28,
//     borderTopRightRadius: 28,
//     paddingTop: 16,
//     paddingHorizontal: 16,
//   },
//   cardShadow: {
//     shadowColor: '#000',
//     shadowOpacity: 0.15,
//     shadowRadius: 6,
//     shadowOffset: { width: 0, height: 4 },
//     elevation: 5,
//   },
//   topGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
//   squareCard: {
//     flex: 1,
//     borderRadius: 20,
//     padding: 18,
//     height: 180,
//     justifyContent: 'space-between',
//   },
//   squareTitle: { fontSize: 38, fontWeight: '900' },
//   squareBottomRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
//   iconCircle: {
//     width: 50, height: 50, borderRadius: 30,
//     alignItems: 'center', justifyContent: 'center',
//   },
//   hint: { marginTop: 8, color: '#666', fontSize: 12 },

//   disabledButton: { opacity: 0.5 },

//   homeButton: {
//     position: 'absolute',
//     bottom: 20,
//     alignSelf: 'center',
//     width: 120,
//     height: 120,
//     borderRadius: 90,
//     backgroundColor: COLORS.black,
//     justifyContent: 'center',
//     alignItems: 'center',
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//     shadowOffset: { width: 0, height: 2 },
//   },

//   loadingMask: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(0,0,0,0.45)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
// });