import React, { useState, useEffect } from 'react';
import { Plus, Calendar, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getCurrentWeekStart, formatWeekRange, formatDate, formatDisplayDate } from '../utils/dates';
import { calculateBurnoutScore, getBurnoutLevel, getAdaptiveGoalSuggestion } from '../utils/burnout';
import { BurnoutCheckin } from './BurnoutCheckin';

interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_days: number;
  completions: number;
}

interface TodayCheckin {
  id: string;
  stress_level: number;
  sleep_hours: number;
  mood_level: number;
  time_spent_hours: number;
  burnout_score: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [todayCheckin, setTodayCheckin] = useState<TodayCheckin | null>(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [loading, setLoading] = useState(true);

  const weekStart = getCurrentWeekStart();
  const today = formatDate(new Date());

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    
    try {
      // Load current week's goals with completion counts
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select(`
          id,
          title,
          description,
          target_days,
          daily_completions!inner(completed, date)
        `)
        .eq('user_id', user.id)
        .eq('week_start', formatDate(weekStart));

      if (goalsError) throw goalsError;

      // Transform goals data to include completion counts
      const transformedGoals = goalsData?.map(goal => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        target_days: goal.target_days,
        completions: (goal as any).daily_completions?.filter((c: any) => c.completed).length || 0,
      })) || [];

      setGoals(transformedGoals);

      // Load today's burnout check-in
      const { data: checkinData, error: checkinError } = await supabase
        .from('burnout_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (checkinError && checkinError.code !== 'PGRST116') {
        throw checkinError;
      }

      setTodayCheckin(checkinData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckinComplete = (checkinData: TodayCheckin) => {
    setTodayCheckin(checkinData);
    setShowCheckin(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const burnoutInfo = todayCheckin ? getBurnoutLevel(todayCheckin.burnout_score) : null;
  const adaptiveSuggestion = todayCheckin ? getAdaptiveGoalSuggestion(todayCheckin.burnout_score) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Week of {formatWeekRange(weekStart)}
        </p>
      </div>

      {/* Burnout Check-in Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Daily Wellness Check-in</h2>
          <Calendar className="h-5 w-5 text-gray-500" />
        </div>

        {todayCheckin ? (
          <div className="space-y-4">
            <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${burnoutInfo?.bgColor} ${burnoutInfo?.color}`}>
              {burnoutInfo?.level === 'low' && <CheckCircle2 className="h-4 w-4 mr-2" />}
              {burnoutInfo?.level === 'moderate' && <TrendingUp className="h-4 w-4 mr-2" />}
              {burnoutInfo?.level === 'high' && <AlertCircle className="h-4 w-4 mr-2" />}
              Burnout Score: {todayCheckin.burnout_score}/10 ({burnoutInfo?.level.toUpperCase()})
            </div>
            
            <p className="text-gray-700">{burnoutInfo?.message}</p>
            
            {adaptiveSuggestion && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm">
                  <strong>Adaptive Suggestion:</strong> {adaptiveSuggestion}
                </p>
              </div>
            )}

            <button
              onClick={() => setShowCheckin(true)}
              className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              Update today's check-in
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
              <Plus className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Ready for your daily check-in?
            </h3>
            <p className="text-gray-600 mb-4">
              Take a moment to reflect on your wellness today
            </p>
            <button
              onClick={() => setShowCheckin(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Start Check-in
            </button>
          </div>
        )}
      </div>

      {/* Goals Overview */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">This Week's Goals</h2>
          <TrendingUp className="h-5 w-5 text-gray-500" />
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No goals set for this week
            </h3>
            <p className="text-gray-600 mb-4">
              Start by setting your first weekly goal
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-medium text-gray-900 mb-2">{goal.title}</h3>
                {goal.description && (
                  <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {goal.completions}/{goal.target_days} days
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (goal.completions / goal.target_days) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Burnout Check-in Modal */}
      {showCheckin && (
        <BurnoutCheckin
          onComplete={handleCheckinComplete}
          onCancel={() => setShowCheckin(false)}
          existingCheckin={todayCheckin}
        />
      )}
    </div>
  );
}