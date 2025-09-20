// FamilyScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, StatusBar, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type FamilyNavProp = StackNavigationProp<RootStackParamList, 'FamilyScreen'>;
type FamilyRouteProp = RouteProp<RootStackParamList, 'FamilyScreen'>;

interface Member {
  UserID: number;
  Name: string;
  RelatedID: number | null;
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
      await AsyncStorage.removeItem('selectedMember');

      const token = await AsyncStorage.getItem('access');
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
        return;
      }

      try {
        // 1) /account/me
        const resMe = await fetch('http://192.168.31.126:8000/account/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resMe.ok) throw new Error('取得使用者失敗');
        const user = await resMe.json();

        setUserId(user?.UserID ?? null);

        // ① 家庭名稱：後端 → 本地 → 退回
        let nameFromApi =
          user?.FamilyName ||
          user?.family_name ||
          user?.Family?.FamilyName ||
          user?.Family?.name ||
          user?.family?.FamilyName ||
          user?.family?.name ||
          '';

        if (!nameFromApi) {
          const localName = await AsyncStorage.getItem('family_name');
          if (localName && localName.trim()) nameFromApi = localName.trim();
        }
        setFamilyName(nameFromApi || `${user?.Name ?? ''}的家庭`);

        // ② 家庭代碼：後端 → 本地
        let fcode = user?.Fcode ?? null;
        if (!fcode) {
          const localF = await AsyncStorage.getItem('fcode');
          if (localF && localF.trim()) fcode = localF.trim();
        }
        setFamilyCode(fcode);

        // 2) /family/members/
        const resMembers = await fetch('http://192.168.31.126:8000/family/members/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resMembers.ok) throw new Error('取得成員失敗');

        const membersData = await resMembers.json();
        if (Array.isArray(membersData)) {
          const filtered = mode === 'select'
            ? membersData.filter((m: Member) => m.RelatedID !== null)
            : membersData;
          setMembers(filtered);
        } else {
          setMembers([]);
        }

        // ③ 若仍沒有名字，嘗試從 members 回傳猜測一次
        if (!nameFromApi) {
          let fromMembers: string | null = null;
          if (Array.isArray(membersData)) {
            for (const m of membersData as any[]) {
              const n = m?.FamilyName || m?.family_name || m?.family?.name || m?.family?.FamilyName;
              if (typeof n === 'string' && n.trim()) { fromMembers = n.trim(); break; }
            }
          } else if (membersData && typeof membersData === 'object') {
            const n = (membersData as any).FamilyName || (membersData as any).family_name;
            if (typeof n === 'string' && n.trim()) fromMembers = n.trim();
          }
          if (fromMembers) setFamilyName(fromMembers);
        }
      } catch (error) {
        console.error('取得家庭資料失敗:', error);
        setMembers([]);

        // 失敗亦用本地備援
        const localName = await AsyncStorage.getItem('family_name');
        if (localName && localName.trim()) setFamilyName(localName.trim());
        const localF = await AsyncStorage.getItem('fcode');
        if (localF && localF.trim()) setFamilyCode(localF.trim());

        Alert.alert('讀取失敗', '無法取得家庭資料，請稍後再試');
      }
    };

    fetchUserAndMembers();
  }, [mode, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* ===== HERO（頂部黑色卡，僅顯示家庭資訊） ===== */}
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

      {/* ===== 成員網格 ===== */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.grid}>
          {members.length > 0 ? (
            members.map((m, idx) => (
              <Pressable
                key={`${m.UserID}-${idx}`}
                onPress={async () => {
                  await AsyncStorage.setItem('selectedMember', JSON.stringify(m));
                  navigation.navigate('ChildHome');
                }}
                android_ripple={{ color: '#00000010' }}
                style={({ pressed }) => [
                  styles.card,
                  lightShadow,
                  pressed && { transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={styles.name} numberOfLines={1}>{m.Name}</Text>
                <Text
                  style={[
                    styles.roleBadge,
                    m.RelatedID ? styles.elderBadge : styles.familyBadge,
                  ]}
                >
                  {m.RelatedID ? '長者' : '家人'}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={{ textAlign: 'center', color: COLORS.textMid, marginTop: 24 }}>
              尚未取得成員資料
            </Text>
          )}
        </View>
      </ScrollView>

      {/* ===== 底部兩顆主要動作 ===== */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => {
            if (userId !== null) {
              navigation.navigate('RegisterScreen', {
                mode: 'addElder',
                creatorId: userId,
              });
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

/* ===== Styles（原樣保留） ===== */
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
  },
  name: { fontSize: 16, fontWeight: '900', color: COLORS.textDark },

  roleBadge: {
    marginTop: 8,
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
    left: 0, right: 0, bottom: 0,
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
