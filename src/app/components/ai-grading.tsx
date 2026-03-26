import { useState, useRef, useCallback, useEffect } from "react";
import {
  LayoutGrid,
  Monitor,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Zap,
  Move,
  GripVertical,
  Ban,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Eye,
  AlertTriangle,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  Pencil,
  RefreshCw,
  CheckSquare,
  ScanLine,
  ListChecks,
  Play,
  Pause,
} from "lucide-react";
import { SubjectiveTab } from "./subjective-tab";

interface AIGradingProps {
  onBack: () => void;
}

interface SubRegion {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type?: "识别" | "排除";
}

interface QuestionRegion {
  questionId: string;
  subRegions: SubRegion[];
}

const REGION_COLORS: Record<string, string> = {
  "fill-1-10": "#1890ff",
  "fill-11-20": "#52c41a",
  "fill-21-30": "#faad14",
  "short-31": "#f5222d",
  "essay-32": "#722ed1",
  "calc-33a": "#13c2c2",
  "calc-33b": "#2f54eb",
  "writing-34": "#eb2f96",
};

const allQuestions = [
  { id: "fill-1-10", label: "填空题1-10" },
  { id: "fill-11-20", label: "填空题11-20" },
  { id: "fill-21-30", label: "填空题21-30" },
  { id: "short-31", label: "简答题31" },
  { id: "essay-32", label: "论述题32" },
  { id: "calc-33a", label: "计算题33(1)" },
  { id: "calc-33b", label: "计算题33(2)" },
  { id: "writing-34", label: "作文题34" },
];

// Map each tab to its question IDs
const tabQuestionIds: Record<string, string[]> = {
  "填空题": ["fill-1-10", "fill-11-20", "fill-21-30"],
  "简答/论述题": ["short-31", "essay-32"],
  "计算/解答题": ["calc-33a", "calc-33b"],
  "作文题": ["writing-34"],
};

// Mock regions simulating subjective answer areas on a scanned answer sheet
const autoRegions: Record<string, SubRegion[]> = {
  "fill-1-10": [
    { id: "f1-1", label: "第1空", x: 32, y: 20, w: 96, h: 26 },
    { id: "f1-2", label: "第2空", x: 140, y: 20, w: 96, h: 26 },
    { id: "f1-3", label: "第3空", x: 248, y: 20, w: 96, h: 26 },
    { id: "f1-4", label: "第4空", x: 356, y: 20, w: 96, h: 26 },
    { id: "f1-5", label: "第5空", x: 464, y: 20, w: 96, h: 26 },
    { id: "f1-6", label: "第6空", x: 32, y: 60, w: 96, h: 26 },
    { id: "f1-7", label: "第7空", x: 140, y: 60, w: 96, h: 26 },
    { id: "f1-8", label: "第8空", x: 248, y: 60, w: 96, h: 26 },
    { id: "f1-9", label: "第9空", x: 356, y: 60, w: 96, h: 26 },
    { id: "f1-10", label: "第10空", x: 464, y: 60, w: 96, h: 26 },
  ],
  "fill-11-20": [
    { id: "f2-1", label: "第11空", x: 32, y: 20, w: 96, h: 26 },
    { id: "f2-2", label: "第12空", x: 140, y: 20, w: 96, h: 26 },
    { id: "f2-3", label: "第13空", x: 248, y: 20, w: 96, h: 26 },
    { id: "f2-4", label: "第14空", x: 356, y: 20, w: 96, h: 26 },
    { id: "f2-5", label: "第15空", x: 464, y: 20, w: 96, h: 26 },
    { id: "f2-6", label: "第16空", x: 32, y: 60, w: 96, h: 26 },
    { id: "f2-7", label: "第17空", x: 140, y: 60, w: 96, h: 26 },
    { id: "f2-8", label: "第18空", x: 248, y: 60, w: 96, h: 26 },
    { id: "f2-9", label: "第19空", x: 356, y: 60, w: 96, h: 26 },
    { id: "f2-10", label: "第20空", x: 464, y: 60, w: 96, h: 26 },
  ],
  "fill-21-30": [
    { id: "f3-1", label: "第21空", x: 32, y: 20, w: 96, h: 26 },
    { id: "f3-2", label: "第22空", x: 140, y: 20, w: 96, h: 26 },
    { id: "f3-3", label: "第23空", x: 248, y: 20, w: 96, h: 26 },
    { id: "f3-4", label: "第24空", x: 356, y: 20, w: 96, h: 26 },
    { id: "f3-5", label: "第25空", x: 464, y: 20, w: 96, h: 26 },
    { id: "f3-6", label: "第26空", x: 32, y: 60, w: 96, h: 26 },
    { id: "f3-7", label: "第27空", x: 140, y: 60, w: 96, h: 26 },
    { id: "f3-8", label: "第28空", x: 248, y: 60, w: 96, h: 26 },
    { id: "f3-9", label: "第29空", x: 356, y: 60, w: 96, h: 26 },
    { id: "f3-10", label: "第30空", x: 464, y: 60, w: 96, h: 26 },
  ],
  "short-31": [
    { id: "s31-1", label: "作答区域", x: 32, y: 20, w: 530, h: 120 },
  ],
  "essay-32": [
    { id: "e32-1", label: "作答区域(1)", x: 32, y: 20, w: 530, h: 100 },
    { id: "e32-2", label: "作答区域(2)", x: 32, y: 134, w: 530, h: 100 },
  ],
  "calc-33a": [
    { id: "c33a-1", label: "作答区域(1)", x: 32, y: 20, w: 530, h: 100 },
    { id: "c33a-2", label: "作答区域(2)", x: 32, y: 134, w: 530, h: 100 },
  ],
  "calc-33b": [
    { id: "c33b-1", label: "作答区域(1)", x: 32, y: 20, w: 530, h: 100 },
    { id: "c33b-2", label: "作答区域(2)", x: 32, y: 134, w: 530, h: 100 },
  ],
  "writing-34": [
    { id: "w34-1", label: "作答区域", x: 32, y: 20, w: 530, h: 260 },
  ],
};

// Mock recognized answer distribution per sub-region
const mockRecognizedAnswers: Record<string, { answer: string; count: number; pct: number; isCorrect?: boolean }[]> = {
  "f1-1":  [{ answer: "A", count: 312, pct: 78.0, isCorrect: true }, { answer: "B", count: 48, pct: 12.0 }, { answer: "C", count: 28, pct: 7.0 }, { answer: "空白", count: 12, pct: 3.0 }],
  "f1-2":  [{ answer: "B", count: 286, pct: 71.5, isCorrect: true }, { answer: "A", count: 62, pct: 15.5 }, { answer: "D", count: 36, pct: 9.0 }, { answer: "空白", count: 16, pct: 4.0 }],
  "f1-3":  [{ answer: "C", count: 264, pct: 66.0, isCorrect: true }, { answer: "A", count: 72, pct: 18.0 }, { answer: "B", count: 44, pct: 11.0 }, { answer: "空白", count: 20, pct: 5.0 }],
  "f1-4":  [{ answer: "A", count: 340, pct: 85.0, isCorrect: true }, { answer: "D", count: 32, pct: 8.0 }, { answer: "B", count: 20, pct: 5.0 }, { answer: "空白", count: 8, pct: 2.0 }],
  "f1-5":  [{ answer: "D", count: 228, pct: 57.0, isCorrect: true }, { answer: "C", count: 96, pct: 24.0 }, { answer: "A", count: 52, pct: 13.0 }, { answer: "空白", count: 24, pct: 6.0 }],
  "f1-6":  [{ answer: "B", count: 296, pct: 74.0, isCorrect: true }, { answer: "C", count: 56, pct: 14.0 }, { answer: "A", count: 32, pct: 8.0 }, { answer: "空白", count: 16, pct: 4.0 }],
  "f1-7":  [{ answer: "A", count: 324, pct: 81.0, isCorrect: true }, { answer: "B", count: 40, pct: 10.0 }, { answer: "D", count: 24, pct: 6.0 }, { answer: "空白", count: 12, pct: 3.0 }],
  "f1-8":  [{ answer: "C", count: 252, pct: 63.0, isCorrect: true }, { answer: "B", count: 80, pct: 20.0 }, { answer: "A", count: 48, pct: 12.0 }, { answer: "空白", count: 20, pct: 5.0 }],
  "f1-9":  [{ answer: "B", count: 276, pct: 69.0, isCorrect: true }, { answer: "D", count: 64, pct: 16.0 }, { answer: "C", count: 40, pct: 10.0 }, { answer: "空白", count: 20, pct: 5.0 }],
  "f1-10": [{ answer: "D", count: 308, pct: 77.0, isCorrect: true }, { answer: "A", count: 48, pct: 12.0 }, { answer: "C", count: 28, pct: 7.0 }, { answer: "空白", count: 16, pct: 4.0 }],
  "f2-1":  [{ answer: "C", count: 288, pct: 72.0, isCorrect: true }, { answer: "B", count: 60, pct: 15.0 }, { answer: "A", count: 36, pct: 9.0 }, { answer: "空白", count: 16, pct: 4.0 }],
  "f2-2":  [{ answer: "A", count: 332, pct: 83.0, isCorrect: true }, { answer: "C", count: 36, pct: 9.0 }, { answer: "B", count: 24, pct: 6.0 }, { answer: "空白", count: 8, pct: 2.0 }],
  "f2-3":  [{ answer: "B", count: 244, pct: 61.0, isCorrect: true }, { answer: "A", count: 84, pct: 21.0 }, { answer: "D", count: 48, pct: 12.0 }, { answer: "空白", count: 24, pct: 6.0 }],
  "f2-4":  [{ answer: "D", count: 268, pct: 67.0, isCorrect: true }, { answer: "C", count: 72, pct: 18.0 }, { answer: "B", count: 40, pct: 10.0 }, { answer: "空白", count: 20, pct: 5.0 }],
  "f2-5":  [{ answer: "A", count: 356, pct: 89.0, isCorrect: true }, { answer: "B", count: 24, pct: 6.0 }, { answer: "C", count: 12, pct: 3.0 }, { answer: "空白", count: 8, pct: 2.0 }],
  "f2-6":  [{ answer: "C", count: 240, pct: 60.0, isCorrect: true }, { answer: "D", count: 88, pct: 22.0 }, { answer: "A", count: 52, pct: 13.0 }, { answer: "空白", count: 20, pct: 5.0 }],
  "f2-7":  [{ answer: "B", count: 300, pct: 75.0, isCorrect: true }, { answer: "A", count: 52, pct: 13.0 }, { answer: "C", count: 32, pct: 8.0 }, { answer: "空白", count: 16, pct: 4.0 }],
  "f2-8":  [{ answer: "A", count: 280, pct: 70.0, isCorrect: true }, { answer: "D", count: 64, pct: 16.0 }, { answer: "B", count: 40, pct: 10.0 }, { answer: "空白", count: 16, pct: 4.0 }],
  "f2-9":  [{ answer: "D", count: 316, pct: 79.0, isCorrect: true }, { answer: "B", count: 44, pct: 11.0 }, { answer: "C", count: 28, pct: 7.0 }, { answer: "空白", count: 12, pct: 3.0 }],
  "f2-10": [{ answer: "C", count: 260, pct: 65.0, isCorrect: true }, { answer: "A", count: 76, pct: 19.0 }, { answer: "B", count: 44, pct: 11.0 }, { answer: "空白", count: 20, pct: 5.0 }],
  "f3-1":  [{ answer: "海内存知己", count: 292, pct: 73.0, isCorrect: true }, { answer: "海内存知已", count: 56, pct: 14.0 }, { answer: "海内存知记", count: 36, pct: 9.0 }, { answer: "空白", count: 16, pct: 4.0 }],
  "f3-2":  [{ answer: "天涯若比邻", count: 348, pct: 87.0, isCorrect: true }, { answer: "天涯若比临", count: 28, pct: 7.0 }, { answer: "天涯若此邻", count: 16, pct: 4.0 }, { answer: "空白", count: 8, pct: 2.0 }],
  "f3-3":  [{ answer: "落霞与孤鹜齐飞", count: 236, pct: 59.0, isCorrect: true }, { answer: "落霞与孤骛齐飞", count: 88, pct: 22.0 }, { answer: "落霞与孤鹜齐非", count: 52, pct: 13.0 }, { answer: "空白", count: 24, pct: 6.0 }],
  "f3-4":  [{ answer: "秋水共长天一色", count: 272, pct: 68.0, isCorrect: true }, { answer: "秋水共常天一色", count: 68, pct: 17.0 }, { answer: "秋水共長天一色", count: 40, pct: 10.0 }, { answer: "空白", count: 20, pct: 5.0 }],
  "f3-5":  [{ answer: "山重水复疑无路", count: 320, pct: 80.0, isCorrect: true }, { answer: "山重水覆疑无路", count: 44, pct: 11.0 }, { answer: "山重水复凝无路", count: 24, pct: 6.0 }, { answer: "空白", count: 12, pct: 3.0 }],
  "f3-6":  [{ answer: "柳暗花明又一村", count: 256, pct: 64.0, isCorrect: true }, { answer: "柳暗花明又一春", count: 76, pct: 19.0 }, { answer: "柳暗花名又一村", count: 48, pct: 12.0 }, { answer: "空白", count: 20, pct: 5.0 }],
  "f3-7":  [{ answer: "但愿人长久", count: 304, pct: 76.0, isCorrect: true }, { answer: "但愿人常久", count: 52, pct: 13.0 }, { answer: "但愿人长九", count: 28, pct: 7.0 }, { answer: "空白", count: 16, pct: 4.0 }],
  "f3-8":  [{ answer: "千里共婵娟", count: 284, pct: 71.0, isCorrect: true }, { answer: "千里共蝉娟", count: 60, pct: 15.0 }, { answer: "千里共婵鹃", count: 40, pct: 10.0 }, { answer: "空白", count: 16, pct: 4.0 }],
  "f3-9":  [{ answer: "先天下之忧而忧", count: 336, pct: 84.0, isCorrect: true }, { answer: "先天下之忧而优", count: 32, pct: 8.0 }, { answer: "先天下之尤而忧", count: 20, pct: 5.0 }, { answer: "空白", count: 12, pct: 3.0 }],
  "f3-10": [{ answer: "后天下之乐而乐", count: 248, pct: 62.0, isCorrect: true }, { answer: "后天下之乐而落", count: 80, pct: 20.0 }, { answer: "后天下之落而乐", count: 48, pct: 12.0 }, { answer: "空白", count: 24, pct: 6.0 }],
};

