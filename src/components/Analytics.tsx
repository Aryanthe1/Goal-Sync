import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Award, AlertTriangle, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getBurnoutLevel, getAdaptiveGoalSuggestion } from '../utils/burnout';
import { formatDate, formatDisplayDate } from '../utils/dates';
import { subWeeks, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';

interface WeeklyData {
  weekStart: string;
  goalCompletions: number;
  avgBurnoutScore: number;
  totalGoals: number;
}

interface BurnoutTrend {
  date: string;
  burnoutScore: number;
  stressLevel: number;
  moodLevel: number;
  sleepHours: number;
}

export function Analytics() {
  const { user } = useAuth();
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [burnoutTrend, setBurnoutTrend] = useState<BurnoutTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user]);

  const loadAnalyticsData = async () => {
    if (!user) return;

    setLoading(true);
    
    try {
      // Get data for last 8 weeks
      const endDate = new Date();
      const startDate = subWeeks(endDate, 7);
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });

      // Load weekly goal completion data
      const weeklyPromises = weeks.map(async (weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        
        // Get goals for this week
        const { data: goals, error: goalsError } = await supabase
          .from('goals')
          .select(`
            id,
            target_days,
            daily_completions!inner(completed)
          `)
          .eq('user_id', user.id)
          .eq('week_start', formatDate(weekStart));

        if (goalsError) throw goalsError;

        // Calculate completion percentage
        const totalGoals = goals?.length || 0;
        const totalCompletions = goals?.reduce((sum, goal) => {
          const completions = (goal as any).daily_completions?.filter((c: any) => c.completed).length || 0;
          return sum + (completions / goal.target_days);
        }, 0) || 0;

        const completionPercentage = totalGoals > 0 ? (totalCompletions / totalGoals) * 100 : 0;

        // Get average burnout score for this week
        const { data: checkins, error: checkinsError } = await supabase
          .from('burnout_checkins')
          .select('burnout_score')
          .eq('user_id', user.id)
          .gte('date', formatDate(weekStart))
          .lte('date', formatDate(weekEnd));

        if (checkinsError) throw checkinsError;

        const avgBurnoutScore = checkins?.length > 0 
          ? checkins.reduce((sum, c) => sum + c.burnout_score, 0) / checkins.length 
          : 0;

        return {
          weekStart: formatDate(weekStart),
          goalCompletions: Math.round(completionPercentage),
          avgBurnoutScore: Math.round(avgBurnoutScore * 10) / 10,
          totalGoals,
        };
      });

      const weeklyResults = await Promise.all(weeklyPromises);
      setWeeklyData(weeklyResults);

      // Load burnout trend data (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: burnoutData, error: burnoutError } = await supabase
        .from('burnout_checkins')
        .select('date, burnout_score, stress_level, mood_level, sleep_hours')
        .eq('user_id', user.id)
        .gte('date', formatDate(thirtyDaysAgo))
        .order('date', { ascending: true });

      if (burnoutError) throw burnoutError;

      setBurnoutTrend(burnoutData || []);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const latestBurnoutScore = burnoutTrend.length > 0 ? burnoutTrend[burnoutTrend.length - 1].burnoutScore : 0;
  const burnoutInfo = getBurnoutLevel(latestBurnoutScore);
  const adaptiveSuggestion = getAdaptiveGoalSuggestion(latestBurnoutScore);

  const avgGoalCompletion = weeklyData.length > 0 
    ? weeklyData.reduce((sum, week) => sum + week.goalCompletions, 0) / weeklyData.length 
    : 0;

  const avgBurnoutScore = weeklyData.length > 0 
    ? weeklyData.reduce((sum, week) => sum + week.avgBurnoutScore, 0) / weeklyData.length 
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">
          Insights into your productivity and wellness patterns
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Goal Completion</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(avgGoalCompletion)}%</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <Award className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Burnout Score</p>
              <p className="text-2xl font-bold text-gray-900">{avgBurnoutScore.toFixed(1)}/10</p>
            </div>
            <div className={`p-3 rounded-full ${burnoutInfo.bgColor}`}>
              <BarChart3 className={`h-6 w-6 ${burnoutInfo.color}`} />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Wellness Status</p>
              <p className={`text-lg font-semibold ${burnoutInfo.color}`}>
                {burnoutInfo.level.toUpperCase()}
              </p>
            </div>
            <div className={`p-3 rounded-full ${burnoutInfo.bgColor}`}>
              {burnoutInfo.level === 'high' ? (
                <AlertTriangle className={`h-6 w-6 ${burnoutInfo.color}`} />
              ) : (
                <TrendingUp className={`h-6 w-6 ${burnoutInfo.color}`} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Adaptive Suggestions */}
      {adaptiveSuggestion && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Personalized Recommendation
          </h3>
          <p className="text-blue-800">{adaptiveSuggestion}</p>
        </div>
      )}

      {/* Burnout Trend Chart */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Burnout Trend (Last 30 Days)</h2>
          <Calendar className="h-5 w-5 text-gray-500" />
        </div>

        {burnoutTrend.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burnoutTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => formatDisplayDate(new Date(date)).split(',')[0]}
                  stroke="#6b7280"
                />
                <YAxis domain={[0, 10]} stroke="#6b7280" />
                <Tooltip 
                  labelFormatter={(date) => formatDisplayDate(new Date(date))}
                  formatter={(value: number, name: string) => [
                    name === 'burnoutScore' ? `${value}/10` : value,
                    name === 'burnoutScore' ? 'Burnout Score' : name
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="burnoutScore" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No burnout data available yet</p>
            <p className="text-sm text-gray-400">Complete daily check-ins to see trends</p>
          </div>
        )}
      </div>

      {/* Weekly Performance */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Weekly Performance</h2>
          <TrendingUp className="h-5 w-5 text-gray-500" />
        </div>

        {weeklyData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="weekStart" 
                  tickFormatter={(date) => formatDisplayDate(new Date(date)).split(',')[0]}
                  stroke="#6b7280"
                />
                <YAxis domain={[0, 100]} stroke="#6b7280" />
                <Tooltip 
                  labelFormatter={(date) => `Week of ${formatDisplayDate(new Date(date))}`}
                  formatter={(value: number, name: string) => [
                    name === 'goalCompletions' ? `${value}%` : `${value}/10`,
                    name === 'goalCompletions' ? 'Goal Completion' : 'Avg Burnout Score'
                  ]}
                />
                <Bar 
                  dataKey="goalCompletions" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                  name="goalCompletions"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12">
            <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No goal data available yet</p>
            <p className="text-sm text-gray-400">Create goals to see performance trends</p>
          </div>
        )}
      </div>
    </div>
  );
}