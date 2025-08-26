import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type ElderlyUploadNavProp = StackNavigationProp<RootStackParamList, 'ElderlyUpload'>;

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
};

export default function ElderlyUpload() {
  const navigation = useNavigation<ElderlyUploadNavProp>();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    } else {
      return true;
    }
  };

  const uploadImageToBackend = async (uri: string, apiEndpoint: string) => {
    const token = await AsyncStorage.getItem('access');
    const formData = new FormData();
    formData.append('image', {
      uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    try {
      setLoading(true);
      const response = await axios.post(apiEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      const { message, duplicate } = response.data;
      if (duplicate) {
        Alert.alert("⚠️ 提醒", message);
      } else {
        Alert.alert("✅ 成功", message);
      }
      setPhotoUri(null);
    } catch (error: any) {
      console.error('上傳錯誤:', error?.message ?? error);
      Alert.alert('上傳或辨識錯誤', error?.message ?? '請確認後端服務');
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

    launchCamera({ mediaType: 'photo', saveToPhotos: true }, async response => {
      if (!response.didCancel && !response.errorCode && response.assets?.[0]?.uri) {
        const uri = response.assets[0].uri;
        setPhotoUri(uri);
        await uploadImageToBackend(uri, apiEndpoint);
      }
    });
  };

  const openGallery = async (apiEndpoint: string) => {
    if (loading) return;
    launchImageLibrary({ mediaType: 'photo' }, async response => {
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
            <Text style={styles.userName}>爺爺</Text>
          </View>
        </View>
      </View>

      {/* 下半：白色圓角面板 */}
      <View style={styles.panel}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }} // ✅ 預留按鈕空間
          style={{ flex: 1 }}
        >

          {/* 血壓按鈕 */}
          <View style={styles.topGrid}></View>
          <TouchableOpacity
            style={[styles.squareCard, styles.cardShadow, { backgroundColor: COLORS.cream }]}
            onPress={() => openCamera('http://192.168.0.55:8000/api/ocrblood/')}
            disabled={loading}
            activeOpacity={0.9}
          >
            <Text style={[styles.squareTitle, { color: COLORS.black }]}>血壓</Text>
            <View style={styles.squareBottomRow}>
              <View style={[styles.iconCircle, { backgroundColor: COLORS.black }]}>
                <MaterialIcons name="bloodtype" size={40} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>

          {/* 藥袋按鈕 */}
          <View style={styles.topGrid}></View>
          <TouchableOpacity
            style={[styles.squareCard, styles.cardShadow, { backgroundColor: COLORS.cream }]}
            onPress={() => openCamera('http://192.168.0.55:8000/ocr-analyze/')}
            disabled={loading}
            activeOpacity={0.9}
          >
            <Text style={[styles.squareTitle, { color: COLORS.black }]}>藥袋</Text>
            <View style={styles.squareBottomRow}>
              <View style={[styles.iconCircle, { backgroundColor: COLORS.black }]}>
                <MaterialIcons name="medication" size={40} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ✅ 底部圓形回首頁按鈕 */}
      <TouchableOpacity
        style={[styles.homeButton, loading && styles.disabledButton]}
        onPress={() => navigation.navigate('ElderHome')}
        disabled={loading}
        activeOpacity={0.8}
      >
        <MaterialIcons name="home" size={80} color={COLORS.white} />
      </TouchableOpacity>
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
    height: 160,
    justifyContent: 'space-between',
  },
  squareTitle: { fontSize: 38, fontWeight: '900' },
  squareBottomRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  iconCircle: {
    width: 50, height: 50, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
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
});


// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   PermissionsAndroid,
//   Platform,
//   ActivityIndicator,
//   ScrollView,
// } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
// import axios from 'axios';
// import { StackNavigationProp } from '@react-navigation/stack';
// import { RootStackParamList } from '../App';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// type ElderlyUploadNavProp = StackNavigationProp<RootStackParamList, 'ElderlyUpload'>;

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
//     } else {
//       return true;
//     }
//   };

//   const uploadImageToBackend = async (uri: string, apiEndpoint: string) => {
//     const token = await AsyncStorage.getItem('access');
//     console.log('🧪 token:', token);

//     const formData = new FormData();
//     formData.append('image', {
//       uri,
//       type: 'image/jpeg',
//       name: 'photo.jpg',
//     } as any);

//     try {
//       setLoading(true);
//       const response = await axios.post(apiEndpoint, formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//           'Authorization': `Bearer ${token}`,
//         },
//       });

//       const { message, duplicate } = response.data;

//       if (duplicate) {
//         Alert.alert("⚠️ 提醒", message); // e.g., 此藥單內容已完全上傳過
//       } else {
//         Alert.alert("✅ 成功", message); // e.g., 成功寫入 3 筆藥單資料
//       }
//       setPhotoUri(null);
//     } catch (error: any) {
//       console.error('上傳錯誤:', error?.message ?? error);
//       Alert.alert('上傳或辨識錯誤', error?.message ?? '請確認後端服務');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const chooseImageOrCamera = (apiEndpoint: string) => {
//     Alert.alert(
//       '選擇圖片來源',
//       '',
//       [
//         {
//           text: '拍照',
//           onPress: () => openCamera(apiEndpoint),
//         },
//         {
//           text: '從相簿選擇',
//           onPress: () => openGallery(apiEndpoint),
//         },
//         {
//           text: '取消',
//           style: 'cancel',
//         },
//       ],
//       { cancelable: true },
//     );
//   };

//   const openCamera = async (apiEndpoint: string) => {
//     if (loading) return;

//     const hasPermission = await requestCameraPermission();
//     if (!hasPermission) {
//       Alert.alert('權限不足', '請到設定開啟相機權限');
//       return;
//     }

//     launchCamera({ mediaType: 'photo', saveToPhotos: true }, async response => {
//       if (response.didCancel) {
//         console.log('使用者取消拍照');
//       } else if (response.errorCode) {
//         console.warn('相機錯誤:', response.errorMessage);
//       } else if (response.assets && response.assets.length > 0) {
//         const uri = response.assets[0].uri;
//         setPhotoUri(uri ?? null);
//         if (uri) {
//           await uploadImageToBackend(uri, apiEndpoint);
//         }
//       }
//     });
//   };

//   const openGallery = async (apiEndpoint: string) => {
//     if (loading) return;

//     launchImageLibrary({ mediaType: 'photo' }, async response => {
//       if (response.didCancel) {
//         console.log('使用者取消選擇相片');
//       } else if (response.errorCode) {
//         console.warn('選擇相片錯誤:', response.errorMessage);
//       } else if (response.assets && response.assets.length > 0) {
//         const uri = response.assets[0].uri;
//         setPhotoUri(uri ?? null);
//         if (uri) {
//           await uploadImageToBackend(uri, apiEndpoint);
//         }
//       }
//     });
//   };

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <View style={styles.header}>
//         <Image source={require('../img/elderlyupload/add-photo.png')} style={styles.icon} />
//         <Text style={styles.title}>CareMate</Text>
//         <Image source={require('../img/elderlyupload/logo.png')} style={styles.logo} />
//       </View>

//       <Text style={styles.pageTitle}>拍照上傳</Text>

//       <TouchableOpacity
//         style={styles.bigButton}
//         onPress={() => chooseImageOrCamera('http://192.168.0.55:8000/api/ocrblood/')}
//         disabled={loading}
//       >
//         <Image source={require('../img/elderlyupload/blood_preasure.png')} style={styles.bigIcon} />
//         <Text style={styles.bigText}>血壓</Text>
//       </TouchableOpacity>

//       <TouchableOpacity
//         style={styles.bigButton}
//         onPress={() => chooseImageOrCamera('http://192.168.0.55:8000/ocr-analyze/')}
//         disabled={loading}
//       >
//         <Image source={require('../img/elderlyupload/medicine.png')} style={styles.bigIcon} />
//         <Text style={styles.bigText}>藥袋</Text>
//       </TouchableOpacity>

//       {photoUri && <Image source={{ uri: photoUri }} style={styles.previewImage} />}
//       {loading && <ActivityIndicator size="large" color="#007aff" style={{ marginTop: 20 }} />}

//       <TouchableOpacity
//         style={[styles.backButton, loading && styles.disabledButton]}
//         onPress={() => navigation.navigate('ElderHome')}
//         disabled={loading}
//       >
//         <Text style={styles.backText}>回首頁</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: 'center',
//     backgroundColor: '#FCFEED',
//   },
//   header: {
//     width: '100%',
//     height: 70,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     backgroundColor: '#65B6E4',
//     paddingHorizontal: 10,
//     marginBottom: 20,
//   },
//   icon: {
//     width: 40,
//     height: 40,
//     marginTop: 15,
//   },
//   logo: {
//     width: 60,
//     height: 60,
//     marginTop: 15,
//   },
//   title: {
//     fontSize: 40,
//     fontWeight: '900',
//     color: '#000',
//     marginTop: 15,
//   },
//   pageTitle: {
//     fontSize: 36,
//     fontWeight: '900',
//     marginBottom: 30,
//   },
//   bigButton: {
//     width: '85%',
//     height: 110,
//     backgroundColor: '#F4C80B',
//     borderRadius: 15,
//     borderWidth: 3,
//     marginBottom: 20,
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   bigIcon: {
//     width: 60,
//     height: 60,
//     marginRight: 20,
//   },
//   bigText: {
//     fontSize: 36,
//     fontWeight: '900',
//   },
//   previewImage: {
//     width: 300,
//     height: 300,
//     borderRadius: 8,
//     marginVertical: 16,
//   },
//   backButton: {
//     width: '60%',
//     height: 50,
//     backgroundColor: '#F58402',
//     borderRadius: 15,
//     borderWidth: 3,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 30,
//   },
//   disabledButton: {
//     opacity: 0.5,
//   },
//   backText: {
//     fontSize: 24,
//     fontWeight: '900',
//   },
// });