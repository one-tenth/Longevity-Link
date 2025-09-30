// screens/FamilyScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { getAvatarSource } from '../utils/avatarMap';

type FamilyNavProp = StackNavigationProp<RootStackParamList, 'FamilyScreen'>;
type FamilyRouteProp = RouteProp<RootStackParamList, 'FamilyScreen'>;

interface Member {
  UserID: number;
  Name: string;
  RelatedID: number | null;
  avatar?: string;
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

const API_BASE = 'http://192.168.0.24:8000';


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

const FamilyScreen = () => {
  const navigation = useNavigation<FamilyNavProp>();
  const route = useRoute<FamilyRouteProp>();
  const mode = route.params?.mode || 'full';

  const [familyName, setFamilyName] = useState('家庭');
  const [familyCode, setFamilyCode] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    const fetchUserAndMembers = async () => {
      const token = await AsyncStorage.getItem('access');
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
        return;
      }

      try {
        const resMe = await fetch(`${API_BASE}/account/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resMe.ok) throw new Error('取得使用者失敗');
        const user = await resMe.json();

        setUserId(user?.id ?? user?.UserID ?? null);
        setFamilyName(
          user?.FamilyName ?? user?.Family?.Name ?? user?.family_name ?? '家庭'
        );
        const codeGuess =
          user?.FamilyCode ?? 
          user?.family_code ?? 
          user?.FamilyID?.Code ?? 
          user?.FamilyID?.code ?? 
          (typeof user?.FamilyID === 'string' ? user.FamilyID : null) ?? 
          null;
        setFamilyCode(codeGuess);

        const resMembers = await fetch(`${API_BASE}/family/members/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resMembers.ok) throw new Error('取得成員失敗');

        const membersData = await resMembers.json();
        if (Array.isArray(membersData)) {
          const filtered =
            mode === 'select'
              ? membersData.filter((m: Member) => m.RelatedID !== null)
              : membersData;
          setMembers(filtered);
        } else {
          setMembers([]);
        }
      } catch (error) {
        console.error('取得家庭資料失敗:', error);
        setMembers([]);
        Alert.alert('讀取失敗', '無法取得家庭資料，請稍後再試');
      }
    };

    fetchUserAndMembers();
  }, [mode, navigation]);

  const handleSelect = async (m: Member) => {
    if (m.RelatedID === null) {
      Alert.alert('無法選擇', '家人無法選擇');
      return;
    }

    const elderId = m.RelatedID ?? m.UserID;
    await AsyncStorage.setItem('selectedMember', JSON.stringify(m));
    await AsyncStorage.setItem('elder_id', String(elderId));
    await AsyncStorage.setItem('elder_name', m.Name);
    navigation.navigate('ChildHome');
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* ===== HERO ===== */}
      <View style={[styles.hero, outerShadow, { backgroundColor: COLORS.black }]}>
        <Text style={styles.familyTitle}>
          {familyName}（{members.length}）
        </Text>

        {familyCode ? (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>家庭代碼</Text>
            <Text style={styles.codeValue}>{familyCode}</Text>
          </View>
        ) : null}
      </View>

      {/* ===== 成員清單 ===== */}
      <ScrollView contentContainerStyle={styles.grid}>
        {members.length > 0 ? (
          <>
            {/* 顯示長者 */}
            {members
              .filter((m) => m.RelatedID !== null)
              .map((m) => {
                const src = getAvatarSource(m.avatar) as any | undefined;
                const initial = m?.Name?.[0] ?? '人';

                return (
                  <Pressable
                    key={m.UserID}
                    onPress={() => handleSelect(m)}  // 只有長者可以選擇
                    android_ripple={{ color: '#00000010' }}
                    style={({ pressed }) => [
                      styles.card,
                      lightShadow,
                      pressed && { transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    {src ? (
                      <Image source={src} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Text style={styles.avatarText}>{initial}</Text>
                      </View>
                    )}

                    <Text style={styles.name}>{m.Name ?? '（未命名）'}</Text>
                    <Text style={[styles.roleBadge, styles.elderBadge]}>
                      長者
                    </Text>
                  </Pressable>
                );
              })}

            {/* 顯示家人 */}
            {members
              .filter((m) => m.RelatedID === null)
              .map((m) => {
                const src = getAvatarSource(m.avatar) as any | undefined;
                const initial = m?.Name?.[0] ?? '人';

                return (
                  <Pressable
                    key={m.UserID}
                    style={({ pressed }) => [
                      styles.card,
                      lightShadow,
                      pressed && { transform: [{ scale: 0.98 }] },
                    ]}
                    disabled={true}  // 禁用家人的選擇
                  >
                    {src ? (
                      <Image source={src} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Text style={styles.avatarText}>{initial}</Text>
                      </View>
                    )}

                    <Text style={styles.name}>{m.Name ?? '（未命名）'}</Text>
                    <Text style={[styles.roleBadge, styles.familyBadge]}>
                      家人
                    </Text>
                  </Pressable>
                );
              })}
          </>
        ) : (
          <Text style={{ textAlign: 'center', color: COLORS.textMid, marginTop: 24 }}>
            尚未取得成員資料
          </Text>
        )}
      </ScrollView>

      {/* ===== 底部按鈕 ===== */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => {
            if (userId !== null) {
              navigation.navigate('RegisterScreen', {
                mode: 'addElder',
                creatorId: userId,
              });
            } else {
              Alert.alert('無法新增', '尚未取得使用者資訊');
            }
          }}
          android_ripple={{ color: '#FFFFFF20' }}
          style={({ pressed }) => [
            styles.bottomBtn,
            { backgroundColor: COLORS.green },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={[styles.bottomText, { color: COLORS.black }]}>新增成員</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.goBack()}
          android_ripple={{ color: '#FFFFFF20' }}
          style={({ pressed }) => [
            styles.bottomBtn,
            { backgroundColor: COLORS.black },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={[styles.bottomText, { color: COLORS.white }]}>回首頁</Text>
        </Pressable>
      </View>
    </View>
  );
};

// Styles...
/* ====== Styles ====== */
const styles = StyleSheet.create({
  hero: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: R,
    alignItems: 'center',
  },
  familyTitle: { color: COLORS.white, fontSize: 22, fontWeight: '900' },

  codeBox: {
    marginTop: 12,
    backgroundColor: '#ffffff10',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  codeLabel: { color: COLORS.green, fontWeight: '800', marginBottom: 2 },
  codeValue: { color: COLORS.white, fontSize: 16, fontWeight: '900', letterSpacing: 1 },

  grid: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingBottom: 100,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },

  card: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: R,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.grayBox,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallback: {
    backgroundColor: '#EAF6EA',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark,
  },

  name: { fontSize: 16, fontWeight: '900', color: COLORS.textDark },

  roleBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '900',
    overflow: 'hidden',
  },
  elderBadge: { backgroundColor: '#FF8A65', color: COLORS.white },
  familyBadge: { backgroundColor: COLORS.green, color: COLORS.black },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 84,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    ...outerShadow,
  },
  bottomBtn: {
    flex: 1,
    borderRadius: R,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  bottomText: { fontSize: 16, fontWeight: '900' },
});

export default FamilyScreen;
