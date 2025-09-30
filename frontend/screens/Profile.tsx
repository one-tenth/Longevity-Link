import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import { RootStackParamList } from '../App';
import { getAvatarSource } from '../utils/avatarMap'; // ⭐ 使用 avatarMap

type NavProp = StackNavigationProp<RootStackParamList, 'Profile'>;

interface UserProfile {
  UserID: number;
  Name: string;
  Phone: string;
  Gender: string;   // 'M' | 'F' | others
  Borndate: string; // YYYY-MM-DD
  FamilyID: string;
  Fcode: string;
  avatar?: string;  // ⭐ 加入頭貼欄位
}

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
};

const R = 22;

const outerShadow = {
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
} as const;

const lightShadow = {
  elevation: 2,
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
} as const;

export default function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const getGenderText = (g?: string) => (g === 'M' ? '男' : g === 'F' ? '女' : '—');

  useEffect(() => {
    const fetchProfile = async () => {
      const token = await AsyncStorage.getItem('access');
      if (!token) {
        Alert.alert('請先登入', '您尚未登入，請前往登入畫面');
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'LoginScreen' }],
          })
        );
        return;
      }

      try {

        const res = await fetch('http://192.168.0.24:8000/account/me/', {

          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('取得失敗');
        const data = await res.json();

        // ⭐ 如果沒有 avatar，補上 woman.png 當預設
        const withAvatar: UserProfile = {
          ...data,
          avatar: data?.avatar || 'woman.png',
        };

        setProfile(withAvatar);
        if (data?.Name) await AsyncStorage.setItem('user_name', data.Name);
      } catch (err) {
        console.error('載入個人資料失敗:', err);
        Alert.alert('錯誤', '無法載入個人資料');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigation]);

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'access', 'refresh', 'selectedMember',
        'elder_id', 'elder_name', 'user_name'
      ]);

      setProfile(null);
      Alert.alert('已登出');

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'LoginScreen' }],
        })
      );
    } catch (e) {
      console.log('登出失敗', e);
      Alert.alert('提示', '登出時發生錯誤，但本地資料已清除。');
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'LoginScreen' }],
        })
      );
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
        <Text style={{ fontSize: 16, color: 'red' }}>無法載入個人資料</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ textDecorationLine: 'underline' }}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* ==== HERO ==== */}
      <View style={[styles.hero, { backgroundColor: COLORS.black }, outerShadow]}>
        <View style={styles.heroRow}>
          <Image source={getAvatarSource(profile.avatar)} style={styles.avatar} /> 
          <View style={{ flex: 1 }}>
            <Text style={[styles.hello, { color: COLORS.white }]}>{profile.Name || '使用者'}</Text>

          </View>
        </View>
      </View>

      {/* 內容區 */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* 基本資料（橫列） */}
        <View style={[styles.infoBox, outerShadow]}>
          <InfoRow label="生日" value={profile.Borndate || '—'} />
          <InfoRow label="電話號碼" value={profile.Phone || '—'} />
          <InfoRow label="性別" value={getGenderText(profile.Gender || '—')} />
        </View>

        {/* 快捷卡：家庭成員 / 登出 */}
        <View style={styles.grid2x2}>
          <QuickIcon
            big
            bg={COLORS.black}
            icon={<MaterialIcons name="group" size={32} color={COLORS.green} />}
            label="家庭成員"
            onPress={() => navigation.navigate('FamilyScreen', { mode: 'full' } as never)}
            darkLabel={false}
          />
          <QuickIcon
            big
            bg={COLORS.green}
            icon={<Feather name="log-out" size={32} color={COLORS.black} />}
            label="登出"
            onPress={logout}
            darkLabel={false}
          />
        </View>
      </ScrollView>

      {/* 底部功能列 */}
      <View style={styles.bottomBox}>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('Profile' as never)}>
          <FontAwesome name="user" size={28} color="#fff" />
          <Text style={styles.settingLabel}>個人</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('FamilyScreen', { mode: 'full' } as never)}>
          <FontAwesome name="home" size={28} color="#fff" />
          <Text style={styles.settingLabel}>家庭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ====== 子元件 ====== */
function QuickIcon({
  bg, icon, label, onPress, darkLabel = true, big = false,
}: {
  bg: string; icon: React.ReactNode; label: string; onPress: () => void; darkLabel?: boolean; big?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#00000010' }}
      style={({ pressed }) => [
        quick.item,
        { backgroundColor: bg, padding: big ? 20 : 16 },
        lightShadow,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={[quick.iconCircle, { width: big ? 60 : 52, height: big ? 60 : 52, borderRadius: big ? 30 : 26 }]}>{icon}</View>
      <Text style={[quick.label, { color: darkLabel ? COLORS.black : COLORS.white, fontSize: big ? 18 : 16 }]}>{label}</Text>
    </Pressable>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={info.row}>
      <Text style={info.label}>{label}</Text>
      <Text style={info.value}>{value}</Text>
    </View>
  );
}

/* ====== Styles ====== */
const styles = StyleSheet.create({
  hero: { margin: 16, marginBottom: 8, padding: 16, borderRadius: R },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: COLORS.white },
  hello: { fontSize: 22, fontWeight: '900' },

  infoBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },

  grid2x2: {
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  bottomBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    backgroundColor: COLORS.black,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  settingItem: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  settingLabel: { color: '#fff', fontSize: 13, fontWeight: '800' },
});

const quick = StyleSheet.create({
  item: { width: '47%', borderRadius: R, alignItems: 'center' },
  iconCircle: { alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 8, fontWeight: '900' },
});

const info = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMid,
  },
  value: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.black,
  },
});
