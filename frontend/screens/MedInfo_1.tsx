// MedInfo_1.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
    ScrollView, Pressable, StatusBar, RefreshControl, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

// 假設 RootStackParamList 在 '../App'
import { RootStackParamList } from '../App';

type NavProp = StackNavigationProp<RootStackParamList, 'MedInfo_1'>;
type RouteProps = RouteProp<RootStackParamList, 'MedInfo_1'>;

type MedItem = {
    MedId: number | string;
    MedName: string;
    DosageFrequency: string;
    AdministrationRoute: string;
};

// 嚴格使用您指定的顏色
const COLORS = {
    white: '#FFFFFF',
    black: '#111111',
    cream: '#FFFCEC', // 可作為黃色系的替代
    textDark: '#111',
    textMid: '#333',
    green: '#A6CFA1',
    grayBox: '#F2F2F2', // 背景色
    // 移除 orange, red, line
};


const BASE = 'https://caremate.ntub.edu.tw';

const R = 22; // BorderRadius

// 柔和陰影
const customShadow = {
    elevation: 6,
    shadowColor: COLORS.black,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
};

export default function MedInfo_1() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProps>();
    const prescriptionId = route.params?.prescriptionId;

    const [medList, setMedList] = useState<MedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const fetchMedDetails = useCallback(async () => {
        if (!prescriptionId) {
            setErrorMsg('尚未選擇藥單，請先回上一頁選擇。');
            setMedList([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setErrorMsg(null);

            const token = await AsyncStorage.getItem('access');
            if (!token) {
                setErrorMsg('尚未登入，請重新登入後再試。');
                setMedList([]);
                return;
            }

            const url = `${BASE}/api/meds/${encodeURIComponent(prescriptionId)}/`;
            const response = await axios.get<MedItem[]>(url, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000,
            });

            setMedList(Array.isArray(response.data) ? response.data : []);
        } catch (err: any) {
            console.error('❌ 撈詳細藥單失敗:', err?.response?.status, err?.response?.data || err?.message);
            if (err?.response?.status === 401) {
                setErrorMsg('登入已過期，請重新登入。');
            } else if (err?.response?.status === 404) {
                setErrorMsg('查無此藥單。');
            } else {
                setErrorMsg('取得用藥資料失敗，請稍後再試。');
            }
            setMedList([]);
        } finally {
            setLoading(false);
        }
    }, [prescriptionId]);

    useEffect(() => {
        fetchMedDetails();
    }, [fetchMedDetails]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchMedDetails();
        setRefreshing(false);
    }, [fetchMedDetails]);

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.white }}> 
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

            {/* ── Header（固定在頂部） ── */}
            <View style={[headerStyles.headerRow, customStyles.fixedHeader]}>
                <View style={headerStyles.sideSlot}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={[headerStyles.backBtn]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <FontAwesome name="arrow-left" size={22} color={COLORS.black} />
                    </TouchableOpacity>
                </View>
                
                <View style={headerStyles.centerSlot}>
                    <Text style={headerStyles.titleText}>用藥清單</Text>
                </View>

                <View style={headerStyles.sideSlot} />
            </View>
            {/* ─────────────────────────────────── */}


            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={COLORS.black} />
                    <Text style={customStyles.loadingText}>資料載入中…</Text>
                </View>
            ) : errorMsg ? (
                <ScrollView
                    contentContainerStyle={[customStyles.errorContainer]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    <Text style={customStyles.errorText}>
                        {errorMsg}
                    </Text>
                    {/* 按鈕改為綠色 (Green) */}
                    <TouchableOpacity
                        style={[styles.button, customStyles.retryButton]}
                        onPress={fetchMedDetails}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>重試</Text>
                    </TouchableOpacity>
                </ScrollView>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={customStyles.listContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {medList.length === 0 ? (
                        <View style={[styles.centerBox, { paddingTop: 60 }]}>
                            <Text style={customStyles.emptyText}>此藥單沒有任何用藥資料</Text>
                        </View>
                    ) : (
                        <>
                            {medList.map((m) => (
                                <FeatureCard
                                    key={m.MedId}
                                    title={m.MedName}
                                    subtitle={`頻率：${m.DosageFrequency}  ·  途徑：${m.AdministrationRoute}`}
                                    right={<MaterialIcons name="medication" size={28} color={COLORS.green} />} // 圖標改為綠色
                                    onPress={() => navigation.navigate('MedDetail', { medId: m.MedId })}
                                    withShadow
                                    darkText
                                    bg={COLORS.cream} // 列表卡片使用奶色/黃色系背景
                                />
                            ))}
                        </>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

// ----------------------------------------------------
// Header 相關樣式
// ----------------------------------------------------
const headerStyles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 14,
        marginBottom: 8,
        minHeight: 44, 
    },
    sideSlot: {
        width: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.grayBox, // 返回按鈕背景色
        borderRadius: 10,
    },
    centerSlot: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleText: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.black,
    }
});


function FeatureCard({
    bg, title, subtitle, right, onPress, darkText = false, withShadow = false,
}: {
    bg: string; title: string; subtitle?: string; right?: React.ReactNode; onPress: () => void;
    darkText?: boolean; withShadow?: boolean;
}) {
    // 由於背景色大多是 cream 或 white，文字使用深色
    const textColor = COLORS.textDark;
    const subTextColor = COLORS.textMid;

    return (
        <Pressable
            onPress={onPress}
            android_ripple={{ color: '#00000010' }}
            style={({ pressed }) => [
                feature.card,
                { backgroundColor: bg },
                withShadow && customShadow,
                pressed && { transform: [{ scale: 0.98 }] },
            ]}
        >
            <View style={{ flex: 1 }}>
                <Text style={[feature.title, { color: textColor }]}>{title}</Text> 
                {!!subtitle && <Text style={[feature.sub, { color: subTextColor }]}>{subtitle}</Text>} 
            </View>
            {right}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },

    button: {
        marginTop: 14,
        width: '60%',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        alignSelf: 'center',
    },
    buttonOutline: { 
        marginTop: 10,
        width: '60%',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: COLORS.white,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.grayBox, // 使用 grayBox 作為邊框色
    },
    buttonText: { fontSize: 18, fontWeight: '900', color: COLORS.white }, // 重試按鈕文字顏色
});

