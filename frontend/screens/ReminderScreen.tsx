// screens/ReminderScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';

type ReminderScreenRouteProp = RouteProp<RootStackParamList, 'ReminderScreen'>;

export default function ReminderScreen() {
  const route = useRoute<ReminderScreenRouteProp>();
  let { period, meds } = route.params;

  if (typeof meds === 'string') {
    meds = meds.length > 0 ? meds.split(',') : [];
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{period} 提醒</Text>
      <Text style={styles.subtitle}>
        {meds.length > 0 ? '請服用以下藥物：' : '目前無需服藥 🙌'}
      </Text>
      {meds.map((med: string, index: number) => (
        <Text key={index} style={styles.med}>
          • {med}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', paddingTop: 50 },
  title: { fontSize: 30, fontWeight: 'bold', marginBottom: 20 },
  subtitle: { fontSize: 22, marginBottom: 10 },
  med: { fontSize: 20, marginVertical: 5 },
});
