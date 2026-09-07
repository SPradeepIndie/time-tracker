/**
 * AnalyticsScreen.tsx
 *
 * Mathematical analytics dashboard.
 * Displays T_prod, G_day, R_day, P_day and 7-day rolling graphs
 * for Tasks, Goals, and Routines, plus weekly category progression matrix.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { useTheme } from '../../context/ThemeContext';
import { AnalyticsScreenNavigationProp } from '../../navigation/types';
import { getDatabase } from '../../services/storage/db';
import {
  calculateDailyAnalytics,
  calculateWeeklyAnalytics,
  formatProductivityTime,
  getProgressColor,
  DailyAnalytics,
  WeeklyAnalytics,
  ANALYTICS_WEIGHTS,
} from '../../services/analytics/analytics';
import { getWeekLabel } from '../../types/Goal';

interface Props { navigation: AnalyticsScreenNavigationProp; }

export default function AnalyticsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [daily, setDaily] = useState<DailyAnalytics | null>(null);
  const [weekly, setWeekly] = useState<WeeklyAnalytics | null>(null);
  const [view, setView] = useState<'daily' | 'weekly'>('daily');

  const today = new Date().toISOString().split('T')[0];
  const weekLabel = getWeekLabel(new Date());

  const loadData = useCallback(async () => {
    setLoading(true);
    const db = await getDatabase();
    const [d, w] = await Promise.all([
      calculateDailyAnalytics(db, today),
      calculateWeeklyAnalytics(db, weekLabel),
    ]);
    setDaily(d);
    setWeekly(w);
    setLoading(false);
  }, [today, weekLabel]);

  useEffect(() => { loadData(); }, [loadData]);

  const s = makeStyles(colors);

  // ── Gauge component ─────────────────────────────────────────────────────────

  const Gauge = ({ value, label, color }: { value: number; label: string; color: string }) => (
    <View style={s.gaugeContainer}>
      <View style={[s.gaugeTrack, { borderColor: colors.border }]}>
        <View style={[s.gaugeFill, { height: `${value}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[s.gaugeValue, { color }]}>{value}%</Text>
      <Text style={s.gaugeLabel}>{label}</Text>
    </View>
  );

  // ── Mini bar chart for 7-day rolling history ─────────────────────────────

  const MiniBar = ({ value, max = 100, color }: { value: number; max?: number; color: string }) => {
    const pct = max > 0 ? Math.min(1, value / max) : 0;
    return (
      <View style={s.barWrapper}>
        <View style={[s.barTrack, { backgroundColor: colors.border }]}>
          <View style={[s.barFill, { flex: pct, backgroundColor: color }]} />
        </View>
      </View>
    );
  };


  if (loading) {
    return (
      <SafeAreaView>
        <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>Calculating metrics…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>📊 Analytics</Text>
          <TouchableOpacity onPress={loadData} style={s.refreshBtn}>
            <Text style={[s.refreshText, { color: colors.primary }]}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Tab switcher */}
        <View style={s.tabBar}>
          {(['daily', 'weekly'] as const).map((t) => (
            <TouchableOpacity key={t} style={[s.tab, view === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]} onPress={() => setView(t)}>
              <Text style={[s.tabText, { color: view === t ? colors.primary : colors.textSecondary }]}>
                {t === 'daily' ? 'Today' : 'This Week'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={s.scrollContent}>
          {view === 'daily' && daily && (
            <>
              {/* Overall Progress P_day — hero card */}
              <View style={[s.heroCard, { backgroundColor: colors.card }]}>
                <Text style={s.heroLabel}>Overall Day Progress · P_day</Text>
                <Text style={[s.heroValue, { color: getProgressColor(daily.overallProgress) }]}>
                  {daily.overallProgress}%
                </Text>
                <Text style={s.heroFormula}>
                  = {ANALYTICS_WEIGHTS.W1}×{daily.taskCompletionRate}% + {ANALYTICS_WEIGHTS.W2}×{daily.goalHitRate}% + {ANALYTICS_WEIGHTS.W3}×{daily.routineHitRate}%
                </Text>
                <View style={s.heroBar}>
                  <View style={[s.heroBarFill, { width: `${daily.overallProgress}%` as any, backgroundColor: getProgressColor(daily.overallProgress) }]} />
                </View>
              </View>

              {/* T_prod — Productivity Time */}
              <View style={[s.metricCard, { backgroundColor: colors.card }]}>
                <Text style={s.metricTitle}>⏱ Productivity Time · T_prod</Text>
                <Text style={[s.metricBig, { color: colors.primary }]}>
                  {formatProductivityTime(daily.productivityMinutes)}
                </Text>
                <Text style={s.metricSub}>
                  From {daily.completedTasks} completed / {daily.totalTasks} total tasks
                </Text>
                <Text style={s.formulaText}>T_prod = Σ t_spent(i) for completed & in-progress tasks</Text>
              </View>

              {/* 3 Gauge cards */}
              <View style={s.gaugeRow}>
                <Gauge
                  value={daily.taskCompletionRate}
                  label={`Tasks\n${daily.completedTasks}/${daily.totalTasks}`}
                  color={getProgressColor(daily.taskCompletionRate)}
                />
                <Gauge
                  value={daily.goalHitRate}
                  label={`Goals\n${daily.completedGoals}/${daily.totalGoals}`}
                  color="#7C3AED"
                />
                <Gauge
                  value={daily.routineHitRate}
                  label={`Routines\n${daily.checkedActivities}/${daily.totalActivities}`}
                  color="#06B6D4"
                />
              </View>

              {/* Formula breakdown cards */}
              <View style={[s.formulaCard, { backgroundColor: colors.card }]}>
                <Text style={s.metricTitle}>📐 Formula Breakdown</Text>
                <FormulaRow label="G_day (Goal Hit Rate)" value={daily.goalHitRate} formula={`${daily.completedGoals} / ${daily.totalGoals} × 100%`} color="#7C3AED" />
                <FormulaRow label="R_day (Routine Hit Rate)" value={daily.routineHitRate} formula={`${daily.checkedActivities} / ${daily.totalActivities} × 100%`} color="#06B6D4" />
                <FormulaRow label="Task Completion Rate" value={daily.taskCompletionRate} formula={`${daily.completedTasks} / ${daily.totalTasks} × 100%`} color={colors.primary} />
              </View>
            </>
          )}

          {view === 'weekly' && weekly && (
            <>
              {/* 7-day trend chart */}
              <View style={[s.metricCard, { backgroundColor: colors.card }]}>
                <Text style={s.metricTitle}>📈 7-Day Rolling History</Text>
                <View style={s.chartGrid}>
                  {weekly.dailyHistory.map((d, i) => {
                    const dayLabel = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' });
                    return (
                      <View key={d.date} style={s.chartColumn}>
                        <Text style={s.chartPct}>{d.overallProgress}%</Text>
                        <View style={s.stackedBar}>
                          <MiniBar value={d.taskCompletionRate} color={colors.primary} />
                          <MiniBar value={d.goalHitRate} color="#7C3AED" />
                          <MiniBar value={d.routineHitRate} color="#06B6D4" />
                        </View>
                        <Text style={s.chartDay}>{dayLabel}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={s.chartLegend}>
                  <LegendItem color={colors.primary} label="Tasks" />
                  <LegendItem color="#7C3AED" label="Goals" />
                  <LegendItem color="#06B6D4" label="Routines" />
                </View>
              </View>

              {/* Category Progression Matrix */}
              <View style={[s.metricCard, { backgroundColor: colors.card }]}>
                <Text style={s.metricTitle}>🗂 Category Progression · P_category(c)</Text>
                <Text style={s.formulaText}>
                  P_category = (Completed Goals + Sub-goals) / (Total Goals + Sub-goals) × 100%
                </Text>
                {weekly.categoryStats.length === 0 && (
                  <Text style={s.metricSub}>No weekly goals set yet.</Text>
                )}
                {weekly.categoryStats.map((cat) => (
                  <View key={cat.categoryId} style={s.catStatRow}>
                    <View style={[s.catDot, { backgroundColor: cat.categoryColor }]} />
                    <Text style={s.catStatName}>{cat.categoryName}</Text>
                    <View style={s.catProgressBar}>
                      <View style={[s.catProgressFill, { width: `${cat.progressPercent}%` as any, backgroundColor: cat.categoryColor }]} />
                    </View>
                    <Text style={[s.catPct, { color: cat.categoryColor }]}>{cat.progressPercent}%</Text>
                    <Text style={s.catCount}>{cat.completed}/{cat.total}</Text>
                  </View>
                ))}
              </View>

              {/* Weekly averages summary */}
              <View style={[s.metricCard, { backgroundColor: colors.card }]}>
                <Text style={s.metricTitle}>📊 Weekly Averages</Text>
                {[
                  { label: 'Avg Task Rate', value: avg(weekly.dailyHistory.map(d => d.taskCompletionRate)), color: colors.primary },
                  { label: 'Avg Goal Rate', value: avg(weekly.dailyHistory.map(d => d.goalHitRate)), color: '#7C3AED' },
                  { label: 'Avg Routine Rate', value: avg(weekly.dailyHistory.map(d => d.routineHitRate)), color: '#06B6D4' },
                  { label: 'Avg Overall P_day', value: avg(weekly.dailyHistory.map(d => d.overallProgress)), color: getProgressColor(avg(weekly.dailyHistory.map(d => d.overallProgress))) },
                ].map(({ label, value, color }) => (
                  <FormulaRow key={label} label={label} value={value} formula="" color={color} />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}

function FormulaRow({ label, value, formula, color }: { label: string; value: number; formula: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginVertical: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>{label}</Text>
        <Text style={{ fontSize: 15, fontWeight: '800', color }}>{value}%</Text>
      </View>
      {formula ? <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{formula}</Text> : null}
      <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${value}%` as any, backgroundColor: color, borderRadius: 2 }} />
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, marginRight: 4 }} />
      <Text style={{ fontSize: 11, color: '#888' }}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
    headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text },
    refreshBtn: { padding: 8 },
    refreshText: { fontSize: 14, fontWeight: '600' },
    loadingText: { marginTop: 12, fontSize: 14 },
    tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    tabText: { fontSize: 15, fontWeight: '700' },
    scrollContent: { padding: 16, paddingBottom: 50 },

    heroCard: {
      borderRadius: 20, padding: 24, marginBottom: 16,
      alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08,
      shadowRadius: 12, elevation: 4,
    },
    heroLabel: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 8 },
    heroValue: { fontSize: 64, fontWeight: '900', lineHeight: 70 },
    heroFormula: { fontSize: 12, color: '#888', marginTop: 8, textAlign: 'center' },
    heroBar: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, width: '100%', marginTop: 16, overflow: 'hidden' },
    heroBarFill: { height: '100%', borderRadius: 4 },

    metricCard: {
      borderRadius: 16, padding: 16, marginBottom: 16,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    metricTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
    metricBig: { fontSize: 42, fontWeight: '900', lineHeight: 48 },
    metricSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    formulaText: { fontSize: 11, color: colors.textSecondary, marginTop: 8, fontStyle: 'italic' },

    gaugeRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
    gaugeContainer: { alignItems: 'center', width: '28%' },
    gaugeTrack: { width: 60, height: 100, borderRadius: 8, borderWidth: 2, overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 8 },
    gaugeFill: { width: '100%', borderRadius: 6 },
    gaugeValue: { fontSize: 18, fontWeight: '800' },
    gaugeLabel: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 2 },

    formulaCard: {
      borderRadius: 16, padding: 16, marginBottom: 16,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },

    chartGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140, marginTop: 8 },
    chartColumn: { flex: 1, alignItems: 'center', marginHorizontal: 2 },
    chartPct: { fontSize: 9, color: colors.textSecondary, marginBottom: 4 },
    stackedBar: { flex: 1, width: '100%', flexDirection: 'column', gap: 1 },
    barWrapper: { flex: 1 },
    barTrack: { flex: 1, borderRadius: 3, overflow: 'hidden', flexDirection: 'column-reverse' },
    barFill: { borderRadius: 3 },
    chartDay: { fontSize: 9, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
    chartLegend: { flexDirection: 'row', marginTop: 12, flexWrap: 'wrap' },

    catStatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    catDot: { width: 10, height: 10, borderRadius: 5 },
    catStatName: { width: 70, fontSize: 13, fontWeight: '600', color: colors.text },
    catProgressBar: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
    catProgressFill: { height: '100%', borderRadius: 4 },
    catPct: { fontSize: 13, fontWeight: '700', width: 40, textAlign: 'right' },
    catCount: { fontSize: 11, color: colors.textSecondary, width: 32, textAlign: 'right' },
  });
}