const fillAnswerColors: Record<string, string> = {
  A: "#52c41a",
  B: "#1890ff",
  C: "#fa8c16",
  D: "#722ed1",
  "空白": "#d9d9d9",
};

// Dynamic color palette for long-text answers that don't match A/B/C/D
const dynamicAnswerColorPalette = ["#52c41a", "#1890ff", "#fa8c16", "#722ed1", "#f5222d", "#13c2c2", "#eb2f96", "#2f54eb"];

function getAnswerColor(answer: string, index: number): string {
  if (fillAnswerColors[answer]) return fillAnswerColors[answer];
  if (answer === "空白") return "#d9d9d9";
  return dynamicAnswerColorPalette[index % dynamicAnswerColorPalette.length];
}

// Truncate long text for compact display
function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "…";
}

// Default scores per question type
const defaultScores: Record<string, number> = {
  "fill-1-10": 1,
  "fill-11-20": 1,
  "fill-21-30": 1,
  "short-31": 10,
  "essay-32": 15,
  "calc-33a": 5,
  "calc-33b": 5,
  "writing-34": 25,
};

const getQuestionLabel = (id: string) =>
  allQuestions.find((q) => q.id === id)?.label ?? id;

const getQuestionColor = (id: string) => REGION_COLORS[id] ?? "#1890ff";

// ─── Draggable / Resizable Region Box ────────────────────────────────
interface DraggableRegionProps {
  region: SubRegion & { color: string };
  containerRef: React.RefObject<HTMLDivElement | null>;
  onUpdate: (id: string, patch: Partial<SubRegion>) => void;
}

function DraggableRegion({ region, containerRef, onUpdate }: DraggableRegionProps) {
  const dragState = useRef<{
    type: "move" | "resize-se" | "resize-nw";
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: "move" | "resize-se" | "resize-nw") => {
      e.preventDefault();
      e.stopPropagation();
      dragState.current = {
        type,
        startX: e.clientX,
        startY: e.clientY,
        origX: region.x,
        origY: region.y,
        origW: region.w,
        origH: region.h,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragState.current || !containerRef.current) return;
        const { type: t, startX, startY, origX, origY, origW, origH } = dragState.current;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const bounds = containerRef.current.getBoundingClientRect();
        const maxW = bounds.width - 16; // inset-4 padding
        const maxH = bounds.height - 16;

        if (t === "move") {
          const nx = Math.max(0, Math.min(origX + dx, maxW - origW));
          const ny = Math.max(0, Math.min(origY + dy, maxH - origH));
          onUpdate(region.id, { x: Math.round(nx), y: Math.round(ny) });
        } else if (t === "resize-se") {
          const nw = Math.max(30, Math.min(origW + dx, maxW - origX));
          const nh = Math.max(16, Math.min(origH + dy, maxH - origY));
          onUpdate(region.id, { w: Math.round(nw), h: Math.round(nh) });
        } else if (t === "resize-nw") {
          const nw = Math.max(30, origW - dx);
          const nh = Math.max(16, origH - dy);
          const nx = origX + origW - nw;
          const ny = origY + origH - nh;
          if (nx >= 0 && ny >= 0) {
            onUpdate(region.id, {
              x: Math.round(nx),
              y: Math.round(ny),
              w: Math.round(nw),
              h: Math.round(nh),
            });
          }
        }
      };

      const handleMouseUp = () => {
        dragState.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [region, containerRef, onUpdate]
  );

  const isExcludeRegion = region.type === "排除";

  return (
    <div
      className="absolute select-none"
      style={{
        left: `${region.x}px`,
        top: `${region.y}px`,
        width: `${region.w}px`,
        height: `${region.h}px`,
        backgroundColor: region.color + "15",
        border: `1.5px ${isExcludeRegion ? "dashed" : "solid"} ${region.color}`,
        borderRadius: "3px",
        boxShadow: `0 0 0 1px ${region.color}40`,
        zIndex: isExcludeRegion ? 11 : 10,
        cursor: "move",
      }}
      onMouseDown={(e) => handleMouseDown(e, "move")}
    >
      {/* Diagonal stripes for exclude regions */}
      {isExcludeRegion && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`stripes-${region.id}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke={region.color} strokeWidth="2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#stripes-${region.id})`} />
        </svg>
      )}
      {/* Label tag */}
      <div
        className="absolute -top-[16px] left-0 text-[10px] px-1 rounded-t whitespace-nowrap pointer-events-none"
        style={{ backgroundColor: region.color, color: "#fff" }}
      >
        {region.label}
      </div>
      {/* NW resize handle */}
      <div
        className="absolute -left-[4px] -top-[4px] w-[8px] h-[8px] rounded-full cursor-nw-resize"
        style={{ backgroundColor: region.color }}
        onMouseDown={(e) => handleMouseDown(e, "resize-nw")}
      />
      {/* SE resize handle */}
      <div
        className="absolute -right-[4px] -bottom-[4px] w-[8px] h-[8px] rounded-full cursor-se-resize"
        style={{ backgroundColor: region.color }}
        onMouseDown={(e) => handleMouseDown(e, "resize-se")}
      />
    </div>
  );
}

