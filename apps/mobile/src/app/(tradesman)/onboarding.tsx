import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, Chip, FlagBar, Input, Screen, SectionTitle } from '@/components/ui';
import { Brand, Radius, humanizeCategory } from '@/constants/brand';
import { KatiwalaApi } from '../../lib/katiwala';

// Service categories a provider can list skills in (mirrors the Prisma
// ServiceCategory enum).
const CATEGORIES = [
  'ELECTRICAL', 'PLUMBING', 'CARPENTRY', 'PAINTING', 'WELDING', 'AIRCON',
  'APPLIANCE_REPAIR', 'ROOFING', 'MASONRY', 'TILE_INSTALLATION', 'TINTING',
  'GATES', 'GARAGE_DOORS', 'HOME_AUTOMATION', 'HOME_SECURITY', 'CCTV',
  'SOLAR', 'SMART_HOME', 'RENOVATION', 'CLEANING', 'HANDYMAN',
] as const;

export default function TradesmanOnboardingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  // category -> years of experience
  const [skills, setSkills] = useState<Record<string, number>>({});

  useEffect(() => {
    KatiwalaApi.me()
      .then((user) => {
        const p = user.tradesmanProfile;
        setFirstName(p?.firstName || '');
        setLastName(p?.lastName || '');
        setBio(p?.bio || '');
        if (p?.skills?.length) {
          setSkills(Object.fromEntries(p.skills.map((s) => [s.category, s.yearsExp || 1])));
        }
      })
      .catch((err: any) =>
        Alert.alert('Could not load profile', err.response?.data?.error || err.message),
      )
      .finally(() => setLoading(false));
  }, []);

  const toggleSkill = (category: string) => {
    setSkills((current) => {
      if (category in current) {
        const next = { ...current };
        delete next[category];
        return next;
      }
      return { ...current, [category]: 1 };
    });
  };

  const setYears = (category: string, delta: number) => {
    setSkills((current) => ({
      ...current,
      [category]: Math.max(0, Math.min(50, (current[category] || 0) + delta)),
    }));
  };

  const selected = Object.keys(skills);

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Name required', 'Please enter your first and last name.');
      return;
    }
    if (selected.length === 0) {
      Alert.alert('Add a skill', 'Select at least one service you can provide.');
      return;
    }

    setSubmitting(true);
    try {
      await KatiwalaApi.onboardTradesman({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim() || undefined,
        skills: selected.map((category) => ({ category, yearsExp: skills[category] })),
      });
      router.replace('/(tradesman)/dashboard');
    } catch (err: any) {
      Alert.alert('Could not save profile', err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Brand.blue} size="large" />
      </View>
    );
  }

  return (
    <Screen>
      <FlagBar style={styles.flag} />
      <Text style={styles.step}>STEP 2 OF 2</Text>
      <Text style={styles.title}>Set up your provider profile</Text>
      <Text style={styles.subtitle}>
        Tell customers who you are and what you can do. A dispatcher reviews this before
        you go live.
      </Text>

      <View style={styles.nameRow}>
        <Input
          containerStyle={styles.half}
          label="First name"
          onChangeText={setFirstName}
          placeholder="Juan"
          value={firstName}
        />
        <Input
          containerStyle={styles.half}
          label="Last name"
          onChangeText={setLastName}
          placeholder="Dela Cruz"
          value={lastName}
        />
      </View>

      <Input
        containerStyle={styles.block}
        label="Short bio"
        multiline
        onChangeText={setBio}
        placeholder="e.g. Licensed electrician with 5 years of residential experience."
        value={bio}
      />

      <SectionTitle eyebrow={`${selected.length} selected`}>Your skills</SectionTitle>
      <View style={styles.chips}>
        {CATEGORIES.map((category) => (
          <Chip
            key={category}
            active={category in skills}
            label={humanizeCategory(category)}
            onPress={() => toggleSkill(category)}
          />
        ))}
      </View>

      {selected.length > 0 && (
        <View style={styles.years}>
          <Text style={styles.yearsTitle}>Years of experience</Text>
          {selected.map((category) => (
            <View key={category} style={styles.yearRow}>
              <Text style={styles.yearLabel}>{humanizeCategory(category)}</Text>
              <View style={styles.stepper}>
                <Pressable hitSlop={6} onPress={() => setYears(category, -1)} style={styles.stepBtn}>
                  <Ionicons name="remove" size={18} color={Brand.blue} />
                </Pressable>
                <Text style={styles.stepValue}>{skills[category]}</Text>
                <Pressable hitSlop={6} onPress={() => setYears(category, 1)} style={styles.stepBtn}>
                  <Ionicons name="add" size={18} color={Brand.blue} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <Button
        loading={submitting}
        onPress={submit}
        style={styles.submit}
        title="Complete setup"
      />
      <Pressable onPress={() => router.replace('/(tradesman)/dashboard')} style={styles.skip}>
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.white },
  flag: { marginBottom: 20 },
  step: { color: Brand.red, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  title: { color: Brand.ink, fontSize: 26, fontWeight: '900', marginTop: 4 },
  subtitle: { color: Brand.slate, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 20 },
  nameRow: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  block: { marginTop: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  years: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.lg,
    padding: 14,
    backgroundColor: Brand.surface,
    gap: 10,
  },
  yearsTitle: { color: Brand.ink, fontSize: 14, fontWeight: '800' },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  yearLabel: { color: Brand.ink, fontSize: 14, fontWeight: '600', flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.pill,
    paddingHorizontal: 6,
  },
  stepBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  stepValue: { color: Brand.ink, fontSize: 15, fontWeight: '900', minWidth: 18, textAlign: 'center' },
  submit: { marginTop: 24 },
  skip: { alignItems: 'center', marginTop: 14 },
  skipText: { color: Brand.slate, fontSize: 14, fontWeight: '700' },
});
