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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import { RootStackParamList } from '../App';

type NavProp = StackNavigationProp<RootStackParamList, 'Profile'>;

interface UserProfile {
  UserID: number;
  Name: string;
  Phone: string;
  Gender: string;   // 'M' | 'F' | others
  Borndate: string; // YYYY-MM-DD
  FamilyID: string;
  Fcode: string;
}

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
  grayBox: '#F2F2F2',
};

const R = 22;

/* 外層大框陰影（自然） */
const outerShadow = {
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
} as const;

/* 功能卡輕陰影 */
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
        navigation.navigate('LoginScreen' as never);
        return;
      }

      try {
        const res = await fetch('http://192.168.0.55:8000/account/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('取得失敗');
        const data = await res.json();
        setProfile(data);
        // 順便把名稱放到本地（供他處使用）
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
    await AsyncStorage.multiRemove(['access', 'refresh', 'selectedMember', 'elder_id', 'elder_name', 'user_name']);
    Alert.alert('已登出');
    navigation.navigate('index' as never);
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

      {/* ==== HERO（黑色大卡） ==== */}
      <View style={[styles.hero, { backgroundColor: COLORS.black }, outerShadow]}>
        <View style={styles.heroRow}>
          <Image source={require('../img/childhome/image.png')} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.hello, { color: COLORS.white }]}>{profile.Name || '使用者'}</Text>
            <Text style={{ color: COLORS.green, opacity: 0.95 }}>
              {profile.Phone || ''} · {getGenderText(profile.Gender)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Setting' as never)}
            style={[styles.iconBtn, { backgroundColor: COLORS.green }]}
          >
            <Feather name="settings" size={22} color={COLORS.black} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 內容捲動區：底部預留空間避免被功能列蓋到 */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ==== 統計列（可作為基本資料速覽） ==== */}
        <View style={[styles.statsBar, outerShadow]}>
          <StatBox title="生日" value={profile.Borndate || '—'} />
          <StatBox title="家庭ID" value={profile.FamilyID || '—'} />
          <StatBox title="家庭代碼" value={profile.Fcode || '—'} />
          <StatBox title="用戶ID" value={String(profile.UserID || '—')} />
        </View>

        {/* ==== 2x2 快捷卡 ==== */}
        <View style={styles.grid2x2}>
          <QuickIcon
            big
            bg={COLORS.green}
            icon={<Feather name="edit-2" size={32} color={COLORS.black} />}
            label="編輯資料"
            onPress={() => navigation.navigate('Setting' as never)}
            darkLabel={false}
          />
          <QuickIcon
            big
            bg={COLORS.cream}
            icon={<MaterialIcons name="notifications-active" size={32} color={COLORS.textDark} />}
            label="通知設定"
            onPress={() => navigation.navigate('Setting' as never)}
          />
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

      {/* ==== 底部功能列（與 ChildHome 一致） ==== */}
      <View style={styles.bottomBox}>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('Profile' as never)}>
          <FontAwesome name="user" size={28} color="#fff" />
          <Text style={styles.settingLabel}>個人</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('FamilyScreen', { mode: 'full' } as never)}>
          <FontAwesome name="home" size={28} color="#fff" />
          <Text style={styles.settingLabel}>家庭</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('ChildHome' as never)}>
          <FontAwesome name="exchange" size={28} color="#fff" />
          <Text style={styles.settingLabel}>切換</Text>
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

function StatBox({ title, value, suffix }: { title: string; value: string; suffix?: string }) {
  return (
    <View style={stats.box}>
      <Text style={stats.title}>{title}</Text>
      <Text style={stats.value}>
        {value}{suffix ? <Text style={stats.suffix}> {suffix}</Text> : null}
      </Text>
    </View>
  );
}

/* ====== Styles ====== */
const styles = StyleSheet.create({
  hero: { margin: 16, marginBottom: 8, padding: 16, borderRadius: R },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: COLORS.white },
  hello: { fontSize: 22, fontWeight: '900' },
  iconBtn: { padding: 10, borderRadius: 12 },

  /* 統計列：外層白底容器 + 陰影；內部四格灰底、無陰影 */
  statsBar: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  /* 2×2 方格 */
  grid2x2: {
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  /* 底部功能列（固定在底） */
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
  settingItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});

const quick = StyleSheet.create({
  item: { width: '47%', borderRadius: R, alignItems: 'center' },
  iconCircle: { alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 8, fontWeight: '900' },
});

const stats = StyleSheet.create({
  box: {
    width: '23%',
    backgroundColor: COLORS.grayBox,   // 四格灰底
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textMid },
  value: { fontSize: 20, fontWeight: '900', color: COLORS.black },
  suffix: { fontSize: 14, fontWeight: '700', color: COLORS.black },
});
