// FamilyAddHospital.tsx — polished UI rev
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  Pressable,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../App';

const BASE = 'http://192.168.0.24:8000';

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
  grayBox: '#F2F2F2',
};

const SPACING = 16;
const RADIUS = 16;

const shadow = {
  elevation: 6,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
} as const;

async function authPost<T>(url: string, data: any) {
  const access = await AsyncStorage.getItem('access');
  return axios.post<T>(`${BASE}${url}`, data, {
    headers: { Authorization: `Bearer ${access}` },
    timeout: 10000,
  });
}

export default function FamilyAddHospital() {
  const route = useRoute<any>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'FamilyAddHospital'>>();

  const elderIdParam: number | undefined = route?.params?.elderId;
  const [elderId, setElderId] = useState<number | null>(typeof elderIdParam === 'number' ? elderIdParam : null);
  const [clinicDate, setClinicDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [clinicPlace, setClinicPlace] = useState('');
  const [doctor, setDoctor] = useState('');
  const [num, setNum] = useState('');
  const [loading, setLoading] = useState(false);

  // UI animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const saveScale = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current; // header progress bar when loading

  useEffect(() => {
    (async () => {
      if (elderId === null) {
        const savedIdStr = await AsyncStorage.getItem('elder_id');
        const savedId = savedIdStr ? Number(savedIdStr) : NaN;
        if (!Number.isNaN(savedId)) setElderId(savedId);
      }
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true, easing: Easing.out(Easing.cubic) }).start();
    })();
  }, [elderId, fadeAnim]);

  useEffect(() => {
    if (loading) {
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 1100, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }).start();
    }
  }, [loading, progress]);

  const handleAdd = async () => {
    setLoading(true);
    try {
      let effElderId: number | null = typeof route?.params?.elderId === 'number' ? route.params.elderId : elderId;

      if (effElderId == null || Number.isNaN(effElderId)) {
        const savedIdStr = await AsyncStorage.getItem('elder_id');
        const savedId = savedIdStr ? Number(savedIdStr) : NaN;
        if (!Number.isNaN(savedId)) effElderId = savedId;
      }
      if (effElderId == null || Number.isNaN(effElderId)) {
        Alert.alert('提醒', '尚未指定長者');
        return;
      }
      if (!clinicPlace.trim()) {
        Alert.alert('提醒', '請填寫地點');
        return;
      }
      if (!doctor.trim()) {
        Alert.alert('提醒', '請填寫醫師');
        return;
      }

      const dateStr = clinicDate.toISOString().split('T')[0];

      await authPost(`/api/hospital/create/?user_id=${effElderId}`, {
        ClinicDate: dateStr,
        ClinicPlace: clinicPlace.trim(),
        Doctor: doctor.trim(),
        Num: Number(num) || 0,
      });

      Alert.alert('成功', '儲存成功');
      navigation.goBack();
    } catch (e: any) {
      const msg = e?.response?.data?.error || '儲存失敗';
      Alert.alert('錯誤', msg);
    } finally {
      setLoading(false);
    }
  };

  const dateLabel = useMemo(
    () => clinicDate.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    [clinicDate]
  );
  const timeLabel = useMemo(() => {
    const hh = clinicDate.getHours().toString().padStart(2, '0');
    const mm = clinicDate.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }, [clinicDate]);

  // Field focus states for nicer outline
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const isFocused = (k: string) => focusKey === k;

  const onPressInSave = () => Animated.spring(saveScale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOutSave = () => Animated.spring(saveScale, { toValue: 1, friction: 3, useNativeDriver: true }).start();

  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'light-content'} backgroundColor={COLORS.black} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} android_ripple={{ color: '#00000010' }}>
          <FontAwesome5 name="arrow-left" size={18} color={COLORS.white} />
        </Pressable>
        <Text style={styles.headerTitle}>新增回診</Text>
        <View style={{ width: 40 }} />
        {/* Loading progress bar */}
      </View>
      {loading && (
        <View style={styles.progressWrap}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
      )}

      {/* Content */}
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={{ padding: SPACING }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>回診時間</Text>

        <Pressable
          onPress={() => setShowDate(true)}
          style={[styles.inputCard, shadow, isFocused('date') && styles.inputCardFocused]}
        >
          <View style={styles.iconWrap}> 
            <FontAwesome5 name="calendar-alt" size={18} color={COLORS.textDark} />
          </View>
          <Text style={styles.inputText}>{dateLabel}</Text>
        </Pressable>

        <Pressable
          onPress={() => setShowTime(true)}
          style={[styles.inputCard, shadow, isFocused('time') && styles.inputCardFocused]}
        >
          <View style={styles.iconWrap}> 
            <MaterialCommunityIcons name="clock-time-four" size={20} color={COLORS.textDark} />
          </View>
          <Text style={styles.inputText}>{timeLabel}</Text>
        </Pressable>

        <Text style={[styles.sectionTitle, { marginTop: SPACING }]}>就診資訊</Text>

        <View style={[styles.inputCard, shadow, isFocused('place') && styles.inputCardFocused]}
          onTouchStart={() => setFocusKey('place')}
          onTouchEnd={() => setFocusKey(null)}
        >
          <View style={styles.iconWrap}>
            <FontAwesome5 name="map-marker-alt" size={18} color={COLORS.textDark} />
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="請輸入地點"
            value={clinicPlace}
            onChangeText={setClinicPlace}
            placeholderTextColor={COLORS.textMid}
            autoCapitalize="none"
            onFocus={() => setFocusKey('place')}
            onBlur={() => setFocusKey(null)}
            returnKeyType="next"
          />
        </View>

        <View style={[styles.inputCard, shadow, isFocused('doctor') && styles.inputCardFocused]}
          onTouchStart={() => setFocusKey('doctor')}
          onTouchEnd={() => setFocusKey(null)}
        >
          <View style={styles.iconWrap}>
            <FontAwesome5 name="stethoscope" size={18} color={COLORS.textDark} />
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="請輸入醫師姓名"
            value={doctor}
            onChangeText={setDoctor}
            placeholderTextColor={COLORS.textMid}
            autoCapitalize="words"
            onFocus={() => setFocusKey('doctor')}
            onBlur={() => setFocusKey(null)}
            returnKeyType="next"
          />
        </View>

        <View style={[styles.inputCard, shadow, isFocused('num') && styles.inputCardFocused]}
          onTouchStart={() => setFocusKey('num')}
          onTouchEnd={() => setFocusKey(null)}
        >
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="format-list-numbered" size={20} color={COLORS.textDark} />
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="請輸入號碼"
            keyboardType="numeric"
            value={num}
            onChangeText={setNum}
            placeholderTextColor={COLORS.textMid}
            onFocus={() => setFocusKey('num')}
            onBlur={() => setFocusKey(null)}
            returnKeyType="done"
          />
        </View>

        <View style={{ height: 80 }} />
      </Animated.ScrollView>

      {/* Save Button (sticky) */}
      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: saveScale }] }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPressIn={onPressInSave}
            onPressOut={onPressOutSave}
            onPress={handleAdd}
            disabled={loading}
            style={[styles.saveBtn, shadow, loading && { opacity: 0.7 }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.cream} />
            ) : (
              <Text style={styles.saveBtnText}>儲存</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Pickers */}
      {showDate && (
        <DateTimePicker
          value={clinicDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, sel) => {
            setShowDate(false);
            if (sel) {
              const d = new Date(clinicDate);
              d.setFullYear(sel.getFullYear(), sel.getMonth(), sel.getDate());
              setClinicDate(d);
            }
          }}
        />
      )}
      {showTime && (
        <DateTimePicker
          value={clinicDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, sel) => {
            setShowTime(false);
            if (sel) {
              const d = new Date(clinicDate);
              d.setHours(sel.getHours(), sel.getMinutes());
              setClinicDate(d);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.black,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 14,
    paddingHorizontal: SPACING,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  progressWrap: {
    height: 3,
    backgroundColor: COLORS.grayBox,
  },
  progressBar: {
    height: 3,
    backgroundColor: COLORS.green,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMid,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.grayBox,
    borderRadius: RADIUS,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 56,
    marginBottom: 12,
  },
  inputCardFocused: {
    borderWidth: 2,
    borderColor: COLORS.green,
    backgroundColor: COLORS.cream,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    paddingVertical: 8,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: SPACING,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayBox,
  },
  saveBtn: {
    alignSelf: 'center',
    backgroundColor: COLORS.green,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 36,
    minWidth: 180,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
