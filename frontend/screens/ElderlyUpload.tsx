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
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchCamera } from 'react-native-image-picker';
import axios from 'axios';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type ElderlyUploadNavProp = StackNavigationProp<RootStackParamList, 'ElderlyUpload'>;

export default function ElderlyUpload() {
  const navigation = useNavigation<ElderlyUploadNavProp>();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 相機權限請求
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

  // 上傳圖片到後端
  const uploadImageToBackend = async (uri: string) => {
    const formData = new FormData();
    formData.append('image', {
      uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    try {
      setLoading(true);
      const response = await axios.post('http://192.168.0.55:8000/api/ocr/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigation.navigate('ResultScreen', {
        ocrResult: response.data.text,
        analysisResult: response.data.analysis,
        photoUri: uri,
      });

      setPhotoUri(null);
    } catch (error: any) {
      console.error('上傳錯誤:', error?.message ?? error);
      Alert.alert('上傳或辨識錯誤', error?.message ?? '請確認後端服務');
    } finally {
      setLoading(false);
    }
  };

  // 開啟相機 → 拍照 → 上傳
  const openCamera = async () => {
    if (loading) return;

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('權限不足', '請到設定開啟相機權限');
      return;
    }

    launchCamera({ mediaType: 'photo', saveToPhotos: true }, async response => {
      if (response.didCancel) {
        console.log('使用者取消拍照');
      } else if (response.errorCode) {
        console.warn('相機錯誤:', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri;
        setPhotoUri(uri ?? null);
        if (uri) {
          await uploadImageToBackend(uri);
        }
      }
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 標題列 */}
      <View style={styles.header}>
        <Image source={require('../img/elderlyupload/add-photo.png')} style={styles.icon} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/elderlyupload/logo.png')} style={styles.logo} />
      </View>

      {/* 標題文字 */}
      <Text style={styles.pageTitle}>拍照上傳</Text>

      {/* 血壓按鈕 */}
      <TouchableOpacity style={styles.bigButton} onPress={openCamera} disabled={loading}>
        <Image source={require('../img/elderlyupload/blood_preasure.png')} style={styles.bigIcon} />
        <Text style={styles.bigText}>血壓</Text>
      </TouchableOpacity>

      {/* 藥袋按鈕 */}
      <TouchableOpacity style={styles.bigButton} onPress={openCamera} disabled={loading}>
        <Image source={require('../img/elderlyupload/medicine.png')} style={styles.bigIcon} />
        <Text style={styles.bigText}>藥袋</Text>
      </TouchableOpacity>

      {/* 預覽 */}
      {photoUri && <Image source={{ uri: photoUri }} style={styles.previewImage} />}
      {loading && <ActivityIndicator size="large" color="#007aff" style={{ marginTop: 20 }} />}

      {/* 回首頁 */}
      <TouchableOpacity
        style={[styles.backButton, loading && styles.disabledButton]}
        onPress={() => navigation.navigate('ElderHome')}
        disabled={loading}
      >
        <Text style={styles.backText}>回首頁</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    // padding: 20, 
    flex:1,
    alignItems: 'center', 
    backgroundColor: '#FCFEED' 
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
  previewImage: {
    width: 300,
    height: 300,
    borderRadius: 8,
    marginVertical: 16,
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
  disabledButton: {
    opacity: 0.5,
  },
  backText: {
    fontSize: 24,
    fontWeight: '900',
  },
});





// // elderlyupload.tsx
// import React from 'react';
// import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { StackNavigationProp } from '@react-navigation/stack';
// import { RootStackParamList } from '../App'; // 確認 App.tsx 裡定義了這個

// // ChildHome 頁面的 navigation 型別
// type ElderlyUploadNavProp = StackNavigationProp<RootStackParamList, 'ElderlyUpload'>;

// export default function ElderlyUpload() {
//   const navigation = useNavigation<ElderlyUploadNavProp>();

//   return (
//     <View style={styles.container}>
//       {/* 標題列 */}
//       <View style={styles.header}>
//         <Image source={require('../img/elderlyupload/add-photo.png')} style={styles.icon} />
//         <Text style={styles.title}>CareMate</Text>
//         <Image source={require('../img/elderlyupload/logo.png')} style={styles.logo} />
//       </View>

//       {/* 標題文字 */}
//       <Text style={styles.pageTitle}>拍照上傳</Text>

//       {/* 血壓按鈕 */}
//       <TouchableOpacity style={styles.bigButton}>
//         <Image source={require('../img/elderlyupload/blood_preasure.png')} style={styles.bigIcon} />
//         <Text style={styles.bigText}>血壓</Text>
//       </TouchableOpacity>

//       {/* 藥袋按鈕 */}
//       <TouchableOpacity style={styles.bigButton}>
//         <Image source={require('../img/elderlyupload/medicine.png')} style={styles.bigIcon} />
//         <Text style={styles.bigText}>藥袋</Text>
//       </TouchableOpacity>

//       {/* 回首頁 */}
//       <TouchableOpacity
//         style={styles.backButton}
//         onPress={() => navigation.navigate('ElderHome')}
//       >
//         <Text style={styles.backText}>回首頁</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#FCFEED',
//     alignItems: 'center',
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
//   backText: {
//     fontSize: 24,
//     fontWeight: '900',
//   },
// });