// ─── Phase Step Component ──────────────────────────────────────────
function PhaseStep({
  number,
  icon: Icon,
  title,
  description,
  isActive,
  isCompleted,
  onClick,
}: {
  number: number;
  icon: any;
  title: string;
  description: string;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
        isActive
          ? "border-[#1890ff] bg-[#e6f7ff]"
          : isCompleted
          ? "border-[#b7eb8f] bg-[#f6ffed]"
          : "border-[#e8e8e8] bg-white hover:border-[#91d5ff]"
      }`}
      onClick={onClick}
    >
      <div
        className={`w-[32px] h-[32px] rounded-full flex items-center justify-center flex-shrink-0 ${
          isActive
            ? "bg-[#1890ff] text-white"
            : isCompleted
            ? "bg-[#52c41a] text-white"
            : "bg-[#f0f0f0] text-[#999]"
        }`}
      >
        {isCompleted ? (
          <span className="text-[14px]">&#10003;</span>
        ) : (
          <span className="text-[13px]">{number}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={15} className={isActive ? "text-[#1890ff]" : isCompleted ? "text-[#52c41a]" : "text-[#999]"} />
          <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>
            {title}
          </span>
        </div>
        <p className="text-[12px] text-[#999] leading-[18px]">{description}</p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export function AIGrading({ onBack }: AIGradingProps) {
  const [activeTab, setActiveTab] = useState("填空题");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [questionRegions, setQuestionRegions] = useState<QuestionRegion[]>([]);
  // Track which tab owns each selected question: questionId → tab name
  const [questionOwnership, setQuestionOwnership] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, string>>({});
  const [activeRegionQuestion, setActiveRegionQuestion] = useState<string | null>(null);
  const [templateComputed, setTemplateComputed] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [fillPreviewZoom, setFillPreviewZoom] = useState(1);
  const [fillPreviewRotation, setFillPreviewRotation] = useState(0);
  const [fillOcrStarted, setFillOcrStarted] = useState(false);
  const [fillOcrPaused, setFillOcrPaused] = useState(false);
  const [fillOcrProgress, setFillOcrProgress] = useState({ total: 400, completed: 0, failed: 0, pending: 400 });
  const [fillAbnormalMode, setFillAbnormalMode] = useState<"auto" | "manual">("auto");
  const [fillAiScoreMode, setFillAiScoreMode] = useState<"machine" | "dual" | "reference">("machine");
  const [fillActiveStep, setFillActiveStep] = useState<"select" | "region" | "ocr" | "answer" | "scoring">("select");

  // Simulate OCR progress when enabled
  useEffect(() => {
    if (fillActiveStep === "ocr" && fillOcrStarted && !fillOcrPaused && fillOcrProgress.pending > 0) {
      const timer = setInterval(() => {
        setFillOcrProgress(prev => {
          if (prev.pending <= 0) {
            clearInterval(timer);
            return prev;
          }
          // Simulate processing 10-20 items at a time
          const processCount = Math.min(prev.pending, Math.floor(Math.random() * 10) + 10);
          // 95% success rate
          const successCount = Math.floor(processCount * 0.95);
          const failCount = processCount - successCount;
          
          return {
            total: prev.total,
            completed: prev.completed + successCount,
            failed: prev.failed + failCount,
            pending: prev.pending - processCount
          };
        });
      }, 500);
      return () => clearInterval(timer);
    }
  }, [fillActiveStep, fillOcrStarted, fillOcrPaused, fillOcrProgress.pending]);
  const [fillMachineReviewEnabled, setFillMachineReviewEnabled] = useState(true);
  const [fillMachineReviewRatio, setFillMachineReviewRatio] = useState("10");
  const [fillMachineReviewStrategy, setFillMachineReviewStrategy] = useState<"random" | "lowConf" | "borderline">("random");
  const [fillScoringProgress, setFillScoringProgress] = useState({ total: 400, completed: 0, pending: 400 });
  const [fillScoringStarted, setFillScoringStarted] = useState(false);
  const [fillScoringPaused, setFillScoringPaused] = useState(false);

  useEffect(() => {
    if (fillActiveStep === "scoring" && fillScoringStarted && !fillScoringPaused && fillScoringProgress.pending > 0) {
      const timer = setInterval(() => {
        setFillScoringProgress(prev => {
          if (prev.pending <= 0) {
            clearInterval(timer);
            return prev;
          }
          const processCount = Math.min(prev.pending, Math.floor(Math.random() * 8) + 8);
          return {
            total: prev.total,
            completed: prev.completed + processCount,
            pending: prev.pending - processCount
          };
        });
      }, 600);
      return () => clearInterval(timer);
    }
  }, [fillActiveStep, fillScoringStarted, fillScoringPaused, fillScoringProgress.pending]);
  const [fillConsistencyRate] = useState(96.2);
  const [fillAnswerMode, setFillAnswerMode] = useState<"manual" | "recognized">("recognized");
  const [fillCompletedSteps, setFillCompletedSteps] = useState<Set<string>>(new Set());
  const [perAnswerScores, setPerAnswerScores] = useState<Record<string, Record<string, string>>>({});
  const [expandedRegionStats, setExpandedRegionStats] = useState<string | null>(null);
  const [fillCorrectAnswers, setFillCorrectAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    Object.keys(mockRecognizedAnswers).forEach(key => {
      const correct = mockRecognizedAnswers[key].find(s => s.isCorrect);
      if (correct) {
        initial[key] = correct.answer;
      }
    });
    return initial;
  });
  const [fillEditingRegionId, setFillEditingRegionId] = useState<string | null>(null);
  const [fillEditingLabelValue, setFillEditingLabelValue] = useState("");
  const fillEditInputRef = useRef<HTMLInputElement>(null);

  const tabs = ["填空题", "简答/论述题", "计算/解答题", "作文题"];

  // Questions owned by current tab
  const currentTabQuestions = selectedQuestions.filter(
    (id) => questionOwnership[id] === activeTab
  );

  // Initialize default scores when computing template
  const initDefaultScores = (regions: QuestionRegion[]) => {
    const newScores: Record<string, string> = {};
    regions.forEach((qr) => {
      const ds = defaultScores[qr.questionId] ?? 1;
      qr.subRegions.forEach((sr) => {
        newScores[sr.id] = String(ds);
      });
    });
    setScores((prev) => ({ ...newScores, ...prev }));
  };

  const toggleQuestion = (id: string) => {
    if (selectedQuestions.includes(id)) {
      // Can only deselect if owned by current tab
      if (questionOwnership[id] !== activeTab) return;
      setSelectedQuestions((prev) => prev.filter((q) => q !== id));
      setQuestionRegions((regions) => regions.filter((r) => r.questionId !== id));
      setQuestionOwnership((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (activeRegionQuestion === id) setActiveRegionQuestion(null);
    } else {
      setSelectedQuestions((prev) => [...prev, id]);
      setQuestionRegions((regions) => [
        ...regions,
        { questionId: id, subRegions: [] },
      ]);
      setQuestionOwnership((prev) => ({ ...prev, [id]: activeTab }));
    }
  };

  const computeTemplate = () => {
    // Auto-select only questions mapped to 填空题 that are not owned by other tabs
    const fillIds = (tabQuestionIds["填空题"] || []).filter(
      (id) => !questionOwnership[id] || questionOwnership[id] === "填空题"
    );
    setSelectedQuestions((prev) => {
      const others = prev.filter((id) => !fillIds.includes(id));
      return [...others, ...fillIds];
    });
    const newRegions = fillIds.map((id) => ({
      questionId: id,
      subRegions: autoRegions[id] || [],
    }));
    setQuestionRegions((prev) => {
      const others = prev.filter((qr) => !fillIds.includes(qr.questionId));
      return [...others, ...newRegions];
    });
    setQuestionOwnership((prev) => {
      const next = { ...prev };
      fillIds.forEach((id) => { next[id] = "填空题"; });
      return next;
    });
    initDefaultScores(newRegions);
    setTemplateComputed(true);
    setActiveRegionQuestion(fillIds[0] || null);
  };

  const addSubRegion = (questionId: string) => {
    setQuestionRegions((prev) =>
      prev.map((qr) => {
        if (qr.questionId !== questionId) return qr;
        const recognitionRegions = qr.subRegions.filter((sr) => sr.type !== "排除");
        const idx = recognitionRegions.length + 1;
        const baseX = 32 + ((idx - 1) % 5) * 108;
        const baseY = 20 + Math.floor((idx - 1) / 5) * 40;
        const newId = `${questionId}-manual-${Date.now()}`;
        const ds = defaultScores[questionId] ?? 1;
        setScores((s) => ({ ...s, [newId]: String(ds) }));
        return {
          ...qr,
          subRegions: [
            ...qr.subRegions,
            { id: newId, label: `区域${idx}`, x: baseX, y: baseY, w: 96, h: 26, type: "识别" as const },
          ],
        };
      })
    );
  };

  const addExcludeRegion = (questionId: string) => {
    setQuestionRegions((prev) =>
      prev.map((qr) => {
        if (qr.questionId !== questionId) return qr;
        const excludeRegions = qr.subRegions.filter((sr) => sr.type === "排除");
        const idx = excludeRegions.length + 1;
        const newId = `${questionId}-exclude-${Date.now()}`;
        return {
          ...qr,
          subRegions: [
            ...qr.subRegions,
            { id: newId, label: `排除${idx}`, x: 32, y: 100 + (idx - 1) * 40, w: 120, h: 30, type: "排除" as const },
          ],
        };
      })
    );
  };

  const removeSubRegion = (questionId: string, regionId: string) => {
    setQuestionRegions((prev) =>
      prev.map((qr) => {
        if (qr.questionId !== questionId) return qr;
        return { ...qr, subRegions: qr.subRegions.filter((sr) => sr.id !== regionId) };
      })
    );
  };

  const renameSubRegion = (questionId: string, regionId: string, newLabel: string) => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    setQuestionRegions((prev) =>
      prev.map((qr) => {
        if (qr.questionId !== questionId) return qr;
        return {
          ...qr,
          subRegions: qr.subRegions.map((sr) => (sr.id === regionId ? { ...sr, label: trimmed } : sr)),
        };
      })
    );
  };

  const startFillEditing = (regionId: string, currentLabel: string) => {
    setFillEditingRegionId(regionId);
    setFillEditingLabelValue(currentLabel);
    setTimeout(() => fillEditInputRef.current?.focus(), 0);
  };

  const commitFillEdit = (questionId: string) => {
    if (fillEditingRegionId) {
      renameSubRegion(questionId, fillEditingRegionId, fillEditingLabelValue);
      setFillEditingRegionId(null);
    }
  };

  // Handler for drag/resize updates from DraggableRegion
  const handleRegionUpdate = useCallback(
    (regionId: string, patch: Partial<SubRegion>) => {
      if (!activeRegionQuestion) return;
      setQuestionRegions((prev) =>
        prev.map((qr) => {
          if (qr.questionId !== activeRegionQuestion) return qr;
          return {
            ...qr,
            subRegions: qr.subRegions.map((sr) =>
              sr.id === regionId ? { ...sr, ...patch } : sr
            ),
          };
        })
      );
    },
    [activeRegionQuestion]
  );

  // Build preview data
  const activeQR = questionRegions.find((qr) => qr.questionId === activeRegionQuestion);
  const previewRegions = activeQR
    ? activeQR.subRegions.map((sr) => ({
        ...sr,
        color: sr.type === "排除" ? "#fa8c16" : getQuestionColor(activeQR.questionId),
      }))
    : [];

  // Count regions for current tab only
  const currentTabRegions = questionRegions.filter((qr) => currentTabQuestions.includes(qr.questionId));
  const currentTabSubCount = currentTabRegions.reduce((sum, qr) => sum + qr.subRegions.length, 0);

  const totalSubCount = questionRegions
    .filter((qr) => selectedQuestions.includes(qr.questionId))
    .reduce((sum, qr) => sum + qr.subRegions.length, 0);

  const questionSelector = (
    <div className="flex items-start gap-3 mb-6 text-[14px]">
      <span className="text-[#333] flex-shrink-0 mt-[5px]" style={{ fontWeight: 500 }}>
        选择题目:
      </span>
      <div className="flex gap-2 flex-wrap">
        {allQuestions.map((q) => {
          const isSelected = selectedQuestions.includes(q.id);
          const ownerTab = questionOwnership[q.id];
          const ownedByOtherTab = isSelected && ownerTab !== activeTab;
          return (
            <button
              key={q.id}
              disabled={ownedByOtherTab}
              className={`relative h-[32px] rounded text-[13px] border transition-all px-3 flex items-center gap-1.5 ${
                ownedByOtherTab
                  ? "text-white border-transparent cursor-not-allowed opacity-50"
                  : isSelected
                  ? "text-white border-[#1890ff]"
                  : "bg-white text-[#666] border-[#d9d9d9] hover:border-[#1890ff] cursor-pointer"
              }`}
              style={{
                backgroundColor: isSelected ? getQuestionColor(q.id) : undefined,
                borderColor: isSelected && !ownedByOtherTab ? getQuestionColor(q.id) : undefined,
              }}
              onClick={() => !ownedByOtherTab && toggleQuestion(q.id)}
            >
              {q.label}
              {ownedByOtherTab && (
                <span className="text-[10px] opacity-80">({ownerTab})</span>
              )}
              {isSelected && !ownedByOtherTab && (
                <div
                  className="absolute -top-[1px] -right-[1px] w-[14px] h-[14px] rounded-bl-[6px] rounded-tr-[3px] flex items-center justify-center"
                  style={{ backgroundColor: getQuestionColor(q.id) }}
                >
                  <Check size={9} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const statusDisplay = (
    <div className="flex items-center gap-3 mb-6 text-[13px]">
      <div className="flex items-center gap-1.5">
        <Monitor size={14} className="text-[#999]" />
        <span className="text-[#999]">当前状态</span>
      </div>
      <span className="text-[#1890ff]">
        {templateComputed && selectedQuestions.length > 0
          ? `已识别 ${selectedQuestions.length} 题，共 ${totalSubCount} 个识别区域。`
          : "小智评阅未开始，请先选择题目并设置识别区域。"}
      </span>
    </div>
  );

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Header & Tabs */}
        <div className="flex items-center justify-between mb-4 border-b border-[#e8e8e8]">
          <div className="flex items-center gap-6 pb-2.5">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-[#1890ff] text-[14px] hover:text-[#40a9ff] transition-colors"
            >
              <ArrowLeft size={18} />
              <span>返回</span>
            </button>
            <span className="text-[#d9d9d9]">|</span>
            
            {/* Tabs */}
            <div className="flex gap-8 text-[16px] font-medium">
              {tabs.map((tab) => (
                <div
                  key={tab}
                  className={`cursor-pointer relative px-2 py-1 ${
                    tab === activeTab ? "text-[#1890ff]" : "text-[#666] hover:text-[#333]"
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                  {tab === activeTab && (
                    <div className="absolute -bottom-[11px] left-0 right-0 h-[3px] bg-[#1890ff] rounded-t-sm" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Title with Exam Info */}
          <div className="flex items-center gap-3 pb-2.5">
            <h2 className="text-[16px] text-[#333]" style={{ fontWeight: 500 }}>
              AI阅卷(英语)
            </h2>
            <div className="flex items-center gap-2 text-[12px] text-[#666] bg-[#f5f5f5] px-3 py-1.5 rounded-full border border-[#e8e8e8]">
              <span className="max-w-[120px] truncate" title="2024年春季期末考试">2024年春季期末考试</span>
              <span className="text-[#d9d9d9]">|</span>
              <span>高一</span>
              <span className="text-[#d9d9d9]">|</span>
              <span>英语</span>
              <button className="text-[#1890ff] hover:text-[#40a9ff] ml-1 font-medium">切换</button>
            </div>
          </div>
        </div>

        {/* Tab Content: 填空题 shows original content, others show SubjectiveTab */}
        {activeTab === "填空题" ? (
          <div className="space-y-6">
            <div className="flex gap-6">
              {/* Left Sidebar: Phase Navigation */}
              <div className="w-[240px] flex-shrink-0 space-y-3">
              <PhaseStep
                number={1}
                icon={ListChecks}
                title="选择题目"
                description="选择需要进行AI阅卷的填空题"
                isActive={fillActiveStep === "select"}
                isCompleted={selectedQuestions.length > 0 && fillActiveStep !== "select"}
                onClick={() => setFillActiveStep("select")}
              />
              <PhaseStep
                number={2}
                icon={LayoutGrid}
                title="设置识别区域"
                description="框选需要AI识别的填空题作答区域"
                isActive={fillActiveStep === "region"}
                isCompleted={currentTabSubCount > 0 && fillActiveStep !== "region"}
                onClick={() => setFillActiveStep("region")}
              />
              <PhaseStep
                number={3}
                icon={ScanLine}
                title="作答图像识别"
                description="AI自动提取学生填写的答案内容"
                isActive={fillActiveStep === "ocr"}
                isCompleted={fillCompletedSteps.has("ocr")}
                onClick={() => setFillActiveStep("ocr")}
              />
              <PhaseStep
                number={4}
                icon={CheckSquare}
                title="设置答案"
                description="设置标准答案与给分规则"
                isActive={fillActiveStep === "answer"}
                isCompleted={fillCompletedSteps.has("answer")}
                onClick={() => setFillActiveStep("answer")}
              />
              <PhaseStep
                number={5}
                icon={Settings}
                title="AI打分与评分设置"
                description="配置AI评分策略与复核比例"
                isActive={fillActiveStep === "scoring"}
                isCompleted={fillCompletedSteps.has("scoring")}
                onClick={() => setFillActiveStep("scoring")}
              />
            </div>

            <div className="flex-1 min-w-0 space-y-5">
              {/* Module 0: Select Questions */}
              {fillActiveStep === "select" && (
                <div className="border border-[#e8e8e8] rounded-lg bg-white p-6 min-h-[500px] flex flex-col">
                  <div className="flex-1">
                    <h3 className="text-[16px] font-medium mb-6 text-[#333]">选择题目</h3>
                    {questionSelector}
                    <div className="mt-8">
                      <h3 className="text-[14px] font-medium mb-4 text-[#333]">当前状态</h3>
                      {statusDisplay}
                    </div>
                  </div>
                  <div className="flex justify-center pt-6 border-t border-[#e8e8e8] mt-auto">
                    <button
                      onClick={() => setFillActiveStep("region")}
                      disabled={selectedQuestions.length === 0}
                      className={`px-8 py-2 rounded text-[14px] transition-colors ${
                        selectedQuestions.length > 0
                          ? "bg-[#1890ff] text-white hover:bg-[#40a9ff]"
                          : "bg-[#f5f5f5] text-[#b8b8b8] cursor-not-allowed"
                      }`}
                    >
                      保存设置，下一步
                    </button>
                  </div>
                </div>
              )}

              {/* Module 1: Region Setting */}
              {fillActiveStep === "region" && (
              <div className="border border-[#e8e8e8] rounded-lg flex flex-col">
                <div className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <LayoutGrid size={15} className="text-[#1890ff]" />
                    <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>设置识别区域</span>
                    <span className="text-[12px] text-[#999]">（支持拖拽调整位置和大小）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => computeTemplate()}
                      className="bg-[#1890ff] text-white px-4 py-1 rounded text-[13px] hover:bg-[#40a9ff] transition-colors flex items-center gap-1.5"
                    >
                      <Zap size={13} />
                      自动划题
                    </button>
                  </div>
                </div>
                <div className="p-4 flex-1">
                  <div className="flex gap-4">
                  {/* Left: Region list */}
                  <div className="w-[360px] flex-shrink-0 border border-[#e8e8e8] rounded-lg overflow-hidden">
                    <div className="bg-[#fafafa] px-4 py-2.5 text-[13px] text-[#666] border-b border-[#e8e8e8] flex items-center justify-between">
                      <span>题目 / 识别区域</span>
                      <span>共 {currentTabSubCount} 个区域</span>
                    </div>
                    <div className="max-h-[380px] overflow-y-auto">
                      {currentTabQuestions.length === 0 ? (
                        <div className="px-4 py-8 text-center text-[13px] text-[#999]">
                          请先在上方勾选需要设置的题目
                        </div>
                      ) : (
                        questionRegions
                          .filter((qr) => currentTabQuestions.includes(qr.questionId))
                          .sort(
                            (a, b) =>
                              allQuestions.findIndex((q) => q.id === a.questionId) -
                              allQuestions.findIndex((q) => q.id === b.questionId)
                          )
                          .map((qr) => {
                            const color = getQuestionColor(qr.questionId);
                            const isActive = activeRegionQuestion === qr.questionId;
                            const qInfo = allQuestions.find((q) => q.id === qr.questionId);
                            if (!qInfo) return null;
                            return (
                              <div key={qr.questionId}>
                                <div
                                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer border-b border-[#f0f0f0] transition-colors ${
                                    isActive ? "bg-[#e6f7ff]" : "hover:bg-[#fafafa]"
                                  }`}
                                  onClick={() =>
                                    setActiveRegionQuestion(isActive ? null : qr.questionId)
                                  }
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-[6px] h-[6px] rounded-full"
                                      style={{ backgroundColor: color }}
                                    />
                                    <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>
                                      {qInfo.label}
                                    </span>
                                    <span className="text-[12px] text-[#999]">
                                      {qr.subRegions.filter((sr) => sr.type !== "排除").length}个区域
                                      {qr.subRegions.filter((sr) => sr.type === "排除").length > 0 && (
                                        <span className="text-[#fa8c16] ml-1">
                                          {qr.subRegions.filter((sr) => sr.type === "排除").length}个排除
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addSubRegion(qr.questionId);
                                      }}
                                      className="text-[#1890ff] hover:text-[#40a9ff] transition-colors flex items-center gap-0.5 text-[12px]"
                                    >
                                      <Plus size={12} />
                                      识别
                                    </button>
                                    <span className="text-[#e8e8e8] text-[12px]">|</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addExcludeRegion(qr.questionId);
                                      }}
                                      className="text-[#fa8c16] hover:text-[#ffa940] transition-colors flex items-center gap-0.5 text-[12px]"
                                    >
                                      <Ban size={11} />
                                      排除
                                    </button>
                                  </div>
                                </div>

                                {isActive &&
                                  qr.subRegions.map((sr) => {
                                    const isExclude = sr.type === "排除";
                                    const itemColor = isExclude ? "#fa8c16" : color;
                                    return (
                                    <div
                                      key={sr.id}
                                      className={`flex items-center justify-between px-4 py-2 pl-8 border-b border-[#f0f0f0] group ${
                                        isExclude ? "bg-[#fff7e6]/50" : "bg-[#fafbfc]"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <GripVertical size={12} className="text-[#ccc]" />
                                        <div
                                          className="w-[10px] h-[10px] rounded-sm border"
                                          style={{
                                            borderColor: itemColor,
                                            backgroundColor: itemColor + "20",
                                            ...(isExclude ? { borderStyle: "dashed" } : {}),
                                          }}
                                        />
                                        {fillEditingRegionId === sr.id ? (
                                          <input
                                            ref={fillEditInputRef}
                                            value={fillEditingLabelValue}
                                            onChange={(e) => setFillEditingLabelValue(e.target.value)}
                                            onBlur={() => commitFillEdit(qr.questionId)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") commitFillEdit(qr.questionId);
                                              if (e.key === "Escape") setFillEditingRegionId(null);
                                            }}
                                            className="text-[12px] text-[#333] border border-[#1890ff] rounded px-1 py-px outline-none bg-white w-[80px]"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        ) : (
                                          <span
                                            className="text-[12px] text-[#555] cursor-pointer hover:text-[#1890ff] transition-colors inline-flex items-center gap-1 group/label"
                                            onClick={(e) => { e.stopPropagation(); startFillEditing(sr.id, sr.label); }}
                                            title="点击重命名"
                                          >
                                            {sr.label}
                                            <Pencil size={10} className="text-[#ccc] opacity-0 group-hover/label:opacity-100 transition-opacity" />
                                          </span>
                                        )}
                                        {isExclude && (
                                          <span className="text-[10px] px-1 py-px rounded bg-[#fff7e6] text-[#fa8c16] border border-[#ffd591]">
                                            排除
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-[11px] text-[#999] font-mono">
                                          {sr.x},{sr.y} | {sr.w}×{sr.h}
                                        </span>
                                        <button
                                          onClick={() => removeSubRegion(qr.questionId, sr.id)}
                                          className="text-[#999] hover:text-[#ff4d4f] opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                    );
                                  })}
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>

                  {/* Right: Visual preview with real drag/resize */}
                  <div className="flex-1 border border-[#e8e8e8] rounded-lg overflow-hidden">
                    <div className="bg-[#fafafa] px-4 py-2.5 text-[13px] text-[#666] border-b border-[#e8e8e8] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Move size={13} className="text-[#999]" />
                        <span>识别区域预览</span>
                        {activeRegionQuestion && (
                          <span
                            className="text-[11px] px-1.5 py-px rounded text-white ml-1"
                            style={{ backgroundColor: getQuestionColor(activeRegionQuestion) }}
                          >
                            {getQuestionLabel(activeRegionQuestion)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setFillPreviewRotation((r) => r - 90)}
                          className="p-1 rounded hover:bg-[#e8e8e8] transition-colors text-[#666] hover:text-[#333]"
                          title="向左旋转90°"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => setFillPreviewRotation((r) => r + 90)}
                          className="p-1 rounded hover:bg-[#e8e8e8] transition-colors text-[#666] hover:text-[#333]"
                          title="向右旋转90°"
                        >
                          <RotateCw size={14} />
                        </button>
                        <div className="w-px h-[14px] bg-[#d9d9d9] mx-1" />
                        <button
                          onClick={() => setFillPreviewZoom((z) => Math.max(0.25, z - 0.25))}
                          className="p-1 rounded hover:bg-[#e8e8e8] transition-colors text-[#666] hover:text-[#333]"
                          title="缩小"
                        >
                          <ZoomOut size={14} />
                        </button>
                        <span className="text-[12px] text-[#666] w-[40px] text-center tabular-nums">
                          {Math.round(fillPreviewZoom * 100)}%
                        </span>
                        <button
                          onClick={() => setFillPreviewZoom((z) => Math.min(3, z + 0.25))}
                          className="p-1 rounded hover:bg-[#e8e8e8] transition-colors text-[#666] hover:text-[#333]"
                          title="放大"
                        >
                          <ZoomIn size={14} />
                        </button>
                        <div className="w-px h-[14px] bg-[#d9d9d9] mx-1" />
                        <button
                          onClick={() => { setFillPreviewZoom(1); setFillPreviewRotation(0); }}
                          className="p-1 rounded hover:bg-[#e8e8e8] transition-colors text-[#666] hover:text-[#333]"
                          title="重置"
                        >
                          <Maximize size={14} />
                        </button>
                      </div>
                    </div>
                    <div
                      className="relative bg-[#f7f8fa] overflow-auto"
                      style={{ height: "380px" }}
                    >
                      <div
                        ref={previewContainerRef}
                        className="relative origin-top-left transition-transform duration-200"
                        style={{
                          width: "600px",
                          height: "380px",
                          transform: `scale(${fillPreviewZoom}) rotate(${fillPreviewRotation}deg)`,
                        }}
                      >
                        {/* Answer-sheet style background */}
                        <div className="absolute inset-0 p-2">
                          {/* Horizontal lines */}
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div
                              key={`hl-${i}`}
                              className="absolute left-2 right-2 border-b border-dashed"
                              style={{
                                top: `${20 + i * 36}px`,
                                borderColor: i % 3 === 0 ? "#ddd" : "#eee",
                              }}
                            />
                          ))}
                          {/* Vertical lines */}
                          {Array.from({ length: 7 }).map((_, i) => (
                            <div
                              key={`vl-${i}`}
                              className="absolute top-2 bottom-2 border-l border-dashed"
                              style={{
                                left: `${i * 100}px`,
                                borderColor: "#eee",
                              }}
                            />
                          ))}
                        </div>

                        {/* Draggable region overlays */}
                        <div className="absolute inset-0" style={{ padding: "0" }}>
                          {previewRegions.map((region) => (
                            <DraggableRegion
                              key={region.id}
                              region={region}
                              containerRef={previewContainerRef}
                              onUpdate={handleRegionUpdate}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Empty state */}
                      {!activeRegionQuestion && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#f7f8fa]/80">
                          <div className="text-center">
                            <LayoutGrid size={40} className="text-[#d9d9d9] mx-auto mb-2" />
                            <p className="text-[13px] text-[#999]">
                              {selectedQuestions.length === 0
                                ? "勾选题目后，点击左侧题目查看识别区域"
                                : "点击左侧题目查看对应识别区域"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                </div>
                <div className="flex justify-center pt-4 pb-4 border-t border-[#e8e8e8] mt-auto">
                  <button
                    onClick={() => setFillActiveStep("ocr")}
                    disabled={currentTabSubCount === 0}
                    className={`px-8 py-2 rounded text-[14px] transition-colors ${
                      currentTabSubCount > 0
                        ? "bg-[#1890ff] text-white hover:bg-[#40a9ff]"
                        : "bg-[#f5f5f5] text-[#b8b8b8] cursor-not-allowed"
                    }`}
                  >
                    保存设置，下一步
                  </button>
                </div>
              </div>
            )}

            {/* Module 2: Image Recognition */}
            {fillActiveStep === "ocr" && (
            <div className="border border-[#e8e8e8] rounded-lg">
              <div className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg">
                <div className="flex items-center gap-2">
                  <ScanLine size={15} className="text-[#1890ff]" />
                  <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>作答图像识别</span>
                </div>
              </div>
              <div className="px-5 py-4 space-y-4">
                {/* Recognition Progress & Capabilities */}
                <div className="bg-[#fafafa] rounded-lg p-4 border border-[#f0f0f0]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>识别进度</span>
                        <span className="w-px h-[14px] bg-[#d9d9d9] inline-block" />
                        <span className="text-[12px] text-[#999] shrink-0">已启用：</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f6ffed] border border-[#b7eb8f] text-[#333] text-[11px]"><span className="text-[#52c41a]">&#10003;</span>手写文字</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f6ffed] border border-[#b7eb8f] text-[#333] text-[11px]"><span className="text-[#52c41a]">&#10003;</span>旋转矫正</span>
                      </div>
                      <span className="text-[12px] text-[#999]">
                        {fillOcrProgress.completed + fillOcrProgress.failed}/{fillOcrProgress.total} 已处理
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-[8px] bg-[#f0f0f0] rounded-full overflow-hidden mb-3">
                      <div className="h-full flex">
                        <div
                          className="bg-[#52c41a] transition-all duration-500"
                          style={{ width: `${(fillOcrProgress.completed / fillOcrProgress.total) * 100}%` }}
                        />
                        <div
                          className="bg-[#ff4d4f] transition-all duration-500"
                          style={{ width: `${(fillOcrProgress.failed / fillOcrProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    {/* Stats row */}
                    <div className="flex items-center gap-5 text-[12px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-[8px] h-[8px] rounded-full bg-[#52c41a] inline-block" />
                        <span className="text-[#666]">识别成功</span>
                        <span className="text-[#333]" style={{ fontWeight: 500 }}>{fillOcrProgress.completed}</span>
                        <span className="text-[#999]">({Math.round(fillOcrProgress.completed / fillOcrProgress.total * 100)}%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-[8px] h-[8px] rounded-full bg-[#ff4d4f] inline-block" />
                        <span className="text-[#666]">识别异常</span>
                        <span className="text-[#ff4d4f]" style={{ fontWeight: 500 }}>{fillOcrProgress.failed}</span>
                        <span className="text-[#999]">({Math.round(fillOcrProgress.failed / fillOcrProgress.total * 100)}%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-[8px] h-[8px] rounded-full bg-[#d9d9d9] inline-block" />
                        <span className="text-[#666]">待识别</span>
                        <span className="text-[#333]" style={{ fontWeight: 500 }}>{fillOcrProgress.pending}</span>
                        <span className="text-[#999]">({Math.round(fillOcrProgress.pending / fillOcrProgress.total * 100)}%)</span>
                      </div>
                      <div className="ml-auto flex items-center gap-3">
                        {fillOcrProgress.pending > 0 && fillOcrStarted && !fillOcrPaused && (
                          <span className="text-[#1890ff] flex items-center gap-1">
                            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                            识别中…
                          </span>
                        )}
                        {fillOcrProgress.pending > 0 && (
                          <button
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[12px] border transition-colors ${
                              fillOcrStarted && !fillOcrPaused
                                ? "text-[#faad14] border-[#ffe58f] bg-[#fffbe6] hover:bg-[#fff1b8]" 
                                : "text-[#52c41a] border-[#b7eb8f] bg-[#f6ffed] hover:bg-[#d9f7be]"
                            }`}
                            onClick={() => {
                              if (!fillOcrStarted) {
                                setFillOcrStarted(true);
                              } else {
                                setFillOcrPaused(!fillOcrPaused);
                              }
                            }}
                          >
                            {fillOcrStarted && !fillOcrPaused ? <Pause size={12} /> : <Play size={12} />}
                            {fillOcrStarted && !fillOcrPaused ? "暂停识别" : "开始识别"}
                          </button>
                        )}
                        <button
                          className="flex items-center gap-1 px-2.5 py-1 rounded text-[12px] text-[#1890ff] border border-[#91d5ff] bg-[#e6f7ff] hover:bg-[#bae7ff] transition-colors"
                          onClick={() => {
                            setFillOcrProgress({ total: 400, completed: 0, failed: 0, pending: 400 });
                            setFillOcrStarted(true);
                            setFillOcrPaused(false);
                          }}
                        >
                          <RefreshCw size={12} />
                          重新识别
                        </button>
                      </div>
                    </div>
                  </div>

                {/* Divider */}
                <div className="border-t border-dashed border-[#e8e8e8]" />

                {/* Abnormal handling */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} className="text-[#faad14]" />
                    <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>识别异常处理</span>
                    <span className="text-[12px] text-[#999]">（置信度低时的处理方式）</span>
                  </div>
                  <div className="flex gap-4">
                    <label
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border cursor-pointer transition-all flex-1 ${
                        fillAbnormalMode === "auto" ? "border-[#1890ff] bg-[#e6f7ff]" : "border-[#e8e8e8] hover:border-[#91d5ff]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="fill-abnormal"
                        checked={fillAbnormalMode === "auto"}
                        onChange={() => setFillAbnormalMode("auto")}
                        className="accent-[#1890ff]"
                      />
                      <div>
                        <div className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>自动转人工</div>
                        <div className="text-[12px] text-[#999]">异常试卷自动分配给教师人工批阅</div>
                      </div>
                    </label>
                    <label
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border cursor-pointer transition-all flex-1 ${
                        fillAbnormalMode === "manual" ? "border-[#1890ff] bg-[#e6f7ff]" : "border-[#e8e8e8] hover:border-[#91d5ff]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="fill-abnormal"
                        checked={fillAbnormalMode === "manual"}
                        onChange={() => setFillAbnormalMode("manual")}
                        className="accent-[#1890ff]"
                      />
                      <div>
                        <div className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>暂存待处理</div>
                        <div className="text-[12px] text-[#999]">异常试卷放入待处理队列，由管理员统一分配</div>
                      </div>
                    </label>
                    {fillAbnormalMode === "manual" && fillOcrProgress.failed > 0 && (
                      <button className="ml-2 shrink-0 self-center px-3 py-1.5 rounded text-[12px] bg-[#fff7e6] border border-[#ffd591] text-[#fa8c16] hover:bg-[#fff1b8] transition-colors flex items-center gap-1">
                        <AlertTriangle size={12} />
                        去处理 ({fillOcrProgress.failed})
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-center pt-4 pb-4 border-t border-[#e8e8e8] mt-auto">
                <button
                  onClick={() => {
                    setFillCompletedSteps(prev => new Set(prev).add("ocr"));
                    setFillActiveStep("answer");
                  }}
                  className="px-8 py-2 rounded text-[14px] transition-colors bg-[#1890ff] text-white hover:bg-[#40a9ff]"
                >
                  保存设置，下一步
                </button>
              </div>
            </div>
            )}

            {/* Module 3: Answer Setting */}
            {fillActiveStep === "answer" && (
            <div className="border border-[#e8e8e8] rounded-lg">
              <div className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg">
                <div className="flex items-center gap-2">
                  <CheckSquare size={15} className="text-[#1890ff]" />
                  <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>设置答案</span>
                  <span className="text-[12px] text-[#999]">
                    {fillAnswerMode === "recognized"
                      ? "（基于识别结果赋分）"
                      : "（支持多答案，用\"|\"隔开）"}
                  </span>
                </div>
              </div>
              <div className="p-4">
              {currentTabSubCount > 0 ? (
                <>
                {/* Mode toggle */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center bg-[#f5f5f5] rounded p-0.5">
                    <button
                      onClick={() => setFillAnswerMode("recognized")}
                      className={`px-3 py-1 rounded text-[12px] transition-colors ${
                        fillAnswerMode === "recognized"
                          ? "bg-white text-[#1890ff] shadow-sm border border-[#e8e8e8]"
                          : "text-[#666] hover:text-[#333]"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Eye size={12} />
                        识别结果赋分
                      </span>
                    </button>
                    <button
                      onClick={() => setFillAnswerMode("manual")}
                      className={`px-3 py-1 rounded text-[12px] transition-colors ${
                        fillAnswerMode === "manual"
                          ? "bg-white text-[#1890ff] shadow-sm border border-[#e8e8e8]"
                          : "text-[#666] hover:text-[#333]"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Pencil size={12} />
                        手动设置
                      </span>
                    </button>
                  </div>
                  {fillAnswerMode === "recognized" && (
                    <span className="text-[11px] text-[#999]">
                      基于作答图像识别结果，共识别 400 份试卷
                    </span>
                  )}
                </div>

                {fillAnswerMode === "manual" ? (
                  /* Original manual answer table */
                  <div className="border border-[#e8e8e8] rounded-lg overflow-hidden">
                    <div
                      className="grid bg-[#fafafa] text-[13px] text-[#666] border-b border-[#e8e8e8]"
                      style={{ gridTemplateColumns: "140px 90px 1fr 80px" }}
                    >
                      <div className="px-4 py-2.5 text-left">题目</div>
                      <div className="px-4 py-2.5 text-left">区域</div>
                      <div className="px-4 py-2.5 text-left">答案</div>
                      <div className="px-4 py-2.5 text-left">分值</div>
                    </div>
                    <div className="max-h-[280px] overflow-y-auto">
                      {questionRegions
                        .filter((qr) => currentTabQuestions.includes(qr.questionId))
                        .sort(
                          (a, b) =>
                            allQuestions.findIndex((q) => q.id === a.questionId) -
                            allQuestions.findIndex((q) => q.id === b.questionId)
                        )
                        .map((qr) => {
                          const qInfo = allQuestions.find((q) => q.id === qr.questionId);
                          if (!qInfo) return null;
                          const answerRegions = qr.subRegions.filter((sr) => sr.type !== "排除");
                          return answerRegions.map((sr, idx) => (
                            <div
                              key={sr.id}
                              className="grid text-[13px] border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fafafa]"
                              style={{ gridTemplateColumns: "140px 90px 1fr 80px" }}
                            >
                              <div className="px-4 py-2.5 text-[#333] flex items-center">
                                {idx === 0 && (
                                  <span className="text-[12px] text-[#333]">{qInfo.label}</span>
                                )}
                              </div>
                              <div className="px-4 py-2.5 text-[#666] flex items-center">
                                {sr.label}
                              </div>
                              <div className="px-4 py-2 flex items-center">
                                <input
                                  type="text"
                                  placeholder="请输入答案，多个答案用 | 分隔"
                                  value={answers[sr.id] || ""}
                                  onChange={(e) =>
                                    setAnswers((prev) => ({ ...prev, [sr.id]: e.target.value }))
                                  }
                                  className="w-full border border-[#d9d9d9] rounded px-3 py-1.5 text-[13px] outline-none focus:border-[#1890ff] transition-colors bg-white"
                                />
                              </div>
                              <div className="px-4 py-2 flex items-center">
                                <input
                                  type="text"
                                  placeholder="分值"
                                  value={scores[sr.id] || ""}
                                  onChange={(e) =>
                                    setScores((prev) => ({ ...prev, [sr.id]: e.target.value }))
                                  }
                                  className="w-full border border-[#d9d9d9] rounded px-2 py-1.5 text-[13px] text-center outline-none focus:border-[#1890ff] transition-colors bg-white"
                                />
                              </div>
                            </div>
                          ));
                        })}
                    </div>
                  </div>
                ) : (
                  /* Recognized answer statistics mode */
                  <div className="space-y-0">
                    {/* Per-region recognized answer rows */}
                    <div className="border border-[#e8e8e8] rounded-lg overflow-hidden">
                      {/* Header */}
                      <div
                        className="grid bg-[#fafafa] text-[12px] text-[#666] border-b border-[#e8e8e8]"
                        style={{ gridTemplateColumns: "90px 56px 150px 1fr 28px" }}
                      >
                        <div className="px-3 py-2.5">题目</div>
                        <div className="px-2 py-2.5">区域</div>
                        <div className="px-2 py-2.5">答案分布</div>
                        <div className="px-2 py-2.5">正确答案</div>
                        <div className="px-2 py-2.5"></div>
                      </div>
                      <div className="max-h-[420px] overflow-y-auto">
                        {questionRegions
                          .filter((qr) => currentTabQuestions.includes(qr.questionId))
                          .sort(
                            (a, b) =>
                              allQuestions.findIndex((q) => q.id === a.questionId) -
                              allQuestions.findIndex((q) => q.id === b.questionId)
                          )
                          .map((qr) => {
                            const qInfo = allQuestions.find((q) => q.id === qr.questionId);
                            if (!qInfo) return null;
                            const answerRegions = qr.subRegions.filter((sr) => sr.type !== "排除");
                            return answerRegions.map((sr, idx) => {
                              const stats = mockRecognizedAnswers[sr.id] || [];
                              const correctAns = fillCorrectAnswers[sr.id] || (stats.find((s) => s.isCorrect)?.answer ?? "");
                              const isExpanded = expandedRegionStats === sr.id;
                              const regionPerAnswerScores = perAnswerScores[sr.id] || {};
                              const selectableAnswers = stats.filter((s) => s.answer !== "空白").map((s) => s.answer);
                              const hasLongAnswers = selectableAnswers.some((a) => a.length > 2);
                              return (
                                <div key={sr.id} className="border-b border-[#f0f0f0] last:border-b-0">
                                  {/* Main row */}
                                  <div
                                    className="grid text-[12px] hover:bg-[#fafafa] transition-colors cursor-pointer items-center"
                                    style={{ gridTemplateColumns: "90px 56px 150px 1fr 28px" }}
                                    onClick={() => setExpandedRegionStats(isExpanded ? null : sr.id)}
                                  >
                                    <div className="px-3 py-2.5 text-[#333] flex items-center">
                                      {idx === 0 && <span className="text-[12px] text-[#333]">{qInfo.label}</span>}
                                    </div>
                                    <div className="px-2 py-2.5 text-[#666] flex items-center">{sr.label}</div>
                                    {/* Distribution bar - compact */}
                                    <div className="px-2 py-2 flex items-center">
                                      <div className="flex h-[14px] rounded overflow-hidden bg-[#f0f0f0]" style={{ width: 120, minWidth: 120 }}>
                                        {stats.map((s, si) => (
                                          <div
                                            key={s.answer}
                                            className="h-full relative"
                                            style={{
                                              width: `${s.pct}%`,
                                              backgroundColor: getAnswerColor(s.answer, si),
                                              opacity: s.answer === "空白" ? 0.4 : 0.85,
                                            }}
                                            title={`${s.answer}: ${s.count}人 (${s.pct}%)`}
                                          >
                                            {!hasLongAnswers && s.pct >= 18 && (
                                              <span className="absolute inset-0 flex items-center justify-center text-white text-[8px]" style={{ fontWeight: 600 }}>
                                                {s.answer}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    {/* Correct answer - flexible width for long text */}
                                    <div className="px-2 py-1.5 flex items-center gap-2 min-w-0">
                                      {hasLongAnswers ? (
                                        correctAns ? (
                                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-[#f6ffed] text-[#52c41a] border border-[#b7eb8f] shrink-0">
                                              <Check size={9} />
                                            </span>
                                            <span
                                              className="text-[12px] text-[#333] truncate min-w-0"
                                              style={{ fontWeight: 500 }}
                                              title={correctAns}
                                            >
                                              {correctAns}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-[11px] text-[#bbb] italic">点击展开设置</span>
                                        )
                                      ) : (
                                        <>
                                          <select
                                            value={correctAns}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setFillCorrectAnswers((prev) => ({ ...prev, [sr.id]: val }));
                                              const fullScore = scores[sr.id] || "1";
                                              const newScores: Record<string, string> = {};
                                              stats.forEach((s) => { newScores[s.answer] = s.answer === val ? fullScore : "0"; });
                                              setPerAnswerScores((prev) => ({ ...prev, [sr.id]: newScores }));
                                            }}
                                            className="w-[48px] border border-[#d9d9d9] rounded px-1 py-0.5 text-[12px] text-center outline-none focus:border-[#1890ff] transition-colors bg-white cursor-pointer shrink-0"
                                            style={{ color: getAnswerColor(correctAns, 0), fontWeight: 600 }}
                                          >
                                            <option value="">--</option>
                                            {selectableAnswers.map((a) => (
                                              <option key={a} value={a}>{a}</option>
                                            ))}
                                          </select>
                                          {correctAns ? (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[#f6ffed] text-[#52c41a] border border-[#b7eb8f] shrink-0">
                                              <Check size={9} />
                                              正确
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-[#bbb] shrink-0">未设置</span>
                                          )}
                                        </>
                                      )}
                                    </div>
                                    <div className="px-1 py-2.5 flex items-center justify-center">
                                      {isExpanded ? (
                                        <ChevronDown size={13} className="text-[#999]" />
                                      ) : (
                                        <ChevronRight size={13} className="text-[#999]" />
                                      )}
                                    </div>
                                  </div>

                                  {/* Expanded: per-answer score setting */}
                                  {isExpanded && (
                                    <div className="bg-[#fafcff] px-4 py-3 border-t border-dashed border-[#e8e8e8]">
                                      <div className="flex items-center gap-2 mb-2.5">
                                        <span className="text-[11px] text-[#666]" style={{ fontWeight: 500 }}>按答案赋分</span>
                                        <span className="text-[10px] text-[#bbb]">为每种识别到的答案设置对应分数</span>
                                      </div>
                                      <div className="grid gap-1.5">
                                        {stats.map((s, si) => {
                                          const isCorrectAnswer = s.answer === correctAns;
                                          const scoreVal = regionPerAnswerScores[s.answer] ?? (isCorrectAnswer ? (scores[sr.id] || "1") : "0");
                                          const ansColor = getAnswerColor(s.answer, si);
                                          return (
                                            <div key={s.answer} className={`flex items-center gap-3 group/row rounded px-2.5 py-1.5 -mx-2 ${isCorrectAnswer ? "bg-[#f6ffed]/60" : ""}`}>
                                              {/* Answer color dot */}
                                              <div
                                                className="w-[7px] h-[7px] rounded-full shrink-0"
                                                style={{ backgroundColor: ansColor }}
                                              />
                                              {/* Answer text - flexible for long text */}
                                              <div className="min-w-0 shrink" style={{ flex: hasLongAnswers ? "1 1 0%" : "0 0 36px" }}>
                                                <span
                                                  className="text-[12px] text-[#333] block truncate"
                                                  style={{ fontWeight: 500 }}
                                                  title={s.answer}
                                                >
                                                  {s.answer}
                                                </span>
                                              </div>
                                              {/* Count and percentage */}
                                              <div className="flex items-center gap-1 w-[85px] shrink-0">
                                                <span className="text-[11px] text-[#666]">{s.count}人</span>
                                                <span className="text-[11px] text-[#bbb]">({s.pct}%)</span>
                                              </div>
                                              {/* Mini progress */}
                                              <div className="w-[60px] shrink-0">
                                                <div className="w-full h-[5px] rounded-full bg-[#f0f0f0] overflow-hidden">
                                                  <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                      width: `${s.pct}%`,
                                                      backgroundColor: ansColor,
                                                      opacity: s.answer === "空白" ? 0.5 : 1,
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                              {/* Score input */}
                                              <div className="flex items-center gap-1 shrink-0">
                                                <span className="text-[10px] text-[#999]">得分</span>
                                                <input
                                                  type="text"
                                                  value={scoreVal}
                                                  onClick={(e) => e.stopPropagation()}
                                                  onChange={(e) => {
                                                    const v = e.target.value;
                                                    setPerAnswerScores((prev) => ({
                                                      ...prev,
                                                      [sr.id]: { ...(prev[sr.id] || {}), [s.answer]: v },
                                                    }));
                                                  }}
                                                  className="w-[42px] border border-[#d9d9d9] rounded px-1 py-0.5 text-[12px] text-center outline-none focus:border-[#1890ff] transition-colors bg-white"
                                                />
                                                <span className="text-[10px] text-[#bbb]">分</span>
                                              </div>
                                              {/* Correct marker / Set as correct */}
                                              {isCorrectAnswer ? (
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[#f6ffed] text-[#52c41a] border border-[#b7eb8f] shrink-0 whitespace-nowrap">
                                                  <Check size={10} />
                                                  正确
                                                </span>
                                              ) : s.answer !== "空白" ? (
                                                <button
                                                  className="text-[10px] text-[#bbb] hover:text-[#1890ff] transition-colors px-1.5 py-0.5 rounded border border-transparent hover:border-[#91d5ff] shrink-0 whitespace-nowrap"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFillCorrectAnswers((prev) => ({ ...prev, [sr.id]: s.answer }));
                                                    const fullScore = scores[sr.id] || "1";
                                                    const newScores: Record<string, string> = {};
                                                    stats.forEach((st) => { newScores[st.answer] = st.answer === s.answer ? fullScore : "0"; });
                                                    setPerAnswerScores((prev) => ({ ...prev, [sr.id]: newScores }));
                                                  }}
                                                >
                                                  设为正确
                                                </button>
                                              ) : null}
                                            </div>
                                          );
                                        })}
                                      </div>
                                      {/* Quick action */}
                                      <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-dashed border-[#e8e8e8]">
                                        <button
                                          className="text-[11px] text-[#1890ff] hover:text-[#40a9ff] transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const fullScore = scores[sr.id] || "1";
                                            const newScores: Record<string, string> = {};
                                            stats.forEach((s) => { newScores[s.answer] = s.answer === correctAns ? fullScore : "0"; });
                                            setPerAnswerScores((prev) => ({ ...prev, [sr.id]: newScores }));
                                          }}
                                        >
                                          一键设为：正确满分/其余0分
                                        </button>
                                        <span className="text-[#e8e8e8]">|</span>
                                        <button
                                          className="text-[11px] text-[#1890ff] hover:text-[#40a9ff] transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const fullScore = parseFloat(scores[sr.id] || "1");
                                            const newScores: Record<string, string> = {};
                                            stats.forEach((s) => {
                                              newScores[s.answer] = s.answer === "空白" ? "0" : s.answer === correctAns ? String(fullScore) : String(Math.round(fullScore * 0.5 * 10) / 10);
                                            });
                                            setPerAnswerScores((prev) => ({ ...prev, [sr.id]: newScores }));
                                          }}
                                        >
                                          一键设为：正确满分/半对半分/空白0分
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })}
                      </div>
                    </div>

                    {/* Bottom summary */}
                    {(() => {
                      const allRegionSrs = questionRegions
                        .filter((qr) => currentTabQuestions.includes(qr.questionId))
                        .flatMap((qr) => qr.subRegions.filter((sr) => sr.type !== "排除"));
                      const allAnswerSet = new Set<string>();
                      allRegionSrs.forEach((sr) => {
                        (mockRecognizedAnswers[sr.id] || []).forEach((s) => {
                          if (s.answer !== "空白") allAnswerSet.add(s.answer);
                        });
                      });
                      const uniqueAnswers = Array.from(allAnswerSet);
                      const isLongTextSummary = uniqueAnswers.some((a) => a.length > 2);
                      return (
                        <div className="mt-3 flex items-center justify-between px-3 py-2 bg-[#fafafa] border border-[#f0f0f0] rounded text-[12px]">
                          <div className="flex items-center gap-4 min-w-0 flex-1 overflow-hidden">
                            <span className="text-[#333] shrink-0" style={{ fontWeight: 500 }}>汇总</span>
                            {isLongTextSummary ? (
                              <span className="text-[11px] text-[#666]">
                                共 {allRegionSrs.length} 个区域，{uniqueAnswers.length} 种不同答案
                              </span>
                            ) : (
                              uniqueAnswers.slice(0, 6).map((ans, ai) => {
                                const total = allRegionSrs.reduce((sum, sr) => {
                                  const found = (mockRecognizedAnswers[sr.id] || []).find((s) => s.answer === ans);
                                  return sum + (found ? found.count : 0);
                                }, 0);
                                return (
                                  <span key={ans} className="flex items-center gap-1 shrink-0">
                                    <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: getAnswerColor(ans, ai) }} />
                                    <span className="text-[#666]">{ans}</span>
                                    <span style={{ color: getAnswerColor(ans, ai), fontWeight: 500 }}>{total}</span>
                                  </span>
                                );
                              })
                            )}
                          </div>
                          <span className="text-[11px] text-[#bbb] shrink-0 ml-2">点击区域行展开详情并设置每种答案的分数</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
                </>
              ) : (
                <div className="px-4 py-8 text-center text-[13px] text-[#999]">
                  请先选择题目并设置识别区域
                </div>
              )}
              </div>
              <div className="flex justify-center pt-4 pb-4 border-t border-[#e8e8e8] mt-auto">
                <button
                  onClick={() => {
                    setFillCompletedSteps(prev => new Set(prev).add("answer"));
                    setFillActiveStep("scoring");
                  }}
                  className="px-8 py-2 rounded text-[14px] transition-colors bg-[#1890ff] text-white hover:bg-[#40a9ff]"
                >
                  保存设置，下一步
                </button>
              </div>
            </div>
            )}

            {/* Module 4: AI Scoring */}
            {fillActiveStep === "scoring" && (
            <div className="border border-[#e8e8e8] rounded-lg">
              <div className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Settings size={15} className="text-[#1890ff]" />
                  <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>AI打分与评分设置</span>
                  <span className="text-[12px] text-[#999]">
                    打分 {Math.round(fillScoringProgress.completed / fillScoringProgress.total * 100)}% · 一致率 {fillConsistencyRate}%
                  </span>
                </div>
              </div>
              <div className="px-5 py-4 space-y-4">
                {!fillScoringStarted ? (
                  <div className="text-center py-6 border border-[#e8e8e8] rounded-lg bg-white">
                    <button
                      onClick={() => setFillScoringStarted(true)}
                      className="inline-flex items-center gap-2 px-8 py-2.5 rounded-lg text-[14px] transition-all bg-[#fa8c16] text-white hover:bg-[#ff9c3a] shadow-md hover:shadow-lg"
                    >
                      <Zap size={16} />
                      开始AI打分
                    </button>
                    <p className="text-[12px] text-[#999] mt-2">点击开始对所有试卷进行自动打分</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Scoring progress */}
                  <div className="px-4 py-3 bg-[#fff7e6] border border-[#ffd591] rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-[#fa8c16]" />
                        <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>打分进度</span>
                      </div>
                      {fillScoringProgress.pending > 0 && fillScoringStarted && (
                        <button
                          onClick={() => setFillScoringPaused(!fillScoringPaused)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[12px] border transition-colors ${
                            !fillScoringPaused
                              ? "text-[#faad14] border-[#ffe58f] bg-[#fffbe6] hover:bg-[#fff1b8]" 
                              : "text-[#52c41a] border-[#b7eb8f] bg-[#f6ffed] hover:bg-[#d9f7be]"
                          }`}
                        >
                          {!fillScoringPaused ? <Pause size={10} /> : <Play size={10} />}
                          {!fillScoringPaused ? "暂停" : "继续"}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-[6px] bg-[#f0f0f0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#fa8c16] rounded-full transition-all duration-500" style={{ width: `${Math.round(fillScoringProgress.completed / fillScoringProgress.total * 100)}%` }} />
                      </div>
                      <span className="text-[13px] text-[#fa8c16]" style={{ fontWeight: 500 }}>{Math.round(fillScoringProgress.completed / fillScoringProgress.total * 100)}%</span>
                    </div>
                    <p className="text-[12px] text-[#999] mt-1.5">已完成 {fillScoringProgress.completed}/{fillScoringProgress.total} 份试卷的AI打分</p>
                  </div>
                  {/* Scoring consistency */}
                  <div className="px-4 py-3 bg-[#e6f7ff] border border-[#91d5ff] rounded-lg">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Monitor size={14} className="text-[#1890ff]" />
                      <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>评分一致率</span>
                    </div>
                    <div className="text-[24px] text-[#1890ff]" style={{ fontWeight: 500 }}>{fillConsistencyRate}%</div>
                    <p className="text-[12px] text-[#999]">AI评分与标准答案匹配的一致程度</p>
                  </div>
                </div>
                )}

                {/* Divider */}
                <div className="border-t border-dashed border-[#e8e8e8]" />

                {/* AI Score Usage Setting */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Settings size={14} className="text-[#1890ff]" />
                      <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>AI阅卷分数使用设置（按题配置）</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#666]">当前配置题目：</span>
                      <select className="text-[12px] border border-[#d9d9d9] rounded px-2 py-1 outline-none focus:border-[#1890ff] bg-white">
                        <option value="all">全部题目</option>
                        {tabQuestionIds["填空题"].map(qId => {
                          const q = allQuestions.find(item => item.id === qId);
                          return <option key={qId} value={qId}>{q?.label || qId}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {/* Option 1: Use machine score */}
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        fillAiScoreMode === "machine"
                          ? "border-[#1890ff] bg-[#e6f7ff]"
                          : "border-[#e8e8e8] hover:border-[#91d5ff] bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="fillAiScoreMode"
                        checked={fillAiScoreMode === "machine"}
                        onChange={() => setFillAiScoreMode("machine")}
                        className="accent-[#1890ff] mt-0.5 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>使用机器分</span>
                          <span className="px-1.5 py-px rounded text-[10px] bg-[#f6ffed] text-[#52c41a] border border-[#b7eb8f]">推荐</span>
                        </div>
                        <p className="text-[12px] text-[#666] leading-[18px]">
                          识别结果与标准答案自动比对，匹配成功直接赋分，无需人工批阅。
                        </p>
                      </div>
                    </label>

                    {/* Sub-option: Review task under machine score */}
                    {fillAiScoreMode === "machine" && (
                      <div className="ml-[26px] -mt-1 border border-[#e6f0ff] bg-[#fafcff] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>抽检生成复核任务</span>
                            <span className="text-[11px] text-[#999]">对机器自动评分的试卷进行抽样复核</span>
                          </div>
                          <button
                            onClick={() => setFillMachineReviewEnabled(!fillMachineReviewEnabled)}
                            className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors ${
                              fillMachineReviewEnabled ? "bg-[#1890ff]" : "bg-[#d9d9d9]"
                            }`}
                          >
                            <span
                              className={`inline-block h-[16px] w-[16px] rounded-full bg-white shadow transition-transform ${
                                fillMachineReviewEnabled ? "translate-x-[18px]" : "translate-x-[2px]"
                              }`}
                            />
                          </button>
                        </div>

                        {fillMachineReviewEnabled && (
                          <div className="space-y-3">
                            {/* Sampling ratio */}
                            <div className="flex items-center gap-3">
                              <span className="text-[12px] text-[#666] w-[70px] shrink-0">抽检比例</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={fillMachineReviewRatio}
                                  onChange={(e) => setFillMachineReviewRatio(e.target.value)}
                                  className="w-[56px] border border-[#d9d9d9] rounded px-2 py-1 text-[12px] text-center outline-none focus:border-[#1890ff] transition-colors bg-white"
                                />
                                <span className="text-[12px] text-[#666]">%</span>
                                <span className="text-[11px] text-[#bbb] ml-1">
                                  （约 {Math.ceil(400 * (parseFloat(fillMachineReviewRatio) || 0) / 100)} 份试卷）
                                </span>
                              </div>
                            </div>

                            {/* Sampling strategy */}
                            <div className="flex items-start gap-3">
                              <span className="text-[12px] text-[#666] w-[70px] shrink-0 pt-1">抽检策略</span>
                              <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="fillReviewStrategy"
                                    checked={fillMachineReviewStrategy === "random"}
                                    onChange={() => setFillMachineReviewStrategy("random")}
                                    className="accent-[#1890ff] flex-shrink-0"
                                  />
                                  <span className="text-[12px] text-[#333]">随机抽检</span>
                                  <span className="text-[11px] text-[#999]">从全部已评试卷中随机抽取</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="fillReviewStrategy"
                                    checked={fillMachineReviewStrategy === "lowConf"}
                                    onChange={() => setFillMachineReviewStrategy("lowConf")}
                                    className="accent-[#1890ff] flex-shrink-0"
                                  />
                                  <span className="text-[12px] text-[#333]">低置信度优先</span>
                                  <span className="text-[11px] text-[#999]">优先抽取识别置信度较低的试卷</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="fillReviewStrategy"
                                    checked={fillMachineReviewStrategy === "borderline"}
                                    onChange={() => setFillMachineReviewStrategy("borderline")}
                                    className="accent-[#1890ff] flex-shrink-0"
                                  />
                                  <span className="text-[12px] text-[#333]">临界分数优先</span>
                                  <span className="text-[11px] text-[#999]">优先抽取得分在及格线附近的试卷</span>
                                </label>
                              </div>
                            </div>

                            {/* Preview info */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-[#fffbe6] border border-[#ffe58f] rounded text-[11px] text-[#d48806]">
                              <AlertTriangle size={13} className="shrink-0" />
                              <span>复核任务将在机器自动评分完成后生成，抽检结果若与机器分差异超过阈值将标记异常。</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Option 2: Machine score in dual review */}
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        fillAiScoreMode === "dual"
                          ? "border-[#1890ff] bg-[#e6f7ff]"
                          : "border-[#e8e8e8] hover:border-[#91d5ff] bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="fillAiScoreMode"
                        checked={fillAiScoreMode === "dual"}
                        onChange={() => setFillAiScoreMode("dual")}
                        className="accent-[#1890ff] mt-0.5 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>机器分参与双评出分</span>
                        </div>
                        <p className="text-[12px] text-[#666] leading-[18px]">
                          机器分与教师人工阅卷分值进行双评，超出阈值进入仲裁。
                        </p>
                      </div>
                    </label>

                    {/* Option 3: Reference only */}
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        fillAiScoreMode === "reference"
                          ? "border-[#1890ff] bg-[#e6f7ff]"
                          : "border-[#e8e8e8] hover:border-[#91d5ff] bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="fillAiScoreMode"
                        checked={fillAiScoreMode === "reference"}
                        onChange={() => setFillAiScoreMode("reference")}
                        className="accent-[#1890ff] mt-0.5 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>不使用机器分</span>
                        </div>
                        <p className="text-[12px] text-[#666] leading-[18px]">
                          全部试卷由教师人工批阅，机器分仅作为复核质检参考。
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-center pt-4 pb-4 border-t border-[#e8e8e8] mt-auto">
                <button
                  onClick={() => {
                    setFillCompletedSteps(prev => new Set(prev).add("scoring"));
                    // Find next tab
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex < tabs.length - 1) {
                      setActiveTab(tabs[currentIndex + 1]);
                    }
                  }}
                  className="px-8 py-2 rounded text-[14px] transition-colors bg-[#1890ff] text-white hover:bg-[#40a9ff]"
                >
                  保存设置，下一步
                </button>
              </div>
            </div>
            )}
            </div>
          </div>
        </div>
        ) : (
          <SubjectiveTab
            key={activeTab}
            isLastTab={tabs.indexOf(activeTab) === tabs.length - 1}
            questionType={activeTab as "简答/论述题" | "计算/解答题" | "作文题"}
            selectedQuestions={selectedQuestions}
            questionRegions={questionRegions}
            onSelectedQuestionsChange={setSelectedQuestions}
            onQuestionRegionsChange={setQuestionRegions}
            allQuestions={allQuestions}
            autoRegions={autoRegions}
            questionOwnership={questionOwnership}
            onQuestionOwnershipChange={setQuestionOwnership}
            questionSelector={questionSelector}
            statusDisplay={statusDisplay}
            onNextTab={() => {
              const currentIndex = tabs.indexOf(activeTab);
              if (currentIndex < tabs.length - 1) {
                setActiveTab(tabs[currentIndex + 1]);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}