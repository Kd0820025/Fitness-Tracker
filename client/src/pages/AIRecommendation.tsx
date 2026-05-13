import { useState } from "react";
import { SparklesIcon, RefreshCwIcon, ClockIcon, ChevronDownIcon, ChevronUpIcon, AlertCircleIcon } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import api from "../configs/api";
import toast from "react-hot-toast";

interface SavedRec {
  id: number;
  content: string;
  createdAt: string;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// Parses the plain-text Groq response into labeled sections
const parseSections = (text: string) => {
  const sectionTitles = [
    "Weekly Workout Plan",
    "Daily Calorie Target",
    "Diet Suggestions",
    "Recovery Tips",
  ];
  const sections: { title: string; body: string }[] = [];
  let remaining = text;

  sectionTitles.forEach((title, i) => {
    const nextTitle = sectionTitles[i + 1];
    const startIdx = remaining.search(new RegExp(title, "i"));
    if (startIdx === -1) return;
    const endIdx = nextTitle ? remaining.search(new RegExp(nextTitle, "i")) : remaining.length;
    const body = remaining.slice(startIdx + title.length, endIdx !== -1 ? endIdx : undefined).replace(/^\s*[:.\n]+/, "").trim();
    sections.push({ title, body });
  });

  // Fallback: if parsing fails, show raw text as one block
  if (!sections.length) return [{ title: "Your Plan", body: text }];
  return sections;
};

const sectionMeta: Record<string, { icon: string; color: string }> = {
  "Weekly Workout Plan": { icon: "🏋️", color: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" },
  "Daily Calorie Target": { icon: "🔥", color: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" },
  "Diet Suggestions": { icon: "🥗", color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" },
  "Recovery Tips": { icon: "😴", color: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" },
  "Your Plan": { icon: "✨", color: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" },
};

const AIRecommendations = () => {
  const { user, allFoodLogs, allActivityLogs } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [savedRecs, setSavedRecs] = useState<SavedRec[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);

  const hasEnoughData = allFoodLogs.length > 0 || allActivityLogs.length > 0;

  const generate = async () => {
    if (!user?.token) return;
    setLoading(true);
    setRecommendation(null);
    try {
      const { data } = await api.post(
        "/api/ai-recommendations/generate",
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setRecommendation(data.recommendation);
      toast.success("Plan generated!");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        "Failed to generate plan. Try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!user?.token) return;
    setHistoryLoading(true);
    try {
      const { data } = await api.get("/api/ai-recommendations", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setSavedRecs(data);
      setShowHistory(true);
    } catch {
      toast.error("Could not load history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const sections = recommendation ? parseSections(recommendation) : [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="size-10 rounded-xl bg-emerald-500 flex items-center justify-center">
          <SparklesIcon className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">AI Coach</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Personalized plan based on your logs</p>
        </div>
      </div>

      {/* Data availability notice */}
      {!hasEnoughData && (
        <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertCircleIcon className="size-5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Log some food or activity first for a more accurate plan. You can still generate a general recommendation below.
          </p>
        </div>
      )}

      {/* Generate button */}
      <div className="mt-6">
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors duration-200 cursor-pointer"
        >
          {loading ? (
            <>
              <RefreshCwIcon className="size-5 animate-spin" />
              Generating your plan...
            </>
          ) : (
            <>
              <SparklesIcon className="size-5" />
              {recommendation ? "Regenerate Plan" : "Generate My Plan"}
            </>
          )}
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-6 space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {/* Result sections */}
      {!loading && sections.length > 0 && (
        <div className="mt-6 space-y-4">
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">Your personalized plan</p>
          {sections.map((sec) => {
            const meta = sectionMeta[sec.title] ?? sectionMeta["Your Plan"];
            return (
              <div
                key={sec.title}
                className={`rounded-xl border p-5 ${meta.color} transition-colors duration-200`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{meta.icon}</span>
                  <h2 className="font-semibold text-slate-800 dark:text-white text-base">{sec.title}</h2>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {sec.body}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* History section */}
      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={showHistory ? () => setShowHistory(false) : loadHistory}
          disabled={historyLoading}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-200 cursor-pointer"
        >
          <ClockIcon className="size-4" />
          {historyLoading ? "Loading..." : showHistory ? "Hide past plans" : "View past plans"}
          {showHistory ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
        </button>

        {showHistory && (
          <div className="mt-4 space-y-3">
            {savedRecs.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">No saved plans yet.</p>
            ) : (
              savedRecs.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedHistory(expandedHistory === rec.id ? null : rec.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 cursor-pointer"
                  >
                    <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <SparklesIcon className="size-4 text-emerald-500" />
                      Plan from {formatDate(rec.createdAt)}
                    </span>
                    {expandedHistory === rec.id ? (
                      <ChevronUpIcon className="size-4 text-slate-400" />
                    ) : (
                      <ChevronDownIcon className="size-4 text-slate-400" />
                    )}
                  </button>
                  {expandedHistory === rec.id && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {rec.content}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIRecommendations;
