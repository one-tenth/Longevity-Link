import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator, ScrollView,
    TouchableOpacity, StatusBar, RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome from 'react-native-vector-icons/FontAwesome'; // 引入箭頭圖標

// (IMPORT) 從您的 App.tsx 匯入
import { RootStackParamList } from '../App'; 

// 嚴格使用您提供的顏色定義
const COLORS = {
    white: '#FFFFFF', 
    black: '#111111', 
    textDark: '#111',
    textMid: '#333', 
    line: '#E6E6E6', 
    orange: '#F58402' 
};

const BASE = 'https://caremate.ntub.edu.tw';

type NavProp = StackNavigationProp<RootStackParamList, 'MedDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'MedDetail'>;

// 後端回傳的詳細資料型別
type MedDetailData = {
    MedId: number | string;
    Disease: string;
    MedName: string;
    AdministrationRoute: string;
    DosageFrequency: string;
    Effect: string;
    SideEffect: string;
};

// 自定義陰影樣式
const CUSTOM_SHADOW = {
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
};

// 表格行組件
function DataRow({ label, value }: { label: string; value: string | undefined }) {
    if (!value) return null; // 如果沒資料就不顯示
    return (
        <View style={dataRowStyles.row}>
            <Text style={dataRowStyles.rowLabel}>{label}</Text>
            {/* 確保數值被 Text 包裹，避免 Render Error */}
            <Text style={dataRowStyles.rowValue}>{value}</Text>
        </View>
    );
}

export default function MedDetailScreen() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProps>();
    const { medId } = route.params;

    const [medData, setMedData] = useState<MedDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const fetchMedData = useCallback(async () => {
        try {
            setLoading(true);
            setErrorMsg(null);
            
            const token = await AsyncStorage.getItem('access');
            if (!token) {
                setErrorMsg('尚未登入，請重新登入。');
                return;
            }
            
            const url = `${BASE}/api/med/detail/${medId}/`;
            const response = await axios.get<MedDetailData>(url, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000,
            });
            
            setMedData(response.data);
        } catch (err: any) {
            console.error('❌ 撈藥物詳細資料失敗:', err?.response?.status, err?.message);
            if (err?.response?.status === 401) {
                setErrorMsg('登入已過期，請重新登入。');
            } else if (err?.response?.status === 404) {
                setErrorMsg('查無此藥物資料。');
            } else {
                setErrorMsg('取得資料失敗，請稍後再試。');
            }
            setMedData(null);
        } finally {
            setLoading(false);
        }
    }, [medId]);

    useEffect(() => {
        fetchMedData();
    }, [fetchMedData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchMedData();
        setRefreshing(false);
    }, [fetchMedData]);

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={COLORS.orange} />
                    <Text style={{ marginTop: 10, fontWeight: '900', color: COLORS.textMid }}>
                        資料載入中…
                    </Text>
                </View>
            );
        }

        if (errorMsg) {
            return (
                <View style={styles.centerBox}>
                    <View style={customStyles.errorBox}>
                        <Text style={customStyles.errorText}>{errorMsg}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: COLORS.orange }]}
                        onPress={fetchMedData}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.buttonText}>重試</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (!medData) {
            return (
                <View style={styles.centerBox}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.textMid }}>
                        找不到資料
                    </Text>
                </View>
            );
        }

        return (
            <View style={[styles.tableContainer, CUSTOM_SHADOW]}>
                <Text style={customStyles.medTitle}>
                    {medData.MedName || "藥物詳細資料"}
                </Text>
                {/* 標題下方的橘色裝飾線 */}
                <View style={customStyles.titleSeparator} />
                
                <DataRow label="主要病症" value={medData.Disease} />
                <DataRow label="服用頻率" value={medData.DosageFrequency} />
                <DataRow label="服用途徑" value={medData.AdministrationRoute} />
                <DataRow label="主要作用" value={medData.Effect} />
                <DataRow label="可能副作用" value={medData.SideEffect} />
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.white }}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
            
            {/* ── Header：頂部返回箭頭 ── */}
            <View style={headerStyles.headerRow}>
                <View style={headerStyles.sideSlot}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={[headerStyles.backBtn]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <FontAwesome name="arrow-left" size={20} color={COLORS.black} />
                    </TouchableOpacity>
                </View>

                <View style={headerStyles.centerSlot}>
                    <Text style={headerStyles.titleText}>藥物詳細資訊</Text>
                </View>

                <View style={headerStyles.sideSlot} />
            </View>
            {/* ──────────────────────── */}

            <ScrollView
                contentContainerStyle={customStyles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {renderContent()}
                
                {/* 底部按鈕已移除 */}
            </ScrollView>
        </View>
    );
}

// ----------------------------------------------------
// Header 樣式
// ----------------------------------------------------
const headerStyles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        marginBottom: 8,
        minHeight: 50,
        backgroundColor: COLORS.white,
    },
    sideSlot: {
        width: 48,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.white, // 保持簡潔白色
        borderWidth: 1,
        borderColor: COLORS.line, // 加上淡灰色邊框增加層次
        borderRadius: 12,
    },
    centerSlot: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleText: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.black,
    }
});

// ----------------------------------------------------
// 表格行樣式
// ----------------------------------------------------
const dataRowStyles = StyleSheet.create({
    row: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.line, 
    },
    rowLabel: {
        fontSize: 14,
        color: COLORS.textMid,
        fontWeight: '700',
        marginBottom: 6,
    },
    rowValue: {
        fontSize: 16,
        color: COLORS.textDark,
        fontWeight: '800',
        lineHeight: 24,
    },
});

// ----------------------------------------------------
// 主樣式與通用樣式
// ----------------------------------------------------
const styles = StyleSheet.create({
    centerBox: { 
        flex: 1, 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 20,
        backgroundColor: COLORS.white 
    },
    tableContainer: {
        margin: 20,
        borderRadius: 16, // 更圓潤的邊角
        backgroundColor: COLORS.white,
        borderWidth: 1, 
        borderColor: COLORS.line,
        overflow: 'hidden',
    },
    button: {
        marginTop: 20,
        width: '60%',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        alignSelf: 'center',
    },
    buttonText: { 
        fontSize: 18, 
        fontWeight: '900', 
        color: COLORS.white 
    },
});

// ----------------------------------------------------
// 自定義美化樣式
// ----------------------------------------------------
const customStyles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1, 
        paddingBottom: 40,
        paddingTop: 8, 
        backgroundColor: COLORS.white, 
    },
    medTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.black,
        paddingTop: 20,
        paddingHorizontal: 20,
    },
    titleSeparator: {
        height: 4,
        backgroundColor: COLORS.orange, // 標題下方的橘色強調線
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 4,
        borderRadius: 2,
        width: 40, // 短線條設計
    },
    errorBox: {
        maxWidth: '90%',
        padding: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.orange, 
        backgroundColor: COLORS.white,
    },
    errorText: {
        fontSize: 16,
        fontWeight: '900',
        textAlign: 'center',
        color: COLORS.textDark, 
    }
});