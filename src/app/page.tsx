"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import HeroStep from "@/components/onboarding/HeroStep";
import ConnectStep from "@/components/onboarding/ConnectStep";
import MoodStep from "@/components/onboarding/MoodStep";
import { DRAFT_STORAGE_KEY, fetchProfile, readSession, resultsHref, writeSession } from "@/lib/client/session";
import type { TasteProfile } from "@/types/letterboxd";
import type { MoodCategory } from "@/types/mood";

type Step = "hero" | "connect" | "mood";

type OnboardingDraft = {
  step: Step;
  username: string;
  profile: TasteProfile | null;
  selectedMoods: MoodCategory[];
  freeText: string;
};

const MAX_MOODS = 3;

const stepTransition = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

export default function HomePage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("hero");
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [selectedMoods, setSelectedMoods] = useState<MoodCategory[]>([]);
  const [freeText, setFreeText] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Restore the in-progress onboarding (e.g. coming back from results).
  useEffect(() => {
    const draft = readSession<Partial<OnboardingDraft>>(DRAFT_STORAGE_KEY);
    if (draft) {
      setUsername(draft.username ?? draft.profile?.username ?? "");
      setProfile(draft.profile ?? null);
      setSelectedMoods(draft.selectedMoods ?? []);
      setFreeText(draft.freeText ?? "");
      if (draft.profile && draft.step && draft.step !== "hero") setStep(draft.step);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeSession(DRAFT_STORAGE_KEY, { step, username, profile, selectedMoods, freeText } satisfies OnboardingDraft);
  }, [hydrated, step, username, profile, selectedMoods, freeText]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  async function loadProfile() {
    const trimmed = username.trim();
    if (!trimmed) return;
    setConnectLoading(true);
    setConnectError(null);
    try {
      const loaded = await fetchProfile(trimmed);
      setProfile(loaded);
      setUsername(loaded.username);
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "No se pudo cargar el perfil.");
    } finally {
      setConnectLoading(false);
    }
  }

  function toggleMood(mood: MoodCategory) {
    setSelectedMoods(current =>
      current.includes(mood)
        ? current.filter(m => m !== mood)
        : current.length < MAX_MOODS
        ? [...current, mood]
        : [...current.slice(1), mood]
    );
  }

  function showResults() {
    if (!profile || selectedMoods.length === 0) return;
    router.push(resultsHref({ username: profile.username, moods: selectedMoods, freeText }));
  }

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <AnimatePresence mode="wait">
        {step === "hero" && (
          <motion.div key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <HeroStep
              onStart={() => setStep("connect")}
              returningUser={profile?.username}
              onContinue={() => setStep("mood")}
            />
          </motion.div>
        )}

        {step === "connect" && (
          <motion.div key="connect" {...stepTransition}>
            <ConnectStep
              username={username}
              onUsernameChange={value => { setUsername(value); setProfile(null); setConnectError(null); }}
              profile={profile}
              loading={connectLoading}
              error={connectError}
              onLoad={loadProfile}
              onBack={() => setStep("hero")}
              onNext={() => setStep("mood")}
            />
          </motion.div>
        )}

        {step === "mood" && profile && (
          <motion.div key="mood" {...stepTransition}>
            <MoodStep
              username={profile.username}
              selected={selectedMoods}
              onToggle={toggleMood}
              freeText={freeText}
              onFreeTextChange={setFreeText}
              onBack={() => setStep("connect")}
              onSubmit={showResults}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
