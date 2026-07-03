'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, ChevronRight, Lightbulb } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { StageListItem } from '@/lib/utils/stage-storage';
import { useI18n } from '@/lib/hooks/use-i18n';

interface TopicRecommenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classrooms: StageListItem[];
  onSelectTopic: (topic: string) => void;
  /** Optional model config — without it the API falls back to classroom names */
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  providerType?: string;
}

export function TopicRecommenderDialog({
  open,
  onOpenChange,
  classrooms,
  onSelectTopic,
  model: modelProp,
  apiKey: apiKeyProp,
  baseUrl: baseUrlProp,
  providerType: providerTypeProp,
}: TopicRecommenderDialogProps) {
  const { t } = useI18n();
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    if (topics.length > 0) return; // already loaded
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recommend-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classrooms: classrooms.map((c) => ({
            name: c.name,
            description: c.description,
          })),
          model: modelProp,
          apiKey: apiKeyProp,
          baseUrl: baseUrlProp,
          providerType: providerTypeProp,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { topics: string[] };
      setTopics(data.topics ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      // Fallback: use classroom names as topics
      setTopics(classrooms.slice(0, 6).map((c) => c.name));
    } finally {
      setLoading(false);
    }
  }, [classrooms, topics.length]);

  // Reset when dialog opens
  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next);
      if (next) {
        setTopics([]);
        setError(null);
      }
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg w-[90vw]"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          fetchTopics();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="size-4 text-amber-500" />
            推荐学习主题
          </DialogTitle>
          <DialogDescription>
            基于你的学习历史，AI 为你推荐以下主题。点击选择一个开始学习。
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[120px]">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-3 py-8"
              >
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">正在生成推荐主题...</p>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6"
              >
                <p className="text-xs text-destructive mb-2">{error}</p>
                <button
                  onClick={fetchTopics}
                  className="text-xs text-primary underline hover:no-underline"
                >
                  重试
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="topics"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="grid gap-2"
              >
                {topics.map((topic, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      onSelectTopic(topic);
                      onOpenChange(false);
                    }}
                    className={cn(
                      'group flex items-start gap-3 rounded-lg border border-border/50 p-3 text-left text-sm',
                      'hover:border-violet-300 dark:hover:border-violet-700',
                      'hover:bg-violet-50/50 dark:hover:bg-violet-900/15',
                      'hover:shadow-sm hover:shadow-violet-500/5',
                      'transition-all duration-150 cursor-pointer',
                    )}
                  >
                    <span className="shrink-0 mt-0.5 flex size-6 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-[11px] font-bold text-violet-600 dark:text-violet-400">
                      {i + 1}
                    </span>
                    <span className="flex-1 leading-relaxed text-foreground/80 group-hover:text-foreground transition-colors">
                      {topic}
                    </span>
                    <ChevronRight className="size-4 shrink-0 mt-0.5 text-muted-foreground/30 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
