'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Lightbulb } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TopicRecommenderDialog } from '@/components/topic-recommender';
import { getCurrentModelConfig } from '@/lib/utils/model-config';
import type { StageListItem } from '@/lib/utils/stage-storage';

interface RecommendTopicsButtonProps {
  classrooms: StageListItem[];
  onSelectTopic: (topic: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function RecommendTopicsButton({
  classrooms,
  onSelectTopic,
  textareaRef,
}: RecommendTopicsButtonProps) {
  const [open, setOpen] = useState(false);

  // Read current model config once at render time (useSettingsStore is reactive)
  const modelCfg = getCurrentModelConfig();

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            onClick={() => setOpen(true)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer select-none whitespace-nowrap border shrink-0 h-8',
              'border-amber-300/60 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20',
            )}
          >
            <Lightbulb className="size-3.5" />
            <span className="hidden sm:inline relative z-10">推荐主题</span>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          基于学习历史推荐新主题
        </TooltipContent>
      </Tooltip>

      <TopicRecommenderDialog
        open={open}
        onOpenChange={setOpen}
        classrooms={classrooms}
        onSelectTopic={(topic) => {
          onSelectTopic(topic);
          textareaRef?.current?.focus();
        }}
        model={modelCfg.modelString}
        apiKey={modelCfg.apiKey}
        baseUrl={modelCfg.baseUrl}
        providerType={modelCfg.providerType}
      />
    </>
  );
}
