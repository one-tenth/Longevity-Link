import React from 'react';
import { View, Button, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CareMate 首頁</Text>
      <Button title="前往長者首頁" onPress={() => navigation.navigate('elderlyhome')} />
      <View style={{ marginVertical: 10 }} />
      <Button title="前往家人首頁" onPress={() => navigation.navigate('childhome')} />
      <View style={{ marginVertical: 10 }} />
      <Button title="Google Fit 測試" onPress={() => navigation.navigate('fit')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, marginBottom: 20 },
});
