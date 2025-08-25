import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

interface UserProfile {
  UserID: number;
  Name: string;
  Phone: string;
  Gender: string;
  Borndate: string;
  FamilyID: string;
  Fcode: string;
}

const ProfileScreen = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = await AsyncStorage.getItem('access');
      if (!token) {
        Alert.alert('請先登入', '您尚未登入，請前往登入畫面');
        navigation.navigate('LoginScreen' as never);
        return;
      }

      try {
        const res = await fetch('http://172.20.10.4:8000/account/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('取得失敗');
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error('載入個人資料失敗:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  }

  if (!profile) {
    return <Text style={styles.errorText}>無法載入個人資料</Text>;
  }

  return (
    <View style={styles.container}>
      <Image source={require('../img/childhome/image.png')} style={styles.avatar} />
      <Text style={styles.title}>{profile.Name}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>帳號（電話）</Text>
        <Text style={styles.value}>{profile.Phone}</Text>

        <Text style={styles.label}>性別</Text>
        <Text style={styles.value}>{profile.Gender === 'M' ? '男' : '女'}</Text>

        <Text style={styles.label}>生日</Text>
        <Text style={styles.value}>{profile.Borndate}</Text>

      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>返回首頁</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFEED',
    alignItems: 'center',
    paddingTop: 40,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    width: '85%',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#ccc',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
    marginTop: 12,
  },
  value: {
    fontSize: 16,
    color: '#222',
    marginTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 6,
  },
  errorText: {
    marginTop: 40,
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#FBC02D',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});
