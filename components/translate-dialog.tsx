'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Languages, Loader2, ChevronRight, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface TranslateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceText: string;
  onApplyTranslation: (translated: string) => void;
}

const STYLES = [
  { id: 'professional', label: '专业严谨', desc: '术语准确，逻辑严密，适合学术/技术场景' },
  { id: 'simplified', label: '通俗易懂', desc: '大白话，用类比和简单词汇解释复杂概念' },
  { id: 'storytelling', label: '故事叙述', desc: '用故事情节串联知识点，生动有趣' },
  { id: 'stepbystep', label: '循序渐进', desc: '从基础到复杂，适合初学者逐步理解' },
  { id: 'analogy', label: '类比说明', desc: '用熟悉的事物打比方讲解新概念' },
  { id: 'qadriven', label: '问答启发', desc: '通过问题引导学生思考和探索' },
] as const;

export function TranslateDialog({
  open,
  onOpenChange,
  sourceText,
  onApplyTranslation,
}: TranslateDialogProps) {
  const [selectedStyle, setSelectedStyle] = useState<string>('simplified');
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setLoading(true);
    setError(null);
    setTranslated(null);
    try {
      const res = await fetch('/api/translate-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText, style: selectedStyle }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { translated: string };
      setTranslated(data.translated);
    } catch (err) {
      setError(err instanceof Error ? err.message : '翻译失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTranslated(null);
    setError(null);
    setSelectedStyle('simplified');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-[92vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Languages className="size-4 text-blue-500" />
            翻译转述风格
          </DialogTitle>
          <DialogDescription>
            将输入框中的内容按指定风格翻译/转述，然后填入文本框继续使用。
          </DialogDescription>
        </DialogHeader>

        {/* 原文预览 */}
        <div className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground border max-h-20 overflow-y-auto">
          {sourceText.slice(0, 300)}
          {sourceText.length > 300 && '...'}
        </div>

        {/* 风格选择 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => {
                setSelectedStyle(style.id);
                setTranslated(null);
                setError(null);
              }}
              className={cn(
                'rounded-lg border p-3 text-left text-xs transition-all cursor-pointer',
                selectedStyle === style.id
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 shadow-sm'
                  : 'border-border/60 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-muted/30',
              )}
            >
              <div className="font-medium text-sm mb-0.5 text-foreground flex items-center gap-1.5">
                {selectedStyle === style.id && <Check className="size-3 text-blue-500 shrink-0" />}
                {style.label}
              </div>
              <div className="text-muted-foreground">{style.desc}</div>
            </button>
          ))}
        </div>

        {/* 翻译按钮 / 结果 */}
        <div className="min-h-[60px]">
          <AnimatePresence mode="wait">
            {!translated && !loading && !error && (
              <motion.div
                key="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <button
                  onClick={handleTranslate}
                  disabled={!sourceText.trim()}
                  className={cn(
                    'w-full rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all',
                    sourceText.trim()
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer'
                      : 'bg-muted text-muted-foreground/40 cursor-not-allowed',
                  )}
                >
                  <Languages className="size-4" />
                  按此风格翻译转述
                </button>
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 py-3"
              >
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">正在翻译转述...</span>
              </motion.div>
            )}

            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-2"
              >
                <p className="text-xs text-destructive mb-2">{error}</p>
                <button
                  onClick={handleTranslate}
                  className="text-xs text-primary underline hover:no-underline"
                >
                  重试
                </button>
              </motion.div>
            )}

            {translated && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/15 border border-blue-200/60 dark:border-blue-800/40 p-3 text-xs leading-relaxed max-h-32 overflow-y-auto">
                  {translated}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onApplyTranslation(translated);
                      onOpenChange(false);
                    }}
                    className="flex-1 rounded-lg bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    替换原文
                  </button>
                  <button
                    onClick={() => {
                      onApplyTranslation(sourceText + '\n\n' + translated);
                      onOpenChange(false);
                    }}
                    className="flex-1 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 py-2 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                  >
                    追加在后面
                  </button>
                  <button
                    onClick={handleReset}
                    className="rounded-lg border border-border/60 px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    重新选择风格
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