const feature = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: R,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    title: { fontSize: 18, fontWeight: '900' },
    sub: { marginTop: 4, fontSize: 14 },
});


// ----------------------------------------------------
// 排版優化相關的自定義樣式
// ----------------------------------------------------
const customStyles = StyleSheet.create({
    fixedHeader: {
        backgroundColor: COLORS.white, // Header 背景色
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.grayBox, // Header 底部分隔線
        paddingTop: 10,
    },
    listContainer: {
        paddingBottom: 100,
        paddingTop: 8,
        minHeight: '100%',
    },
    loadingText: {
        marginTop: 10,
        fontWeight: '900',
        color: COLORS.textDark, 
    },
    errorContainer: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        backgroundColor: COLORS.grayBox, // 錯誤畫面背景
    },
    errorText: {
        fontSize: 16,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 20,
        color: COLORS.textDark, // 錯誤訊息文字改為深色
        backgroundColor: COLORS.cream, // 錯誤背景提示色
        padding: 15,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.textMid, // 錯誤訊息增加邊框
    },
    retryButton: { // 重試按鈕背景色改為 Green
        backgroundColor: COLORS.green,
        marginTop: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.textMid, // 無資料時使用較淡的文字顏色
        padding: 20,
    }
});
// // MedInfo_1.tsx
// import React, { useCallback, useEffect, useState } from 'react';
// import {
//   View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
//   ScrollView, Pressable, StatusBar, RefreshControl, Alert,
// } from 'react-native';
// import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
// import { StackNavigationProp } from '@react-navigation/stack';
// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// import { RootStackParamList } from '../App';

// type NavProp = StackNavigationProp<RootStackParamList, 'MedInfo_1'>;
// type RouteProps = RouteProp<RootStackParamList, 'MedInfo_1'>;

// type MedItem = {
//   MedId: number | string;
//   MedName: string;
//   DosageFrequency: string;
//   AdministrationRoute: string;
// };

// const COLORS = {
//   white: '#FFFFFF',
//   black: '#111111',
//   cream: '#FFFCEC',
//   textDark: '#111',
//   textMid: '#333',
//   green: '#A6CFA1',
//   grayBox: '#F2F2F2',
//   orange: '#F58402',
//   red: '#D9534F',
//   line: '#E6E6E6',
// };



// const BASE = 'https://caremate.ntub.edu.tw';

// const R = 22;

// const outerShadow = {
//   elevation: 4,
//   shadowColor: '#000',
//   shadowOpacity: 0.08,
//   shadowRadius: 6,
//   shadowOffset: { width: 0, height: 3 },
// };

// export default function MedInfo_1() {
//   const navigation = useNavigation<NavProp>();
//   const route = useRoute<RouteProps>();
//   const prescriptionId = route.params?.prescriptionId; // string（跟 App.tsx 對齊）

//   const [medList, setMedList] = useState<MedItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [errorMsg, setErrorMsg] = useState<string | null>(null);

//   const fetchMedDetails = useCallback(async () => {
//     if (!prescriptionId) {
//       setErrorMsg('尚未選擇藥單，請先回上一頁選擇。');
//       setMedList([]);
//       setLoading(false);
//       return;
//     }

//     try {
//       setLoading(true);
//       setErrorMsg(null);

//       const token = await AsyncStorage.getItem('access');
//       if (!token) {
//         setErrorMsg('尚未登入，請重新登入後再試。');
//         setMedList([]);
//         return;
//       }

//       const url = `${BASE}/api/meds/${encodeURIComponent(prescriptionId)}/`;
//       const response = await axios.get<MedItem[]>(url, {
//         headers: { Authorization: `Bearer ${token}` },
//         timeout: 10000,
//       });

