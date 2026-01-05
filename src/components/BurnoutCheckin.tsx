import React, { useState } from 'react';
import { X, Heart, Moon, Smile, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/dates';
import { calculateBurnoutScore, getBurnoutLevel } from '../utils/burnout';

interface BurnoutCheckinProps {
  onComplete: (checkinData: any) => void;
  onCancel: () => void;
  existingCheckin?: any;
}

export function BurnoutCheckin({ onComplete, onCancel, existingCheckin }: BurnoutCheckinProps) {
  const { user } = useAuth();
  const [stressLevel, setStressLevel] = useState(existingCheckin?.stress_level || 3);
  const [sleepHours, setSleepHours] = useState(existingCheckin?.sleep_hours || 8);
  const [moodLevel, setMoodLevel] = useState(existingCheckin?.mood_level || 3);
  const [timeSpentHours, setTimeSpentHours] = useState(existingCheckin?.time_spent_hours || 8);
  const [loading, setLoading] = useState(false);

  const metrics = {
    stress_level: stressLevel,
    sleep_hours: sleepHours,
    mood_level: moodLevel,
    time_spent_hours: timeSpentHours,
  };

  const burnoutScore = calculateBurnoutScore(metrics);
  const burnoutInfo = getBurnoutLevel(burnoutScore);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const checkinData = {
        user_id: user.id,
        date: formatDate(new Date()),
        stress_level: stressLevel,
        sleep_hours: sleepHours,
        mood_level: moodLevel,
        time_spent_hours: timeSpentHours,
        burnout_score: burnoutScore,
      };

      if (existingCheckin) {
        const { data, error } = await supabase
          .from('burnout_checkins')
          .update(checkinData)
          .eq('id', existingCheckin.id)
          .select()
          .single();

        if (error) throw error;
        onComplete(data);
      } else {
        const { data, error } = await supabase
          .from('burnout_checkins')
          .insert(checkinData)
          .select()
          .single();

        if (error) throw error;
        onComplete(data);
      }
    } catch (error) {
      console.error('Error saving check-in:', error);
    } finally {
      setLoading(false);
    }
  };

  const RatingSlider = ({ 
    value, 
    onChange, 
    min, 
    max, 
    step = 1, 
    label, 
    icon: Icon, 
    unit = '' 
  }: {
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step?: number;
    label: string;
    icon: React.ComponentType<any>;
    unit?: string;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Icon className="h-5 w-5 text-indigo-600" />
        <label className="text-sm font-medium text-gray-700">{label}</label>
      </div>
      <div className="flex items-center space-x-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <span className="text-sm font-medium text-gray-900 min-w-[3rem] text-right">
          {value}{unit}
        </span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Daily Wellness Check-in</h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Stress Level */}
            <RatingSlider
              value={stressLevel}
              onChange={setStressLevel}
              min={1}
              max={5}
              label="How stressed do you feel today?"
              icon={Heart}
            />

            {/* Sleep Hours */}
            <RatingSlider
              value={sleepHours}
              onChange={setSleepHours}
              min={0}
              max={12}
              step={0.5}
              label="How many hours did you sleep last night?"
              icon={Moon}
              unit="h"
            />

            {/* Mood Level */}
            <RatingSlider
              value={moodLevel}
              onChange={setMoodLevel}
              min={1}
              max={5}
              label="How would you rate your mood today?"
              icon={Smile}
            />

            {/* Time Spent */}
            <RatingSlider
              value={timeSpentHours}
              onChange={setTimeSpentHours}
              min={0}
              max={16}
              step={0.5}
              label="How many hours will you spend on tasks today?"
              icon={Clock}
              unit="h"
            />

            {/* Burnout Preview */}
            <div className={`rounded-lg p-4 ${burnoutInfo.bgColor}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Burnout Score</span>
                <span className={`text-lg font-bold ${burnoutInfo.color}`}>
                  {burnoutScore}/10
                </span>
              </div>
              <p className={`text-sm ${burnoutInfo.color}`}>
                {burnoutInfo.message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Saving...' : existingCheckin ? 'Update' : 'Save Check-in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}