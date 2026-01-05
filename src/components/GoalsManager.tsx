import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getCurrentWeekStart, getWeekDays, formatDate, formatDisplayDate } from '../utils/dates';

interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_days: number;
  completions: { [date: string]: boolean };
}

export function GoalsManager() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target_days: 5,
  });
  const [loading, setLoading] = useState(true);

  const weekStart = getCurrentWeekStart();
  const weekDays = getWeekDays(weekStart);

  useEffect(() => {
    if (user) {
      loadGoals();
    }
  }, [user]);

  const loadGoals = async () => {
    if (!user) return;

    setLoading(true);
    
    try {
      // Load goals for current week
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select(`
          id,
          title,
          description,
          target_days,
          daily_completions(date, completed)
        `)
        .eq('user_id', user.id)
        .eq('week_start', formatDate(weekStart));

      if (goalsError) throw goalsError;

      // Transform goals data
      const transformedGoals = goalsData?.map(goal => {
        const completions: { [date: string]: boolean } = {};
        (goal as any).daily_completions?.forEach((completion: any) => {
          completions[completion.date] = completion.completed;
        });

        return {
          id: goal.id,
          title: goal.title,
          description: goal.description,
          target_days: goal.target_days,
          completions,
        };
      }) || [];

      setGoals(transformedGoals);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: newGoal.title,
          description: newGoal.description || null,
          target_days: newGoal.target_days,
          week_start: formatDate(weekStart),
        })
        .select()
        .single();

      if (goalError) throw goalError;

      // Create daily completion records for the week
      const completionRecords = weekDays.map(day => ({
        goal_id: goalData.id,
        user_id: user.id,
        date: formatDate(day),
        completed: false,
      }));

      const { error: completionsError } = await supabase
        .from('daily_completions')
        .insert(completionRecords);

      if (completionsError) throw completionsError;

      setNewGoal({ title: '', description: '', target_days: 5 });
      setShowNewGoalForm(false);
      loadGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const handleToggleCompletion = async (goalId: string, date: string, currentStatus: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('daily_completions')
        .update({ completed: !currentStatus })
        .eq('goal_id', goalId)
        .eq('user_id', user.id)
        .eq('date', date);

      if (error) throw error;

      // Update local state
      setGoals(goals.map(goal => 
        goal.id === goalId 
          ? {
              ...goal,
              completions: {
                ...goal.completions,
                [date]: !currentStatus,
              },
            }
          : goal
      ));
    } catch (error) {
      console.error('Error updating completion:', error);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user || !confirm('Are you sure you want to delete this goal?')) return;

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) throw error;

      setGoals(goals.filter(goal => goal.id !== goalId));
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Weekly Goals</h1>
          <p className="text-gray-600 mt-1">
            Track your progress day by day
          </p>
        </div>
        <button
          onClick={() => setShowNewGoalForm(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </button>
      </div>

      {/* New Goal Form */}
      {showNewGoalForm && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
          <form onSubmit={handleCreateGoal} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal Title
              </label>
              <input
                type="text"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., Exercise for 30 minutes"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={2}
                placeholder="Add more details about your goal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Days per Week
              </label>
              <select
                value={newGoal.target_days}
                onChange={(e) => setNewGoal({ ...newGoal, target_days: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {[1, 2, 3, 4, 5, 6, 7].map(days => (
                  <option key={days} value={days}>
                    {days} day{days !== 1 ? 's' : ''} per week
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowNewGoalForm(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Create Goal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <Target className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No goals for this week
          </h3>
          <p className="text-gray-600 mb-4">
            Create your first goal to start tracking your progress
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {goals.map((goal) => {
            const completedDays = Object.values(goal.completions).filter(Boolean).length;
            const progressPercentage = Math.min(100, (completedDays / goal.target_days) * 100);
            
            return (
              <div
                key={goal.id}
                className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow"
              >
                {/* Goal Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-gray-600 text-sm mb-2">{goal.description}</p>
                    )}
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">
                        {completedDays}/{goal.target_days} days completed
                      </span>
                      <div className="flex-1 max-w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            progressPercentage >= 100 
                              ? 'bg-green-500' 
                              : progressPercentage >= 70 
                                ? 'bg-indigo-500' 
                                : 'bg-blue-400'
                          }`}
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {Math.round(progressPercentage)}%
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Daily Tracking */}
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const dateStr = formatDate(day);
                    const isCompleted = goal.completions[dateStr] || false;
                    const isToday = formatDate(new Date()) === dateStr;
                    const isPast = day < new Date() && !isToday;
                    
                    return (
                      <div key={dateStr} className="text-center">
                        <div className="text-xs text-gray-500 mb-1 font-medium">
                          {formatDisplayDate(day).split(',')[0]}
                        </div>
                        <button
                          onClick={() => handleToggleCompletion(goal.id, dateStr, isCompleted)}
                          className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                            isCompleted
                              ? 'bg-green-500 border-green-500 text-white shadow-md'
                              : isToday
                                ? 'border-indigo-400 bg-indigo-50 hover:bg-indigo-100'
                                : isPast
                                  ? 'border-red-200 bg-red-50 hover:bg-red-100'
                                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                          } ${isToday ? 'ring-2 ring-indigo-200' : ''}`}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4 mx-auto" />
                          ) : (
                            <span className="text-xs text-gray-400">
                              {day.getDate()}
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}