//       setMedList(Array.isArray(response.data) ? response.data : []);
//     } catch (err: any) {
//       console.error('❌ 撈詳細藥單失敗:', err?.response?.status, err?.response?.data || err?.message);
//       if (err?.response?.status === 401) {
//         setErrorMsg('登入已過期，請重新登入。');
//       } else if (err?.response?.status === 404) {
//         setErrorMsg('查無此藥單。');
//       } else {
//         setErrorMsg('取得用藥資料失敗，請稍後再試。');
//       }
//       setMedList([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [prescriptionId]);

//   useEffect(() => {
//     fetchMedDetails();
//   }, [fetchMedDetails]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await fetchMedDetails();
//     setRefreshing(false);
//   }, [fetchMedDetails]);

//   return (
//     <View style={{ flex: 1, backgroundColor: COLORS.white }}>
//       <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

//       {loading ? (
//         <View style={styles.centerBox}>
//           <ActivityIndicator size="large" color={COLORS.black} />
//           <Text style={{ marginTop: 10, fontWeight: '900' }}>資料載入中…</Text>
//         </View>
//       ) : errorMsg ? (
//         <ScrollView
//           contentContainerStyle={[styles.centerBox, { paddingTop: 80 }]}
//           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
//         >
//           <Text style={{ fontSize: 16, fontWeight: '900', textAlign: 'center', marginBottom: 16 }}>
//             {errorMsg}
//           </Text>
//           <TouchableOpacity
//             style={[styles.button, { backgroundColor: COLORS.orange }]}
//             onPress={fetchMedDetails}
//             activeOpacity={0.9}
//           >
//             <Text style={styles.buttonText}>重試</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[styles.buttonOutline]}
//             onPress={() => navigation.goBack()}
//             activeOpacity={0.9}
//           >
//             <Text style={[styles.buttonText, { color: COLORS.textDark }]}>回前頁</Text>
//           </TouchableOpacity>
//         </ScrollView>
//       ) : (
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
//           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
//         >
//           {medList.length === 0 ? (
//             <View style={[styles.centerBox, { paddingTop: 60 }]}>
//               <Text style={{ fontSize: 16, fontWeight: '900' }}>此藥單沒有任何用藥資料</Text>
//               <TouchableOpacity
//                 style={[styles.buttonOutline, { marginTop: 16 }]}
//                 onPress={() => navigation.goBack()}
//                 activeOpacity={0.9}
//               >
//                 <Text style={[styles.buttonText, { color: COLORS.textDark }]}>回前頁</Text>
//               </TouchableOpacity>
//             </View>
//           ) : (
//             <>
//               {medList.map((m) => (
//                 <FeatureCard
//                   key={m.MedId}
//                   title={m.MedName}
//                   subtitle={`頻率：${m.DosageFrequency}  ·  途徑：${m.AdministrationRoute}`}
//                   right={<MaterialIcons name="medication" size={28} color={COLORS.black} />}
//                   onPress={() => {}}
//                   withShadow
//                   darkText
//                   bg={COLORS.cream}
//                 />
//               ))}

//               <TouchableOpacity
//                 style={[styles.button, { backgroundColor: COLORS.orange }]}
//                 onPress={() => navigation.goBack()}
//                 activeOpacity={0.9}
//               >
//                 <Text style={styles.buttonText}>回前頁</Text>
//               </TouchableOpacity>
//             </>
//           )}
//         </ScrollView>
//       )}
//     </View>
//   );
// }

// function FeatureCard({
//   bg, title, subtitle, right, onPress, darkText = false, withShadow = false,
// }: {
//   bg: string; title: string; subtitle?: string; right?: React.ReactNode; onPress: () => void;
//   darkText?: boolean; withShadow?: boolean;
// }) {
//   return (
//     <Pressable
//       onPress={onPress}
//       android_ripple={{ color: '#00000010' }}
//       style={({ pressed }) => [
//         feature.card,
//         { backgroundColor: bg },
//         withShadow && outerShadow,
//         pressed && { transform: [{ scale: 0.98 }] },
//       ]}
//     >
//       <View style={{ flex: 1 }}>
//         <Text style={[feature.title, { color: darkText ? COLORS.textDark : COLORS.white }]}>{title}</Text>
//         {!!subtitle && <Text style={[feature.sub, { color: darkText ? COLORS.textMid : COLORS.white }]}>{subtitle}</Text>}
//       </View>
//       {right}
//     </Pressable>
//   );
// }

// const styles = StyleSheet.create({
//   centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },

//   button: {
//     marginTop: 14,
//     width: '60%',
//     padding: 12,
//     borderRadius: 10,
//     alignItems: 'center',
//     alignSelf: 'center',
//   },
//   buttonOutline: {
//     marginTop: 10,
//     width: '60%',
//     padding: 12,
//     borderRadius: 10,
//     alignItems: 'center',
//     alignSelf: 'center',
//     backgroundColor: '#FFF',
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: COLORS.line,
//   },
//   buttonText: { fontSize: 18, fontWeight: '900', color: COLORS.black },
// });

// const feature = StyleSheet.create({
//   card: {
//     marginHorizontal: 16,
//     marginTop: 12,
//     borderRadius: R,
//     padding: 18,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   title: { fontSize: 18, fontWeight: '900' },
//   sub: { marginTop: 4, fontSize: 14 },
// });
