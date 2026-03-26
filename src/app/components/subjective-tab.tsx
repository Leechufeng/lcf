import { useState, useRef, useMemo, useEffect } from "react";
import {
  ListChecks,
  LayoutGrid,
  ScanLine,
  Eye,
  AlertTriangle,
  MessageSquareText,
  Users,
  Brain,
  ClipboardCheck,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Plus,
  FileText,
  Image as ImageIcon,
  X,
  BarChart3,
  Check,
  AlertCircle,
  Maximize2,
  Settings,
  Zap,
  Monitor,
  Filter,
  RefreshCw,
  Sparkles,
  BookOpen,
  Play,
  Pause,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart, Cell, ReferenceLine } from "recharts";
import {
  RegionEditor,
  type RegionQuestion,
  type SubRegion,
} from "./region-editor";

type QuestionType = "简答/论述题" | "计算/解答题" | "作文题";

interface QuestionRegion {
  questionId: string;
  subRegions: SubRegion[];
}

interface SubjectiveTabProps {
  questionType: QuestionType;
  selectedQuestions: string[];
  questionRegions: QuestionRegion[];
  onSelectedQuestionsChange: (ids: string[]) => void;
  onQuestionRegionsChange: (regions: QuestionRegion[]) => void;
  allQuestions: { id: string; label: string }[];
  autoRegions: Record<string, SubRegion[]>;
  questionOwnership: Record<string, string>;
  onQuestionOwnershipChange: (ownership: Record<string, string>) => void;
  questionSelector: React.ReactNode;
  statusDisplay: React.ReactNode;
  onNextTab?: () => void;
  isLastTab?: boolean;
}

// ─── Region editor config per question type ─────────────────────────
const tabQuestionIds: Record<QuestionType, string[]> = {
  "简答/论述题": ["short-31", "essay-32"],
  "计算/解答题": ["calc-33a", "calc-33b"],
  作文题: ["writing-34"],
};

const REGION_COLORS: Record<string, string> = {
  "short-31": "#f5222d",
  "essay-32": "#722ed1",
  "calc-33a": "#13c2c2",
  "calc-33b": "#2f54eb",
  "writing-34": "#eb2f96",
};

const regionQuestions: Record<QuestionType, RegionQuestion[]> = {
  "简答/论述题": [
    { id: "short-31", label: "简答题31", color: "#f5222d" },
    { id: "essay-32", label: "论述题32", color: "#722ed1" },
  ],
  "计算/解答题": [
    { id: "calc-33a", label: "计算题33(1)", color: "#13c2c2" },
    { id: "calc-33b", label: "计算题33(2)", color: "#2f54eb" },
  ],
  作文题: [
    { id: "writing-34", label: "作文题34", color: "#eb2f96" },
  ],
};

const regionAutoRegions: Record<QuestionType, Record<string, SubRegion[]>> = {
  "简答/论述题": {
    "short-31": [
      { id: "s31-1", label: "作答区域", x: 32, y: 20, w: 530, h: 120 },
    ],
    "essay-32": [
      { id: "s32-1", label: "作答区域", x: 32, y: 20, w: 530, h: 120 },
    ],
  },
  "计算/解答题": {
    "calc-33a": [
      { id: "c33a-1", label: "解题区域", x: 32, y: 20, w: 530, h: 100 },
      { id: "c33a-ex", label: "草稿区域", x: 32, y: 134, w: 250, h: 60, type: "排除" },
    ],
    "calc-33b": [
      { id: "c33b-1", label: "解题区域", x: 32, y: 20, w: 530, h: 120 },
    ],
  },
  作文题: {
    "writing-34": [
      { id: "w34-1", label: "作文正文区域", x: 32, y: 40, w: 530, h: 260 },
      { id: "w34-ex", label: "标题区域", x: 32, y: 8, w: 530, h: 26, type: "排除" },
    ],
  },
};

// ─── Phase config per question type ─────────────────────────────────
const phaseDescriptions: Record<QuestionType, { recognition: string; grading: string; review: string }> = {
  "简答/论述题": {
    recognition: "识别学生手写的简答内容，支持排除无关区域，确保文字提取准确",
    grading: "AI根据评卷标准和教师定标集学习打分规则，自动对简答/论述题进行评阅",
    review: "生成复核任务，教师对AI评阅结果进行抽检和纠偏",
  },
  "计算/解答题": {
    recognition: "识别学生手写的计算步骤和结果，支持排除草稿区域",
    grading: "AI根据评卷标准和教师定标集学习步骤分打分规则，自动对计算过程评阅",
    review: "生成复核任务，教师对AI评阅的计算/解答题结果进行抽检和纠偏",
  },
  作文题: {
    recognition: "识别学生手写作文内容，支持排除标题区域和草稿区域",
    grading: "AI根据评卷标准从内容、结构、语言等多维度学习打分规则，自动评阅作文",
    review: "生成复核任务，教师对AI评阅的作文分数和评语进行抽检和纠偏",
  },
};

// ─── Default prompts per question type ────────────────────────────────
const defaultPrompts: Record<QuestionType, string> = {
  "简答/论述题": "请根据标准答案要点进行评分。要点齐全给满分，缺少要点按比例扣分。表述合理但与标准答案不同的，酌情给分。",
  "计算/解答题": "请按步骤给分。解题思路正确但计算错误的，给过程分。最终结果正确但缺少必要步骤的，适当扣分。",
  作文题: "请从内容主题、篇章结构、语言表达、书写卷面四个维度综合评分。重点关注是否切题、表达是否流畅、结构是否完整。",
};

// ─── Calibration sample data ─────────────────────────────────────────
interface CalibrationSample {
  id: string;
  studentId: string;
  status: "待评阅" | "已评阅" | "AI已学习";
  teacherScore: number | null;
  aiScore: number | null;
  scoreBand: string;
  answerType: string;
}

const mockCalibrationSamples: CalibrationSample[] = [
  { id: "c1", studentId: "2024001", status: "AI已学习", teacherScore: 6, aiScore: 6, scoreBand: "6", answerType: "A" },
  { id: "c2", studentId: "2024002", status: "AI已学习", teacherScore: 5.5, aiScore: 5.5, scoreBand: "5.5", answerType: "A" },
  { id: "c3", studentId: "2024003", status: "已评阅", teacherScore: 5, aiScore: 5, scoreBand: "5", answerType: "B" },
  { id: "c4", studentId: "2024004", status: "已评阅", teacherScore: 5, aiScore: 4.5, scoreBand: "5", answerType: "A" },
  { id: "c5", studentId: "2024005", status: "AI已学习", teacherScore: 4.5, aiScore: 4.5, scoreBand: "4.5", answerType: "C" },
  { id: "c6", studentId: "2024006", status: "AI已学习", teacherScore: 4, aiScore: 4, scoreBand: "4", answerType: "B" },
  { id: "c7", studentId: "2024007", status: "已评阅", teacherScore: 4, aiScore: 3.5, scoreBand: "4", answerType: "A" },
  { id: "c8", studentId: "2024008", status: "AI已学习", teacherScore: 3.5, aiScore: 3.5, scoreBand: "3.5", answerType: "D" },
  { id: "c9", studentId: "2024009", status: "已评阅", teacherScore: 3, aiScore: 3, scoreBand: "3", answerType: "B" },
  { id: "c10", studentId: "2024010", status: "待评阅", teacherScore: null, aiScore: null, scoreBand: "3", answerType: "C" },
  { id: "c11", studentId: "2024011", status: "AI已学习", teacherScore: 2.5, aiScore: 2.5, scoreBand: "2.5", answerType: "A" },
  { id: "c12", studentId: "2024012", status: "待评阅", teacherScore: null, aiScore: null, scoreBand: "2", answerType: "E" },
  { id: "c13", studentId: "2024013", status: "AI已学习", teacherScore: 2, aiScore: 2, scoreBand: "2", answerType: "B" },
  { id: "c14", studentId: "2024014", status: "已评阅", teacherScore: 1.5, aiScore: 1.5, scoreBand: "1.5", answerType: "C" },
  { id: "c15", studentId: "2024015", status: "待评阅", teacherScore: null, aiScore: null, scoreBand: "1", answerType: "D" },
  { id: "c16", studentId: "2024016", status: "AI已学习", teacherScore: 1, aiScore: 1, scoreBand: "1", answerType: "A" },
  { id: "c17", studentId: "2024017", status: "AI已学习", teacherScore: 0.5, aiScore: 0.5, scoreBand: "0.5", answerType: "E" },
  { id: "c18", studentId: "2024018", status: "待评阅", teacherScore: null, aiScore: null, scoreBand: "0", answerType: "B" },
  { id: "c19", studentId: "2024019", status: "AI已学习", teacherScore: 0, aiScore: 0, scoreBand: "0", answerType: "C" },
  { id: "c20", studentId: "2024020", status: "已评阅", teacherScore: 3, aiScore: 2.5, scoreBand: "3", answerType: "A" },
];

// ─── Answer type descriptions ─────────────────────────────────────────
const answerTypeDescriptions: Record<string, string> = {
  A: "要点完整、表述规范",
  B: "要点基本完整、部分表述不规范",
  C: "要点不完整、有部分正确内容",
  D: "答题方向正确但要点缺失较多",
  E: "答非所问或空白卷",
};

const answerTypeColors: Record<string, string> = {
  A: "#52c41a",
  B: "#1890ff",
  C: "#fa8c16",
  D: "#722ed1",
  E: "#ff4d4f",
};

// ─── Answer band summary ─────────────────────────────────────────────
interface AnswerBand {
  type: string;
  description: string;
  totalCount: number;
  aiCount: number;
  teacherCount: number;
  learnedCount: number;
  unlearnedCount: number;
  avgScore: number | null;
  status: "已学习" | "学习中" | "未学习";
}

function computeAnswerBands(samples: CalibrationSample[]): AnswerBand[] {
  const typeSet = new Set(samples.map((s) => s.answerType));
  const types = Array.from(typeSet).sort();
  return types.map((type) => {
    const inBand = samples.filter((s) => s.answerType === type);
    const aiCount = inBand.filter((s) => s.aiScore !== null).length;
    const teacherCount = inBand.filter((s) => s.teacherScore !== null).length;
    const learnedCount = inBand.filter((s) => s.status === "AI已学习").length;
    const unlearnedCount = inBand.length - learnedCount;
    const scoredSamples = inBand.filter((s) => s.teacherScore !== null);
    const avgScore = scoredSamples.length > 0
      ? +(scoredSamples.reduce((sum, s) => sum + (s.teacherScore ?? 0), 0) / scoredSamples.length).toFixed(1)
      : null;
    const status: AnswerBand["status"] =
      learnedCount === 0 ? "未学习" : unlearnedCount === 0 ? "已学习" : "学习中";
    return {
      type,
      description: answerTypeDescriptions[type] || "其他答案类型",
      totalCount: inBand.length,
      aiCount,
      teacherCount,
      learnedCount,
      unlearnedCount,
      avgScore,
      status,
    };
  });
}

// ─── Score band summary ──────────────────────────────────────────────
interface ScoreBand {
  range: string;
  aiCount: number;
  teacherCount: number;
  learnedCount: number;
  unlearnedCount: number;
  status: "已学习" | "学习中" | "未学习";
}

function computeScoreBands(samples: CalibrationSample[], fullScore: number = 6, step: number = 0.5): ScoreBand[] {
  const bands: string[] = [];
  for (let s = 0; s <= fullScore; s = +(s + step).toFixed(1)) {
    bands.push(String(s));
  }
  return bands.map((range) => {
    const inBand = samples.filter((s) => s.scoreBand === range);
    const aiCount = inBand.filter((s) => s.aiScore !== null).length;
    const teacherCount = inBand.filter((s) => s.teacherScore !== null).length;
    const learnedCount = inBand.filter((s) => s.status === "AI已学习").length;
    const unlearnedCount = inBand.length - learnedCount;
    const status: ScoreBand["status"] =
      learnedCount === 0 ? "未学习" : unlearnedCount === 0 ? "已学习" : "学习中";
    return { range, aiCount, teacherCount, learnedCount, unlearnedCount, status };
  });
}

// ─── Review task data ─────────────────────────────────────────────────
interface ReviewTask {
  id: string;
  name: string;
  count: number;
  assignee: string;
  status: "未开始" | "进行中" | "已完成";
  diffRange?: string;
}

const mockSamplingTasks: ReviewTask[] = [
  { id: "rv1", name: "抽检复核批次1", count: 24, assignee: "王老师", status: "进行中" },
  { id: "rv2", name: "抽检复核批次2", count: 18, assignee: "李老师", status: "未开始" },
];

const mockComparisonTasks: ReviewTask[] = [
  { id: "cmp1", name: "分差≥2分复核", diffRange: "2~3分", count: 16, assignee: "王老师", status: "进行中" },
  { id: "cmp2", name: "分差≥3分复核", diffRange: "3~4分", count: 8, assignee: "李老师", status: "未开始" },
  { id: "cmp3", name: "分差≥4分复核", diffRange: "≥4分", count: 4, assignee: "未分配", status: "未开始" },
];

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
  icon: React.ElementType;
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

// ─── Score Band Dual Table Component ───────────────────────────────
function ScoreBandDualTable({
  scoreBands,
  samples,
  onViewDetail,
}: {
  scoreBands: ScoreBand[];
  samples: CalibrationSample[];
  onViewDetail: (band: string | null) => void;
}) {
  const half = Math.ceil(scoreBands.length / 2);
  const leftBands = scoreBands.slice(0, half);
  const rightBands = scoreBands.slice(half);
  const colTpl = "68px 40px 40px 44px 44px 54px 44px";

  const renderTable = (bands: ScoreBand[]) => (
    <div className="flex-1 min-w-0 border border-[#f0f0f0] rounded overflow-hidden">
      <div
        className="grid bg-[#fafafa] text-[11px] text-[#888] border-b border-[#f0f0f0]"
        style={{ gridTemplateColumns: colTpl }}
      >
        <div className="px-2 py-2 whitespace-nowrap">分数段</div>
        <div className="px-1 py-2 text-center whitespace-nowrap">AI</div>
        <div className="px-1 py-2 text-center whitespace-nowrap">教师</div>
        <div className="px-1 py-2 text-center whitespace-nowrap">已学习</div>
        <div className="px-1 py-2 text-center whitespace-nowrap">未学习</div>
        <div className="px-1 py-2 text-center whitespace-nowrap">状态</div>
        <div className="px-1 py-2 text-center whitespace-nowrap">��作</div>
      </div>
      {bands.map((band) => {
        const total = samples.filter((s) => s.scoreBand === band.range).length;
        return (
          <div
            key={band.range}
            className="grid text-[12px] border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fafafa] transition-colors"
            style={{ gridTemplateColumns: colTpl }}
          >
            <div className="px-2 py-2.5 text-[#333] whitespace-nowrap">
              <span style={{ fontWeight: 500 }}>{band.range}分</span>
              <span className="text-[10px] text-[#bbb] ml-0.5">({total})</span>
            </div>
            <div className="px-1 py-2.5 text-center text-[#1890ff]" style={{ fontWeight: 500 }}>{band.aiCount}</div>
            <div className="px-1 py-2.5 text-center text-[#722ed1]" style={{ fontWeight: 500 }}>{band.teacherCount}</div>
            <div className="px-1 py-2.5 text-center text-[#52c41a]" style={{ fontWeight: 500 }}>{band.learnedCount}</div>
            <div className="px-1 py-2.5 text-center text-[#fa8c16]" style={{ fontWeight: 500 }}>{band.unlearnedCount}</div>
            <div className="px-1 py-2.5 flex items-center justify-center">
              <span
                className={`px-1.5 py-px rounded text-[10px] whitespace-nowrap ${
                  band.status === "已学习"
                    ? "bg-[#f6ffed] text-[#52c41a] border border-[#b7eb8f]"
                    : band.status === "学习中"
                    ? "bg-[#e6f7ff] text-[#1890ff] border border-[#91d5ff]"
                    : "bg-[#f5f5f5] text-[#999] border border-[#e8e8e8]"
                }`}
              >
                {band.status}
              </span>
            </div>
            <div className="px-1 py-2.5 flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetail(band.range);
                }}
                className="text-[#1890ff] hover:text-[#40a9ff] text-[11px] transition-colors"
              >
                详情
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="flex gap-3">
        {renderTable(leftBands)}
        {renderTable(rightBands)}
      </div>
      {/* Summary bar */}
      <div className="mt-3 flex items-center justify-between px-3 py-2 bg-[#fafafa] border border-[#f0f0f0] rounded text-[12px]">
        <div className="flex items-center gap-4">
          <span className="text-[#333]" style={{ fontWeight: 500 }}>合计</span>
          <span className="text-[#666]">AI <span className="text-[#1890ff]" style={{ fontWeight: 500 }}>{scoreBands.reduce((a, b) => a + b.aiCount, 0)}</span>份</span>
          <span className="text-[#666]">教师 <span className="text-[#722ed1]" style={{ fontWeight: 500 }}>{scoreBands.reduce((a, b) => a + b.teacherCount, 0)}</span>份</span>
          <span className="text-[#666]">已学习 <span className="text-[#52c41a]" style={{ fontWeight: 500 }}>{scoreBands.reduce((a, b) => a + b.learnedCount, 0)}</span>份</span>
          <span className="text-[#666]">未学习 <span className="text-[#fa8c16]" style={{ fontWeight: 500 }}>{scoreBands.reduce((a, b) => a + b.unlearnedCount, 0)}</span>份</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(null);
          }}
          className="text-[#1890ff] hover:text-[#40a9ff] text-[12px] transition-colors"
        >
          查看全部详情
        </button>
      </div>
    </div>
  );
}

// ─── Answer Band Dual Table Component ──────────────────────────────
function AnswerBandDualTable({
  answerBands,
  samples,
  onViewDetail,
}: {
  answerBands: AnswerBand[];
  samples: CalibrationSample[];
  onViewDetail: (answerType: string | null) => void;
}) {
  const half = Math.ceil(answerBands.length / 2);
  const leftBands = answerBands.slice(0, half);
  const rightBands = answerBands.slice(half);
  const colTpl = "52px 1fr 40px 40px 40px 40px 50px 50px 44px";

  const renderTable = (bands: AnswerBand[]) => (
    <div className="flex-1 min-w-0 border border-[#f0f0f0] rounded overflow-hidden">
      <div
        className="grid bg-[#fafafa] text-[11px] text-[#888] border-b border-[#f0f0f0]"
        style={{ gridTemplateColumns: colTpl }}
      >
        <div className="px-2 py-2 whitespace-nowrap">答案</div>
        <div className="px-1 py-2 whitespace-nowrap">描述</div>
        <div className="px-1 py-2 text-center whitespace-nowrap">数量</div>
        <div className="px-1 py-2 text-center whitespace-nowrap">AI</div>
        <div className="px-1 py-2 text-center whitespace-nowrap">教师</div>
        <div className="px-1 py-2 text-center whitespace-nowrap">已学</div>
        <div className="px-1 py-2 text-center whitespace-nowrap">均分</div>
        <div className="px-1 py-2 text-center whitespace-nowrap">状态</div>
        <div className="px-1 py-2 text-center whitespace-nowrap">操作</div>
      </div>
      {bands.map((band) => (
        <div
          key={band.type}
          className="grid text-[12px] border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fafafa] transition-colors"
          style={{ gridTemplateColumns: colTpl }}
        >
          <div className="px-2 py-2.5 flex items-center gap-1.5">
            <div
              className="w-[8px] h-[8px] rounded-full flex-shrink-0"
              style={{ backgroundColor: answerTypeColors[band.type] || "#999" }}
            />
            <span className="text-[#333]" style={{ fontWeight: 500 }}>{band.type}</span>
          </div>
          <div className="px-1 py-2.5 text-[#999] text-[11px] truncate" title={band.description}>
            {band.description}
          </div>
          <div className="px-1 py-2.5 text-center text-[#333]" style={{ fontWeight: 500 }}>{band.totalCount}</div>
          <div className="px-1 py-2.5 text-center text-[#1890ff]" style={{ fontWeight: 500 }}>{band.aiCount}</div>
          <div className="px-1 py-2.5 text-center text-[#722ed1]" style={{ fontWeight: 500 }}>{band.teacherCount}</div>
          <div className="px-1 py-2.5 text-center text-[#52c41a]" style={{ fontWeight: 500 }}>{band.learnedCount}</div>
          <div className="px-1 py-2.5 text-center text-[#666]">
            {band.avgScore !== null ? band.avgScore : "-"}
          </div>
          <div className="px-1 py-2.5 flex items-center justify-center">
            <span
              className={`px-1.5 py-px rounded text-[10px] whitespace-nowrap ${
                band.status === "已学习"
                  ? "bg-[#f6ffed] text-[#52c41a] border border-[#b7eb8f]"
                  : band.status === "学习中"
                  ? "bg-[#e6f7ff] text-[#1890ff] border border-[#91d5ff]"
                  : "bg-[#f5f5f5] text-[#999] border border-[#e8e8e8]"
              }`}
            >
              {band.status}
            </span>
          </div>
          <div className="px-1 py-2.5 flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetail(band.type);
              }}
              className="text-[#1890ff] hover:text-[#40a9ff] text-[11px] transition-colors"
            >
              详情
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {answerBands.length <= 3 ? (
        <div className="flex gap-3">
          {renderTable(answerBands)}
        </div>
      ) : (
        <div className="flex gap-3">
          {renderTable(leftBands)}
          {renderTable(rightBands)}
        </div>
      )}
      {/* Summary bar */}
      <div className="mt-3 flex items-center justify-between px-3 py-2 bg-[#fafafa] border border-[#f0f0f0] rounded text-[12px]">
        <div className="flex items-center gap-4">
          <span className="text-[#333]" style={{ fontWeight: 500 }}>合计</span>
          <span className="text-[#666]">
            共 <span className="text-[#333]" style={{ fontWeight: 500 }}>{answerBands.reduce((a, b) => a + b.totalCount, 0)}</span> 份
          </span>
          <span className="text-[#666]">
            {answerBands.length} 种答案类型
          </span>
          <span className="text-[#666]">
            已学习 <span className="text-[#52c41a]" style={{ fontWeight: 500 }}>{answerBands.reduce((a, b) => a + b.learnedCount, 0)}</span> 份
          </span>
          <span className="text-[#666]">
            未学习 <span className="text-[#fa8c16]" style={{ fontWeight: 500 }}>{answerBands.reduce((a, b) => a + b.unlearnedCount, 0)}</span> 份
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(null);
          }}
          className="text-[#1890ff] hover:text-[#40a9ff] text-[12px] transition-colors"
        >
          查看全部详情
        </button>
      </div>
    </div>
  );
}

// ─── Main SubjectiveTab Component ──────────────────────────────────
export function SubjectiveTab({ questionType, selectedQuestions, questionRegions, onSelectedQuestionsChange, onQuestionRegionsChange, allQuestions, autoRegions, questionOwnership, onQuestionOwnershipChange, questionSelector, statusDisplay, onNextTab, isLastTab = false }: SubjectiveTabProps) {
  // Grading approach: calibration-based vs direct LLM
  const [gradingMode, setGradingMode] = useState<"calibration" | "directLLM">("calibration");
  const [activePhase, setActivePhase] = useState<"select" | "recognition" | "grading" | "review">("select");
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(new Set());

  // Recognition state
  const [imageRecognitionEnabled, setImageRecognitionEnabled] = useState(true);
  const [abnormalHandlingMode, setAbnormalHandlingMode] = useState<"auto" | "manual">("auto");
  const [ocrProgress, setOcrProgress] = useState({ total: 400, completed: 0, failed: 0, pending: 400 });
  const [ocrStarted, setOcrStarted] = useState(false);

  useEffect(() => {
    if (activePhase === "recognition" && imageRecognitionEnabled && ocrStarted && ocrProgress.pending > 0) {
      const timer = setInterval(() => {
        setOcrProgress(prev => {
          if (prev.pending <= 0) {
            clearInterval(timer);
            setOcrStarted(false);
            return prev;
          }
          const processCount = Math.min(prev.pending, Math.floor(Math.random() * 10) + 10);
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
  }, [activePhase, imageRecognitionEnabled, ocrStarted, ocrProgress.pending]);

  // Grading state
  const [prompt, setPrompt] = useState(defaultPrompts[questionType]);
  const [calibrationMode, setCalibrationMode] = useState<"auto" | "manual">("auto");
  const [calibrationCount, setCalibrationCount] = useState("20");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["prompt", "prescore", "learning", "finalScore"]));
  const [importedFiles, setImportedFiles] = useState<{ id: string; name: string; type: "file" | "image"; size: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [calibrationDetailOpen, setCalibrationDetailOpen] = useState(false);
  const [detailFilterBand, setDetailFilterBand] = useState<string | null>(null);
  const scoreBands = computeScoreBands(mockCalibrationSamples);
  const answerBands = computeAnswerBands(mockCalibrationSamples);
  const [calibrationViewMode, setCalibrationViewMode] = useState<"score" | "answer">("score");
  const [detailFilterAnswer, setDetailFilterAnswer] = useState<string | null>(null);
  const [detailFilterDimension, setDetailFilterDimension] = useState<"score" | "answer">("score");
  const [distributionModalOpen, setDistributionModalOpen] = useState(false);

  // New workflow states for calibration mode
  const [prescoreStarted, setPrescoreStarted] = useState(false);
  const [prescorePaused, setPrescorePaused] = useState(false);
  const [prescoreProgress, setPrescoreProgress] = useState({ total: 400, completed: 0, pending: 400 });
  const [prescoreCompleted, setPrescoreCompleted] = useState(false);
  const [calibrationSelectionStarted, setCalibrationSelectionStarted] = useState(false);
  const [calibrationSelectionPaused, setCalibrationSelectionPaused] = useState(false);
  const [calibrationSelectionProgress, setCalibrationSelectionProgress] = useState({ total: 20, completed: 0, pending: 20 });
  const [calibrationSelected, setCalibrationSelected] = useState(false);
  const [teacherScoringCompleted, setTeacherScoringCompleted] = useState(false);
  const [aiLearningStarted, setAiLearningStarted] = useState(false);
  const [aiLearningCompleted, setAiLearningCompleted] = useState(false);
  const [finalScoringStarted, setFinalScoringStarted] = useState(false);
  const [finalScoringCompleted, setFinalScoringCompleted] = useState(false);

  useEffect(() => {
    if (activePhase === "grading" && gradingMode === "calibration") {
      // Prescore progress
      if (prescoreStarted && !prescorePaused && prescoreProgress.pending > 0) {
        const timer = setInterval(() => {
          setPrescoreProgress(prev => {
            if (prev.pending <= 0) {
              clearInterval(timer);
              if (!prescoreCompleted) setPrescoreCompleted(true);
              return prev;
            }
            const processCount = Math.min(prev.pending, Math.floor(Math.random() * 15) + 5);
            return {
              total: prev.total,
              completed: prev.completed + processCount,
              pending: prev.pending - processCount
            };
          });
        }, 500);
        return () => clearInterval(timer);
      }

      // Calibration Selection progress
      if (calibrationSelectionStarted && !calibrationSelectionPaused && calibrationSelectionProgress.pending > 0) {
        const timer = setInterval(() => {
          setCalibrationSelectionProgress(prev => {
            if (prev.pending <= 0) {
              clearInterval(timer);
              if (!calibrationSelected) setCalibrationSelected(true);
              return prev;
            }
            const processCount = Math.min(prev.pending, Math.floor(Math.random() * 2) + 1);
            return {
              total: prev.total,
              completed: prev.completed + processCount,
              pending: prev.pending - processCount
            };
          });
        }, 800);
        return () => clearInterval(timer);
      }
    }
  }, [activePhase, gradingMode, prescoreStarted, prescorePaused, prescoreProgress.pending, prescoreCompleted, calibrationSelectionStarted, calibrationSelectionPaused, calibrationSelectionProgress.pending, calibrationSelected]);

  // Compute distribution chart data
  const distributionData = useMemo(() => {
    return scoreBands.map((band) => {
      const total = mockCalibrationSamples.filter((s) => s.scoreBand === band.range).length;
      return { score: band.range, count: total, label: `${band.range}分` };
    });
  }, [scoreBands]);

  // Check if prompt is configured (not default and not empty, or has imported files)
  const isPromptConfigured = prompt.trim() !== "" && (prompt !== defaultPrompts[questionType] || importedFiles.length > 0);

  // AI score usage mode
  const [aiScoreMode, setAiScoreMode] = useState<"machine" | "dual" | "reference">("machine");

  // Review state
  const [samplingTasks, setSamplingTasks] = useState<ReviewTask[]>(mockSamplingTasks);
  const [comparisonTasks, setComparisonTasks] = useState<ReviewTask[]>(mockComparisonTasks);
  const [reviewRatio, setReviewRatio] = useState("30");
  const [reviewMode, setReviewMode] = useState<"machineOnly" | "comparison">("machineOnly");
  const [scoreDiffThreshold, setScoreDiffThreshold] = useState("2");
  // Only questions owned by THIS tab
  const ownedQuestions = useMemo(
    () => selectedQuestions.filter((id) => questionOwnership[id] === questionType),
    [selectedQuestions, questionOwnership, questionType]
  );

  const [reviewQuestionIds, setReviewQuestionIds] = useState<Set<string>>(() => new Set(ownedQuestions));

  // Direct LLM grading state
  const [llmQuestionStem, setLlmQuestionStem] = useState("");
  const [llmGradingPrompt, setLlmGradingPrompt] = useState(defaultPrompts[questionType]);
  const [llmImportedFiles, setLlmImportedFiles] = useState<{ id: string; name: string; type: "file" | "image"; size: string }[]>([]);
  const llmFileInputRef = useRef<HTMLInputElement>(null);
  const llmImageInputRef = useRef<HTMLInputElement>(null);
  const [llmScoringStarted, setLlmScoringStarted] = useState(false);
  const [llmScoringPaused, setLlmScoringPaused] = useState(false);
  const [llmScoringProgress, setLlmScoringProgress] = useState({ total: 400, completed: 0, failed: 0, pending: 400 });
  const [llmTokens, setLlmTokens] = useState(0);

  // AI Learning & Scoring state (Calibration mode)
  const [aiLearningPaused, setAiLearningPaused] = useState(false);
  const [aiLearningProgress, setAiLearningProgress] = useState({ total: 8, completed: 0, pending: 8 });
  const [aiScoringStarted, setAiScoringStarted] = useState(false);
  const [aiScoringPaused, setAiScoringPaused] = useState(false);
  const [aiScoringProgress, setAiScoringProgress] = useState({ total: 400, completed: 0, pending: 400 });
  const [aiConsistencyRate, setAiConsistencyRate] = useState(0);

  useEffect(() => {
    if (activePhase === "grading" && gradingMode === "calibration") {
      // Start scoring automatically when learning starts
      if (aiLearningStarted && !aiScoringStarted) {
        setAiScoringStarted(true);
      }

      // Learning progress
      if (aiLearningStarted && !aiLearningPaused && aiLearningProgress.pending > 0) {
        const timer = setInterval(() => {
          setAiLearningProgress(prev => {
            if (prev.pending <= 0) {
              clearInterval(timer);
              return prev;
            }
            return {
              total: prev.total,
              completed: prev.completed + 1,
              pending: prev.pending - 1
            };
          });
        }, 1000);
        return () => clearInterval(timer);
      }
      
      // Scoring progress
      if (aiScoringStarted && !aiScoringPaused && aiScoringProgress.pending > 0) {
        const timer = setInterval(() => {
          setAiScoringProgress(prev => {
            if (prev.pending <= 0) {
              clearInterval(timer);
              return prev;
            }
            const processCount = Math.min(prev.pending, Math.floor(Math.random() * 5) + 5);
            return {
              total: prev.total,
              completed: prev.completed + processCount,
              pending: prev.pending - processCount
            };
          });
          // Randomly fluctuate consistency rate
          setAiConsistencyRate(prev => {
            if (prev === 0) return 90 + Math.random() * 5;
            const change = (Math.random() - 0.5) * 2;
            return Math.min(100, Math.max(85, prev + change));
          });
        }, 800);
        return () => clearInterval(timer);
      }
    }
  }, [activePhase, gradingMode, aiLearningStarted, aiLearningPaused, aiLearningProgress.pending, aiScoringStarted, aiScoringPaused, aiScoringProgress.pending]);

  useEffect(() => {
    if (activePhase === "grading" && gradingMode === "directLLM" && llmScoringStarted && !llmScoringPaused && llmScoringProgress.pending > 0) {
      const timer = setInterval(() => {
        setLlmScoringProgress(prev => {
          if (prev.pending <= 0) {
            clearInterval(timer);
            return prev;
          }
          const processCount = Math.min(prev.pending, Math.floor(Math.random() * 5) + 5);
          const successCount = Math.floor(processCount * 0.95);
          const failCount = processCount - successCount;
          
          setLlmTokens(t => t + processCount * 1250);
          
          return {
            total: prev.total,
            completed: prev.completed + successCount,
            failed: prev.failed + failCount,
            pending: prev.pending - processCount
          };
        });
      }, 800);
      return () => clearInterval(timer);
    }
  }, [activePhase, gradingMode, llmScoringStarted, llmScoringPaused, llmScoringProgress.pending]);
  const [llmAiScoreMode, setLlmAiScoreMode] = useState<"machine" | "dual" | "reference">("machine");

  // Sync reviewQuestionIds when ownedQuestions changes
  useEffect(() => {
    setReviewQuestionIds(new Set(ownedQuestions));
  }, [ownedQuestions]);

  // Set default expanded sections when phase changes
  useEffect(() => {
    setExpandedSections(new Set());
  }, [activePhase]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const descriptions = phaseDescriptions[questionType];

  // Wrap selectedQuestions change to also update ownership
  const handleSelectedQuestionsChange = (nextIds: string[]) => {
    // Find newly added IDs
    const added = nextIds.filter((id) => !selectedQuestions.includes(id));
    // Find removed IDs
    const removed = selectedQuestions.filter((id) => !nextIds.includes(id));

    if (added.length > 0 || removed.length > 0) {
      const nextOwnership = { ...questionOwnership };
      added.forEach((id) => { nextOwnership[id] = questionType; });
      removed.forEach((id) => { delete nextOwnership[id]; });
      onQuestionOwnershipChange(nextOwnership);
    }

    onSelectedQuestionsChange(nextIds);
  };

  const markPhaseComplete = (phase: string) => {
    setCompletedPhases((prev) => new Set(prev).add(phase));
  };

  const generateReviewTask = () => {
    if (reviewMode === "machineOnly") {
      const newTask: ReviewTask = {
        id: `rv-${Date.now()}`,
        name: `抽检复核批次${samplingTasks.length + 1}`,
        count: Math.max(1, Math.round(400 * (parseInt(reviewRatio) || 0) / 100 / 3)),
        assignee: "未分配",
        status: "未开始",
      };
      setSamplingTasks((prev) => [...prev, newTask]);
    } else {
      const threshold = parseInt(scoreDiffThreshold) || 2;
      const newTask: ReviewTask = {
        id: `cmp-${Date.now()}`,
        name: `分差≥${threshold}分复核`,
        diffRange: `≥${threshold}分`,
        count: threshold === 1 ? 52 : threshold === 2 ? 28 : threshold === 3 ? 12 : 8,
        assignee: "未分配",
        status: "未开始",
      };
      setComparisonTasks((prev) => [...prev, newTask]);
    }
  };

  const llmPhaseDescriptions: Record<string, string> = {
    recognition: descriptions.recognition,
    grading: "AI直接使用大模型能力，根据题干和评卷标准提示词对试卷进行裸批评阅，无需定标集学习",
    review: "生成复核任务，教师对AI裸批结果进行抽检和纠偏",
  };

  return (
    <div>
      {/* Grading Mode Toggle */}
      <div className="flex items-center gap-3 mb-5 p-3 bg-[#fafafa] border border-[#e8e8e8] rounded-lg">
        <span className="text-[13px] text-[#666]" style={{ fontWeight: 500 }}>评阅模式：</span>
        <div className="flex items-center bg-white rounded-lg border border-[#e8e8e8] p-0.5">
          <button
            onClick={() => {
              setGradingMode("calibration");
              setActivePhase("recognition");
              setCompletedPhases(new Set());
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] transition-all ${
              gradingMode === "calibration"
                ? "bg-[#1890ff] text-white shadow-sm"
                : "text-[#666] hover:text-[#333] hover:bg-[#f5f5f5]"
            }`}
          >
            <Brain size={14} />
            定标集学习模式
          </button>
          <button
            onClick={() => {
              setGradingMode("directLLM");
              setActivePhase("recognition");
              setCompletedPhases(new Set());
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] transition-all ${
              gradingMode === "directLLM"
                ? "bg-[#722ed1] text-white shadow-sm"
                : "text-[#666] hover:text-[#333] hover:bg-[#f5f5f5]"
            }`}
          >
            <Sparkles size={14} />
            大模型裸批模式
          </button>
        </div>
        <span className="text-[11px] text-[#bbb] ml-2">
          {gradingMode === "calibration"
            ? "AI通过教师定标集学习打分规则后进行评阅"
            : "AI直接使用大模型能力进行评阅，无需定标集学习流程"}
        </span>
      </div>

      <div className="flex gap-6">
        {/* Left Sidebar: Phase Navigation */}
        <div className="w-[240px] flex-shrink-0 space-y-3">
          <PhaseStep
            number={1}
            icon={ListChecks}
            title="选择题目"
            description="选择需要进行AI阅卷的题目"
            isActive={activePhase === "select"}
            isCompleted={selectedQuestions.length > 0 && activePhase !== "select"}
            onClick={() => setActivePhase("select")}
          />
          <PhaseStep
            number={2}
            icon={ScanLine}
            title="识别"
            description={gradingMode === "directLLM" ? llmPhaseDescriptions.recognition : descriptions.recognition}
            isActive={activePhase === "recognition"}
            isCompleted={completedPhases.has("recognition")}
            onClick={() => setActivePhase("recognition")}
          />
          <PhaseStep
            number={3}
            icon={gradingMode === "directLLM" ? Sparkles : Brain}
            title={gradingMode === "directLLM" ? "裸批" : "AI阅卷"}
            description={gradingMode === "directLLM" ? llmPhaseDescriptions.grading : descriptions.grading}
            isActive={activePhase === "grading"}
            isCompleted={completedPhases.has("grading")}
            onClick={() => setActivePhase("grading")}
          />
          <PhaseStep
            number={4}
            icon={ClipboardCheck}
            title="复核"
            description={gradingMode === "directLLM" ? llmPhaseDescriptions.review : descriptions.review}
            isActive={activePhase === "review"}
            isCompleted={completedPhases.has("review")}
            onClick={() => setActivePhase("review")}
          />
        </div>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Phase Content */}
          {activePhase === "select" && (
            <div className="space-y-5">
              <div className="border border-[#e8e8e8] rounded-lg bg-white p-6 min-h-[500px]">
                <h3 className="text-[16px] font-medium mb-6 text-[#333]">选择题目</h3>
                {questionSelector}
                <div className="mt-8">
                  <h3 className="text-[14px] font-medium mb-4 text-[#333]">当前状态</h3>
                  {statusDisplay}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    markPhaseComplete("select");
                    setActivePhase("recognition");
                  }}
                  className="bg-[#1890ff] text-white px-6 py-2 rounded text-[13px] hover:bg-[#40a9ff] transition-colors"
                >
                  保存设置，下一步
                </button>
              </div>
            </div>
          )}

          {activePhase === "recognition" && (
        <div className="space-y-5">
          {/* 1. Region Setting */}
          <div className="border border-[#e8e8e8] rounded-lg">
            <div
              className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg cursor-pointer select-none"
              onClick={() => toggleSection("region")}
            >
              <div className="flex items-center gap-2">
                <ScanLine size={15} className="text-[#1890ff]" />
                <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>识别区域设置</span>
                {!expandedSections.has("region") ? (
                  <span className="text-[12px] text-[#999]">
                    {selectedQuestions.length > 0 ? `已设置 ${selectedQuestions.length} 个题目的识别区域` : "未设置"}
                  </span>
                ) : (
                  <span className="text-[12px] text-[#999]">（支持排除区域，拖拽调整位置和大小）</span>
                )}
              </div>
              {expandedSections.has("region") ? (
                <ChevronDown size={16} className="text-[#999]" />
              ) : (
                <ChevronRight size={16} className="text-[#999]" />
              )}
            </div>
            {expandedSections.has("region") && (
            <div className="p-4">
              <RegionEditor
                questions={regionQuestions[questionType]}
                autoRegions={autoRegions}
                selectedQuestions={selectedQuestions}
                questionRegions={questionRegions}
                onSelectedQuestionsChange={handleSelectedQuestionsChange}
                onQuestionRegionsChange={onQuestionRegionsChange}
                hideQuestionSelector
              />
            </div>
            )}
          </div>

          {/* 2. Image Recognition & Abnormal Handling (combined) */}
          <div className="border border-[#e8e8e8] rounded-lg">
            <div
              className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg cursor-pointer select-none"
              onClick={() => toggleSection("imageRecog")}
            >
              <div className="flex items-center gap-2">
                <Eye size={15} className="text-[#1890ff]" />
                <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>作答图像识别</span>
                {!expandedSections.has("imageRecog") && (
                  <span className="text-[12px] text-[#999]">
                    {ocrProgress.completed}/{ocrProgress.total} 已处理
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {expandedSections.has("imageRecog") ? (
                  <ChevronDown size={16} className="text-[#999]" />
                ) : (
                  <ChevronRight size={16} className="text-[#999]" />
                )}
              </div>
            </div>
            {expandedSections.has("imageRecog") && (
            <div className="px-5 py-4 space-y-4">
              {/* Recognition Progress & Capabilities */}
              {imageRecognitionEnabled && (
                <div className="bg-[#fafafa] rounded-lg p-4 border border-[#f0f0f0]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>识别进度</span>
                      <span className="w-px h-[14px] bg-[#d9d9d9] inline-block" />
                      <span className="text-[12px] text-[#999] shrink-0">已启用：</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f6ffed] border border-[#b7eb8f] text-[#333] text-[11px]"><span className="text-[#52c41a]">&#10003;</span>手写文字</span>
                      {questionType === "计算/解答题" && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f6ffed] border border-[#b7eb8f] text-[#333] text-[11px]"><span className="text-[#52c41a]">&#10003;</span>公式符号</span>
                      )}
                      {questionType === "作文题" && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f6ffed] border border-[#b7eb8f] text-[#333] text-[11px]"><span className="text-[#52c41a]">&#10003;</span>段落结构</span>
                      )}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f6ffed] border border-[#b7eb8f] text-[#333] text-[11px]"><span className="text-[#52c41a]">&#10003;</span>旋转矫正</span>
                    </div>
                    <span className="text-[12px] text-[#999]">
                      {ocrProgress.completed + ocrProgress.failed}/{ocrProgress.total} 已处理
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-[8px] bg-[#f0f0f0] rounded-full overflow-hidden mb-3">
                    <div className="h-full flex">
                      <div
                        className="bg-[#52c41a] transition-all duration-500"
                        style={{ width: `${(ocrProgress.completed / ocrProgress.total) * 100}%` }}
                      />
                      <div
                        className="bg-[#ff4d4f] transition-all duration-500"
                        style={{ width: `${(ocrProgress.failed / ocrProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  {/* Stats row */}
                  <div className="flex items-center gap-5 text-[12px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-[8px] h-[8px] rounded-full bg-[#52c41a] inline-block" />
                      <span className="text-[#666]">识别成功</span>
                      <span className="text-[#333]" style={{ fontWeight: 500 }}>{ocrProgress.completed}</span>
                      <span className="text-[#999]">({Math.round(ocrProgress.completed / ocrProgress.total * 100)}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-[8px] h-[8px] rounded-full bg-[#ff4d4f] inline-block" />
                      <span className="text-[#666]">识别异常</span>
                      <span className="text-[#ff4d4f]" style={{ fontWeight: 500 }}>{ocrProgress.failed}</span>
                      <span className="text-[#999]">({Math.round(ocrProgress.failed / ocrProgress.total * 100)}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-[8px] h-[8px] rounded-full bg-[#d9d9d9] inline-block" />
                      <span className="text-[#666]">待识别</span>
                      <span className="text-[#333]" style={{ fontWeight: 500 }}>{ocrProgress.pending}</span>
                      <span className="text-[#999]">({Math.round(ocrProgress.pending / ocrProgress.total * 100)}%)</span>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                      {ocrProgress.pending > 0 && ocrStarted && (
                        <span className="text-[#1890ff] flex items-center gap-1">
                          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                          识别中…
                        </span>
                      )}
                      {ocrProgress.pending > 0 && (
                        <button
                          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[12px] border transition-colors ${
                            ocrStarted 
                              ? "text-[#faad14] border-[#ffe58f] bg-[#fffbe6] hover:bg-[#fff1b8]" 
                              : "text-[#52c41a] border-[#b7eb8f] bg-[#f6ffed] hover:bg-[#d9f7be]"
                          }`}
                          onClick={() => setOcrStarted(!ocrStarted)}
                        >
                          {ocrStarted ? <Pause size={12} /> : <Play size={12} />}
                          {ocrStarted ? "暂停识别" : "开始识别"}
                        </button>
                      )}
                      <button
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-[12px] text-[#1890ff] border border-[#91d5ff] bg-[#e6f7ff] hover:bg-[#bae7ff] transition-colors"
                        onClick={() => {
                          setOcrProgress({ total: 400, completed: 0, failed: 0, pending: 400 });
                          setOcrStarted(true);
                        }}
                      >
                        <RefreshCw size={12} />
                        重新识别
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-dashed border-[#e8e8e8]" />

              {/* Abnormal handling */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-[#faad14]" />
                  <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>识别异常处理</span>
                  <span className="text-[12px] text-[#999]">— 当识别置信度低于阈值时</span>
                </div>
                <div className="flex gap-4">
                  <label
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border cursor-pointer transition-all flex-1 ${
                      abnormalHandlingMode === "auto" ? "border-[#1890ff] bg-[#e6f7ff]" : "border-[#e8e8e8] hover:border-[#91d5ff]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="abnormal"
                      checked={abnormalHandlingMode === "auto"}
                      onChange={() => setAbnormalHandlingMode("auto")}
                      className="accent-[#1890ff]"
                    />
                    <div>
                      <div className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>自动转人工</div>
                      <div className="text-[12px] text-[#999]">异常试���自动分配给教师人工批阅</div>
                    </div>
                  </label>
                  <label
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border cursor-pointer transition-all flex-1 ${
                      abnormalHandlingMode === "manual" ? "border-[#1890ff] bg-[#e6f7ff]" : "border-[#e8e8e8] hover:border-[#91d5ff]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="abnormal"
                      checked={abnormalHandlingMode === "manual"}
                      onChange={() => setAbnormalHandlingMode("manual")}
                      className="accent-[#1890ff]"
                    />
                    <div>
                      <div className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>暂存待处理</div>
                      <div className="text-[12px] text-[#999]">异常试卷放入待处理队列，由管理员统一分配</div>
                    </div>
                  </label>
                  {abnormalHandlingMode === "manual" && ocrProgress.failed > 0 && (
                    <button className="ml-2 shrink-0 self-center px-3 py-1.5 rounded text-[12px] bg-[#fff7e6] border border-[#ffd591] text-[#fa8c16] hover:bg-[#fff1b8] transition-colors flex items-center gap-1">
                      <AlertTriangle size={12} />
                      去处理 ({ocrProgress.failed})
                    </button>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Complete Recognition */}
          <div className="flex justify-between">
            <button
              onClick={() => setActivePhase("select")}
              className="border border-[#d9d9d9] text-[#666] px-6 py-2 rounded text-[13px] hover:border-[#1890ff] hover:text-[#1890ff] transition-colors"
            >
              上一步
            </button>
            <button
              onClick={() => {
                markPhaseComplete("recognition");
                setActivePhase("grading");
              }}
              className="bg-[#1890ff] text-white px-6 py-2 rounded text-[13px] hover:bg-[#40a9ff] transition-colors"
            >
              保存设置，下一步
            </button>
          </div>
        </div>
      )}

      {activePhase === "grading" && gradingMode === "directLLM" && (
        <div className="space-y-5">
          {/* 1. Question Stem Input */}
          <div className="border border-[#e8e8e8] rounded-lg">
            <div
              className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg cursor-pointer"
              onClick={() => toggleSection("llmStem")}
            >
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-[#722ed1]" />
                <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>题干内容（按题配置）</span>
                <span className="text-[12px] text-[#999]">（必填）</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[12px] text-[#666]">当前配置题目：</span>
                  <select className="text-[12px] border border-[#d9d9d9] rounded px-2 py-1 outline-none focus:border-[#722ed1] bg-white">
                    <option value="all">全部题目</option>
                    {ownedQuestions.map(qId => {
                      const q = allQuestions.find(item => item.id === qId);
                      return <option key={qId} value={qId}>{q?.label || qId}</option>;
                    })}
                  </select>
                </div>
                {!expandedSections.has("llmStem") && (
                  <span className="text-[12px] text-[#999]">
                    {llmQuestionStem.trim() ? "已填写" : "未填写"}
                  </span>
                )}
                {expandedSections.has("llmStem") ? (
                  <ChevronDown size={16} className="text-[#999]" />
                ) : (
                  <ChevronRight size={16} className="text-[#999]" />
                )}
              </div>
            </div>
            {expandedSections.has("llmStem") && (
              <div className="p-5">
                <p className="text-[12px] text-[#666] mb-3 leading-[18px]">
                  请输入本题的题干内容，大模型将根据题干理解题目要求，结合评卷标准对学生作答进行评分。
                </p>
                <textarea
                  value={llmQuestionStem}
                  onChange={(e) => setLlmQuestionStem(e.target.value)}
                  className="w-full border border-[#d9d9d9] rounded-lg px-4 py-3 text-[13px] text-[#333] outline-none focus:border-[#722ed1] transition-colors bg-white resize-none"
                  rows={5}
                  placeholder={questionType === "作文题"
                    ? "请输入作文题目要求，如：阅读下面材料，根据要求写一篇不少于800字的文章..."
                    : questionType === "计算/解答题"
                    ? "请输入计算题或解答题的题目内容，包含已知条件和求解要求..."
                    : "请输入简答题或论述题的题目内容..."
                  }
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-[#bbb]">
                    {llmQuestionStem.length > 0 ? `已输入 ${llmQuestionStem.length} 字` : ""}
                  </span>
                  {llmQuestionStem.trim() ? (
                    <span className="flex items-center gap-1 text-[12px] text-[#52c41a]">
                      <Check size={12} />
                      已填写题干
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[12px] text-[#fa8c16]">
                      <AlertCircle size={12} />
                      题干为必填项
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Grading Criteria Prompt */}
          <div className="border border-[#e8e8e8] rounded-lg">
            <div
              className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg cursor-pointer"
              onClick={() => toggleSection("llmPrompt")}
            >
              <div className="flex items-center gap-2">
                <MessageSquareText size={15} className="text-[#722ed1]" />
                <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>评卷标准提示词</span>
                <span className="text-[12px] text-[#999]">（可配置）</span>
              </div>
              <div className="flex items-center gap-3">
                {!expandedSections.has("llmPrompt") && (
                  <span className="text-[12px] text-[#999]">
                    {llmGradingPrompt !== defaultPrompts[questionType] || llmImportedFiles.length > 0 ? "已自定义" : "使用默认标准"}
                  </span>
                )}
                {expandedSections.has("llmPrompt") ? (
                  <ChevronDown size={16} className="text-[#999]" />
                ) : (
                  <ChevronRight size={16} className="text-[#999]" />
                )}
              </div>
            </div>
            {expandedSections.has("llmPrompt") && (
              <div className="p-5">
                <textarea
                  value={llmGradingPrompt}
                  onChange={(e) => setLlmGradingPrompt(e.target.value)}
                  className="w-full border border-[#d9d9d9] rounded-lg px-4 py-3 text-[13px] text-[#333] outline-none focus:border-[#722ed1] transition-colors bg-white resize-none"
                  rows={4}
                  placeholder="请输入评卷标准提示词..."
                />

                {/* Import buttons */}
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[12px] text-[#666]">导入评卷标准：</span>
                  <input
                    ref={llmFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLlmImportedFiles((prev) => [
                          ...prev,
                          {
                            id: `f-${Date.now()}`,
                            name: file.name,
                            type: "file",
                            size: file.size < 1024 * 1024
                              ? `${(file.size / 1024).toFixed(1)}KB`
                              : `${(file.size / 1024 / 1024).toFixed(1)}MB`,
                          },
                        ]);
                      }
                      e.target.value = "";
                    }}
                  />
                  <input
                    ref={llmImageInputRef}
                    type="file"
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.gif,.bmp,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLlmImportedFiles((prev) => [
                          ...prev,
                          {
                            id: `i-${Date.now()}`,
                            name: file.name,
                            type: "image",
                            size: file.size < 1024 * 1024
                              ? `${(file.size / 1024).toFixed(1)}KB`
                              : `${(file.size / 1024 / 1024).toFixed(1)}MB`,
                          },
                        ]);
                      }
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => llmFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#d9d9d9] text-[12px] text-[#333] hover:border-[#722ed1] hover:text-[#722ed1] transition-colors bg-white"
                  >
                    <FileText size={13} />
                    导入文件
                  </button>
                  <button
                    onClick={() => llmImageInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#d9d9d9] text-[12px] text-[#333] hover:border-[#722ed1] hover:text-[#722ed1] transition-colors bg-white"
                  >
                    <ImageIcon size={13} />
                    导入图片
                  </button>
                  <span className="text-[11px] text-[#bbb]">支持 PDF、Word、Excel、TXT 及常见图片格式</span>
                </div>

                {/* Imported files list */}
                {llmImportedFiles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {llmImportedFiles.map((f) => (
                      <div
                        key={f.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] ${
                          f.type === "image"
                            ? "bg-[#f9f0ff] border-[#d3adf7] text-[#722ed1]"
                            : "bg-[#f6ffed] border-[#b7eb8f] text-[#389e0d]"
                        }`}
                      >
                        {f.type === "image" ? <ImageIcon size={12} /> : <FileText size={12} />}
                        <span className="max-w-[160px] truncate">{f.name}</span>
                        <span className="text-[11px] opacity-60">{f.size}</span>
                        <button
                          onClick={() => setLlmImportedFiles((prev) => prev.filter((x) => x.id !== f.id))}
                          className="ml-0.5 hover:opacity-70 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <span className="text-[12px] text-[#999]">
                    提示词将指导大模型直接评分的标准和评分维度
                  </span>
                  <button
                    onClick={() => setLlmGradingPrompt(defaultPrompts[questionType])}
                    className="text-[12px] text-[#722ed1] hover:text-[#9254de] transition-colors"
                  >
                    恢复默认
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Direct LLM Scoring */}
          <div className="border border-[#e8e8e8] rounded-lg">
            <div
              className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg cursor-pointer"
              onClick={() => toggleSection("llmScoring")}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-[#722ed1]" />
                <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>AI直接打分</span>
              </div>
              <div className="flex items-center gap-3">
                {!expandedSections.has("llmScoring") && llmScoringStarted && (
                  <span className="text-[12px] text-[#722ed1]">打分中 0%</span>
                )}
                {expandedSections.has("llmScoring") ? (
                  <ChevronDown size={16} className="text-[#999]" />
                ) : (
                  <ChevronRight size={16} className="text-[#999]" />
                )}
              </div>
            </div>
            {expandedSections.has("llmScoring") && (
              <div className="px-5 py-4">
                {/* Info banner */}
                <div className="flex items-start gap-3 p-3.5 mb-4 rounded-lg bg-[#f9f0ff] border border-[#d3adf7]">
                  <Sparkles size={16} className="text-[#722ed1] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>大模型裸批模式</p>
                    <p className="text-[12px] text-[#666] mt-1 leading-[18px]">
                      AI将直接使用大模型的语义理解和推理能力，根据题干与评卷标准对每份试卷进行独立评分。此模式无需定标集学习过程，适合标准明确、答案相对固定的题目。
                    </p>
                  </div>
                </div>

                {/* Pre-check */}
                <div className="border border-[#f0f0f0] rounded-lg p-4 mb-4 bg-[#fafafa]">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings size={14} className="text-[#722ed1]" />
                    <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>打分前检查</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[12px]">
                      {llmQuestionStem.trim() ? (
                        <span className="flex items-center gap-1 text-[#52c41a]"><Check size={13} /> 题干已填写</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#ff4d4f]"><X size={13} /> 题干未填写（必填）</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[12px]">
                      {llmGradingPrompt.trim() ? (
                        <span className="flex items-center gap-1 text-[#52c41a]"><Check size={13} /> 评卷标准已配置</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#fa8c16]"><AlertCircle size={13} /> 评卷标准未配置（建议填写）</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="flex items-center gap-1 text-[#52c41a]"><Check size={13} /> 试卷图像已识别 {ocrProgress.completed}/{ocrProgress.total}</span>
                    </div>
                  </div>
                </div>

                {/* Start scoring button */}
                {!llmScoringStarted ? (
                  <div className="text-center py-6">
                    <button
                      onClick={() => setLlmScoringStarted(true)}
                      disabled={!llmQuestionStem.trim()}
                      className={`inline-flex items-center gap-2 px-8 py-2.5 rounded-lg text-[14px] transition-all ${
                        llmQuestionStem.trim()
                          ? "bg-[#722ed1] text-white hover:bg-[#9254de] shadow-md hover:shadow-lg"
                          : "bg-[#d9d9d9] text-white cursor-not-allowed"
                      }`}
                    >
                      <Sparkles size={16} />
                      开始裸批打分
                    </button>
                    {!llmQuestionStem.trim() && (
                      <p className="text-[12px] text-[#fa8c16] mt-2">请先填写题干内容</p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Scoring progress */}
                    <div className="grid grid-cols-3 gap-4 mb-5">
                      <div className="px-4 py-3 bg-[#f9f0ff] border border-[#d3adf7] rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-[#722ed1]" />
                            <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>裸批进度</span>
                          </div>
                          {llmScoringProgress.pending > 0 && (
                            <button
                              onClick={() => setLlmScoringPaused(!llmScoringPaused)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[12px] border transition-colors ${
                                !llmScoringPaused
                                  ? "text-[#faad14] border-[#ffe58f] bg-[#fffbe6] hover:bg-[#fff1b8]" 
                                  : "text-[#52c41a] border-[#b7eb8f] bg-[#f6ffed] hover:bg-[#d9f7be]"
                              }`}
                            >
                              {!llmScoringPaused ? <Pause size={10} /> : <Play size={10} />}
                              {!llmScoringPaused ? "暂停" : "继续"}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-[6px] bg-[#f0f0f0] rounded-full overflow-hidden">
                            <div className="h-full bg-[#722ed1] rounded-full transition-all duration-1000" style={{ width: `${(llmScoringProgress.completed / llmScoringProgress.total) * 100}%` }} />
                          </div>
                          <span className="text-[13px] text-[#722ed1]" style={{ fontWeight: 500 }}>{Math.round((llmScoringProgress.completed / llmScoringProgress.total) * 100)}%</span>
                        </div>
                        <p className="text-[12px] text-[#999] mt-1.5">已完成 {llmScoringProgress.completed}/{llmScoringProgress.total} 份试卷的裸批</p>
                      </div>
                      <div className="px-4 py-3 bg-[#fff7e6] border border-[#ffd591] rounded-lg">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Zap size={14} className="text-[#fa8c16]" />
                          <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>Token消耗</span>
                        </div>
                        <div className="text-[24px] text-[#fa8c16]" style={{ fontWeight: 500 }}>{llmTokens.toLocaleString()}</div>
                        <p className="text-[12px] text-[#999]">本次裸批累计消耗Token</p>
                      </div>
                      <div className="px-4 py-3 bg-[#e6f7ff] border border-[#91d5ff] rounded-lg">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Monitor size={14} className="text-[#1890ff]" />
                          <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>预计耗时</span>
                        </div>
                        <div className="text-[24px] text-[#1890ff]" style={{ fontWeight: 500 }}>~15min</div>
                        <p className="text-[12px] text-[#999]">根据试卷数量估算</p>
                      </div>
                    </div>

                    {/* Scoring status */}
                    <div className="flex items-center gap-2 p-3 bg-[#f9f0ff] border border-[#d3adf7] rounded-lg text-[12px]">
                      <svg className="animate-spin text-[#722ed1]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                      <span className="text-[#722ed1]" style={{ fontWeight: 500 }}>正在进行裸批打分...</span>
                      <span className="text-[#999]">大模型正在逐份评阅试卷，请耐心等待</span>
                    </div>
                  </>
                )}

                {/* AI Score Usage Setting */}
                <div className="border border-[#e8e8e8] rounded-lg mt-5">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <Settings size={14} className="text-[#722ed1]" />
                      <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>AI阅卷分数使用设置（按题配置）</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#666]">当前配置题目：</span>
                      <select className="text-[12px] border border-[#d9d9d9] rounded px-2 py-1 outline-none focus:border-[#722ed1] bg-white">
                        <option value="all">全部题目</option>
                        {ownedQuestions.map(qId => {
                          const q = allQuestions.find(item => item.id === qId);
                          return <option key={qId} value={qId}>{q?.label || qId}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        llmAiScoreMode === "machine"
                          ? "border-[#722ed1] bg-[#f9f0ff]"
                          : "border-[#e8e8e8] hover:border-[#d3adf7] bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="llmAiScoreMode"
                        checked={llmAiScoreMode === "machine"}
                        onChange={() => setLlmAiScoreMode("machine")}
                        className="accent-[#722ed1] mt-0.5 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>使用裸批分数</span>
                          <span className="px-1.5 py-px rounded text-[10px] bg-[#f9f0ff] text-[#722ed1] border border-[#d3adf7]">推荐</span>
                        </div>
                        <p className="text-[12px] text-[#666] leading-[18px]">
                          直接使用大模型裸批得分作为学生成绩，教师仅需对抽检异常试卷进行复核。
                        </p>
                      </div>
                    </label>
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        llmAiScoreMode === "dual"
                          ? "border-[#722ed1] bg-[#f9f0ff]"
                          : "border-[#e8e8e8] hover:border-[#d3adf7] bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="llmAiScoreMode"
                        checked={llmAiScoreMode === "dual"}
                        onChange={() => setLlmAiScoreMode("dual")}
                        className="accent-[#722ed1] mt-0.5 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>裸批分参与双评出分</span>
                        </div>
                        <p className="text-[12px] text-[#666] leading-[18px]">
                          裸批分作为一个评次的分值，与教师人工评分进行双评。
                        </p>
                      </div>
                    </label>
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        llmAiScoreMode === "reference"
                          ? "border-[#722ed1] bg-[#f9f0ff]"
                          : "border-[#e8e8e8] hover:border-[#d3adf7] bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="llmAiScoreMode"
                        checked={llmAiScoreMode === "reference"}
                        onChange={() => setLlmAiScoreMode("reference")}
                        className="accent-[#722ed1] mt-0.5 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>不使用裸批分</span>
                        </div>
                        <p className="text-[12px] text-[#666] leading-[18px]">
                          老师需评阅全部试卷，裸批分仅作为复核参考。
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Complete Grading */}
          <div className="flex justify-between">
            <button
              onClick={() => setActivePhase("recognition")}
              className="border border-[#d9d9d9] text-[#666] px-6 py-2 rounded text-[13px] hover:border-[#722ed1] hover:text-[#722ed1] transition-colors"
            >
              上一步
            </button>
            <button
              onClick={() => {
                markPhaseComplete("grading");
                setActivePhase("review");
              }}
              className="bg-[#722ed1] text-white px-6 py-2 rounded text-[13px] hover:bg-[#9254de] transition-colors"
            >
              保存设置，下一步
            </button>
          </div>
        </div>
      )}

      {activePhase === "grading" && gradingMode === "calibration" && (
        <div className="space-y-5">
          {/* 1. Prompt Setting */}
          <div className="border border-[#e8e8e8] rounded-lg">
            <div
              className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg cursor-pointer"
              onClick={() => toggleSection("prompt")}
            >
              <div className="flex items-center gap-2">
                <MessageSquareText size={15} className="text-[#1890ff]" />
                <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>评卷标准提示词</span>
                <span className="text-[12px] text-[#999]">（可配置）</span>
              </div>
              {expandedSections.has("prompt") ? (
                <ChevronDown size={16} className="text-[#999]" />
              ) : (
                <ChevronRight size={16} className="text-[#999]" />
              )}
            </div>
            {expandedSections.has("prompt") && (
              <div className="p-5">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full border border-[#d9d9d9] rounded-lg px-4 py-3 text-[13px] text-[#333] outline-none focus:border-[#1890ff] transition-colors bg-white resize-none"
                  rows={4}
                  placeholder="请输入评卷标准提示词..."
                />

                {/* Import buttons */}
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[12px] text-[#666]">导入评卷标准：</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImportedFiles((prev) => [
                          ...prev,
                          {
                            id: `f-${Date.now()}`,
                            name: file.name,
                            type: "file",
                            size: file.size < 1024 * 1024
                              ? `${(file.size / 1024).toFixed(1)}KB`
                              : `${(file.size / 1024 / 1024).toFixed(1)}MB`,
                          },
                        ]);
                      }
                      e.target.value = "";
                    }}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.gif,.bmp,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImportedFiles((prev) => [
                          ...prev,
                          {
                            id: `i-${Date.now()}`,
                            name: file.name,
                            type: "image",
                            size: file.size < 1024 * 1024
                              ? `${(file.size / 1024).toFixed(1)}KB`
                              : `${(file.size / 1024 / 1024).toFixed(1)}MB`,
                          },
                        ]);
                      }
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#d9d9d9] text-[12px] text-[#333] hover:border-[#1890ff] hover:text-[#1890ff] transition-colors bg-white"
                  >
                    <FileText size={13} />
                    导入文件
                  </button>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#d9d9d9] text-[12px] text-[#333] hover:border-[#1890ff] hover:text-[#1890ff] transition-colors bg-white"
                  >
                    <ImageIcon size={13} />
                    导入图片
                  </button>
                  <span className="text-[11px] text-[#bbb]">支持 PDF、Word、Excel、TXT 及常见图片格式</span>
                </div>

                {/* Imported files list */}
                {importedFiles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {importedFiles.map((f) => (
                      <div
                        key={f.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] ${
                          f.type === "image"
                            ? "bg-[#f0f5ff] border-[#adc6ff] text-[#2f54eb]"
                            : "bg-[#f6ffed] border-[#b7eb8f] text-[#389e0d]"
                        }`}
                      >
                        {f.type === "image" ? <ImageIcon size={12} /> : <FileText size={12} />}
                        <span className="max-w-[160px] truncate">{f.name}</span>
                        <span className="text-[11px] opacity-60">{f.size}</span>
                        <button
                          onClick={() => setImportedFiles((prev) => prev.filter((x) => x.id !== f.id))}
                          className="ml-0.5 hover:opacity-70 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <span className="text-[12px] text-[#999]">
                    提示词将指导AI评阅（包括定标集自动挑选）的打分标准和评分维度
                  </span>
                  <button
                    onClick={() => setPrompt(defaultPrompts[questionType])}
                    className="text-[12px] text-[#1890ff] hover:text-[#40a9ff] transition-colors"
                  >
                    恢复默认
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. AI Pre-scoring */}
          <div className="border border-[#e8e8e8] rounded-lg">
            <div
              className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg cursor-pointer"
              onClick={() => toggleSection("prescore")}
            >
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-[#fa8c16]" />
                <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>AI预评分</span>
              </div>
              <div className="flex items-center gap-3">
                {!expandedSections.has("prescore") && prescoreStarted && !prescoreCompleted && (
                  <span className="text-[12px] text-[#fa8c16]">预评分中...</span>
                )}
                {!expandedSections.has("prescore") && prescoreCompleted && (
                  <span className="text-[12px] text-[#52c41a]">已完成预评分</span>
                )}
                {expandedSections.has("prescore") ? (
                  <ChevronDown size={16} className="text-[#999]" />
                ) : (
                  <ChevronRight size={16} className="text-[#999]" />
                )}
              </div>
            </div>
            {expandedSections.has("prescore") && (
              <div className="px-5 py-4">
                <div className="flex items-start gap-3 p-3.5 mb-4 rounded-lg bg-[#fff7e6] border border-[#ffd591]">
                  <Zap size={16} className="text-[#fa8c16] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>什么是AI预评分？</p>
                    <p className="text-[12px] text-[#666] mt-1 leading-[18px]">
                      AI根据“评卷标准提示词”对试卷进行初步预评分，分析答题分布，从而更科学地自动挑选出具有代表性的“定标集”试卷供教师人工阅卷。
                    </p>
                  </div>
                </div>

                {!prescoreStarted ? (
                  <div className="text-center py-4">
                    <button
                      onClick={() => setPrescoreStarted(true)}
                      className="inline-flex items-center gap-2 px-6 py-2 rounded bg-[#fa8c16] text-white text-[13px] hover:bg-[#ff9c3a] transition-colors"
                    >
                      <Zap size={14} />
                      开始AI预评分
                    </button>
                  </div>
                ) : !prescoreCompleted ? (
                  <div className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>预评分进度</span>
                        <span className="text-[12px] text-[#999]">
                          ({prescoreProgress.completed}/{prescoreProgress.total})
                        </span>
                      </div>
                      <button
                        onClick={() => setPrescorePaused(!prescorePaused)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[12px] border transition-colors ${
                          !prescorePaused
                            ? "text-[#faad14] border-[#ffe58f] bg-[#fffbe6] hover:bg-[#fff1b8]" 
                            : "text-[#52c41a] border-[#b7eb8f] bg-[#f6ffed] hover:bg-[#d9f7be]"
                        }`}
                      >
                        {!prescorePaused ? <Pause size={10} /> : <Play size={10} />}
                        {!prescorePaused ? "暂停" : "继续"}
                      </button>
                    </div>
                    <div className="w-full h-[8px] bg-[#f0f0f0] rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-[#fa8c16] transition-all duration-500"
                        style={{ width: `${(prescoreProgress.completed / prescoreProgress.total) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-[#fa8c16]">
                      {!prescorePaused && <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>}
                      <span>{prescorePaused ? "已暂停预评分" : "AI正在进行预评分，请稍候..."}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#f6ffed] flex items-center justify-center mb-1">
                      <Check size={20} className="text-[#52c41a]" />
                    </div>
                    <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>预评分已完成</span>
                    <span className="text-[12px] text-[#666]">AI已完成对所有试卷的初步评分，现在可以进行定标集挑选了。</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Calibration Set */}
          <div className="border border-[#e8e8e8] rounded-lg">
            <div
              className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg cursor-pointer"
              onClick={() => toggleSection("calibration")}
            >
              <div className="flex items-center gap-2">
                <Users size={15} className="text-[#1890ff]" />
                <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>定标集挑选</span>
                <span className="text-[12px] text-[#999]">（自动/人工）</span>
              </div>
              <div className="flex items-center gap-3">
                {/* Distribution thumbnail */}
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded border border-[#e8e8e8] bg-white cursor-pointer hover:border-[#1890ff] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDistributionModalOpen(true);
                  }}
                  title="查看分值分布"
                >
                  <BarChart3 size={12} className="text-[#1890ff]" />
                  <div className="w-[80px] h-[28px]">
                    <ResponsiveContainer width={80} height={28} minWidth={0}>
                      <BarChart data={distributionData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                        <Bar dataKey="count" radius={[1, 1, 0, 0]}>
                          {distributionData.map((entry, index) => (
                            <Cell key={index} fill={entry.count > 0 ? "#1890ff" : "#e8e8e8"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <Maximize2 size={10} className="text-[#bbb]" />
                </div>
                <span className="text-[12px] text-[#52c41a]">
                  已定标 {mockCalibrationSamples.filter((s) => s.status !== "待评阅").length}/{mockCalibrationSamples.length}
                </span>
                {expandedSections.has("calibration") ? (
                  <ChevronDown size={16} className="text-[#999]" />
                ) : (
                  <ChevronRight size={16} className="text-[#999]" />
                )}
              </div>
            </div>
            {expandedSections.has("calibration") && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-[#666]">挑选方式：</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="calibration"
                          checked={calibrationMode === "auto"}
                          onChange={() => setCalibrationMode("auto")}
                          className="accent-[#1890ff]"
                        />
                        <span className="text-[13px] text-[#333]">自动挑选</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="calibration"
                          checked={calibrationMode === "manual"}
                          onChange={() => setCalibrationMode("manual")}
                          className="accent-[#1890ff]"
                        />
                        <span className="text-[13px] text-[#333]">人工挑选</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[#666]">定标数量：</span>
                      <input
                        type="text"
                        value={calibrationCount}
                        onChange={(e) => setCalibrationCount(e.target.value)}
                        className="w-[60px] border border-[#d9d9d9] rounded px-2 py-1 text-[13px] text-center outline-none focus:border-[#1890ff] transition-colors bg-white"
                      />
                      <span className="text-[12px] text-[#999]">份</span>
                    </div>
                  </div>
                  {/* Prompt configuration status for auto mode */}
                  {calibrationMode === "auto" && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] text-[#666]">评卷标准：</span>
                      {isPromptConfigured ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[#f6ffed] text-[#52c41a] border border-[#b7eb8f]">
                          <Check size={11} />
                          已配置
                        </span>
                      ) : (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[#fff7e6] text-[#fa8c16] border border-[#ffd591] cursor-pointer hover:bg-[#fff1e0] transition-colors"
                          onClick={() => setExpandedSections(prev => new Set(prev).add("prompt"))}
                        >
                          <AlertCircle size={11} />
                          未自定义，使用默认标准
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Calibration Selection Progress */}
                {calibrationMode === "auto" && (
                  <div className="mb-4 p-4 border border-[#f0f0f0] rounded-lg bg-[#fafafa]">
                    {!calibrationSelectionStarted ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-[#1890ff]" />
                          <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>自动挑选定标集</span>
                        </div>
                        <button
                          onClick={() => setCalibrationSelectionStarted(true)}
                          className="px-4 py-1.5 rounded bg-[#1890ff] text-white text-[12px] hover:bg-[#40a9ff] transition-colors"
                        >
                          开始挑选
                        </button>
                      </div>
                    ) : !calibrationSelected ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-[#1890ff]" />
                            <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>挑选进度</span>
                            <span className="text-[12px] text-[#999] ml-2">
                              {calibrationSelectionProgress.completed}/{calibrationSelectionProgress.total}
                            </span>
                          </div>
                          <button
                            onClick={() => setCalibrationSelectionPaused(!calibrationSelectionPaused)}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[12px] border transition-colors ${
                              !calibrationSelectionPaused
                                ? "text-[#faad14] border-[#ffe58f] bg-[#fffbe6] hover:bg-[#fff1b8]" 
                                : "text-[#52c41a] border-[#b7eb8f] bg-[#f6ffed] hover:bg-[#d9f7be]"
                            }`}
                          >
                            {!calibrationSelectionPaused ? <Pause size={10} /> : <Play size={10} />}
                            {!calibrationSelectionPaused ? "暂停" : "继续"}
                          </button>
                        </div>
                        <div className="w-full h-[8px] bg-[#f0f0f0] rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-[#1890ff] transition-all duration-500"
                            style={{ width: `${(calibrationSelectionProgress.completed / calibrationSelectionProgress.total) * 100}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-[12px] text-[#1890ff]">
                          {!calibrationSelectionPaused && <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>}
                          <span>{calibrationSelectionPaused ? "已暂停挑选" : "AI正在根据分值和答案分布挑选定标集..."}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#f6ffed] flex items-center justify-center">
                          <Check size={14} className="text-[#52c41a]" />
                        </div>
                        <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>挑选完成</span>
                        <span className="text-[12px] text-[#666]">已成功挑选 {calibrationSelectionProgress.total} 份定标集试卷</span>
                      </div>
                    )}
                  </div>
                )}

                {/* View mode toggle */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center bg-[#f5f5f5] rounded p-0.5">
                    <button
                      onClick={() => setCalibrationViewMode("score")}
                      className={`px-3 py-1 rounded text-[12px] transition-colors ${
                        calibrationViewMode === "score"
                          ? "bg-white text-[#1890ff] shadow-sm border border-[#e8e8e8]"
                          : "text-[#666] hover:text-[#333]"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <BarChart3 size={12} />
                        按分数统计
                      </span>
                    </button>
                    <button
                      onClick={() => setCalibrationViewMode("answer")}
                      className={`px-3 py-1 rounded text-[12px] transition-colors ${
                        calibrationViewMode === "answer"
                          ? "bg-white text-[#1890ff] shadow-sm border border-[#e8e8e8]"
                          : "text-[#666] hover:text-[#333]"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Filter size={12} />
                        按答案统计
                      </span>
                    </button>
                  </div>
                  <span className="text-[11px] text-[#bbb]">
                    {calibrationViewMode === "score"
                      ? `${scoreBands.length} 个分数段`
                      : `${answerBands.length} 种答案类型`}
                  </span>
                </div>

                {/* Score Band Summary — dual table layout */}
                {calibrationViewMode === "score" ? (
                  <ScoreBandDualTable
                    scoreBands={scoreBands}
                    samples={mockCalibrationSamples}
                    onViewDetail={(band) => {
                      setDetailFilterBand(band);
                      setDetailFilterAnswer(null);
                      setDetailFilterDimension("score");
                      setCalibrationDetailOpen(true);
                    }}
                  />
                ) : (
                  <AnswerBandDualTable
                    answerBands={answerBands}
                    samples={mockCalibrationSamples}
                    onViewDetail={(answerType) => {
                      setDetailFilterAnswer(answerType);
                      setDetailFilterBand(null);
                      setDetailFilterDimension("answer");
                      setCalibrationDetailOpen(true);
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Calibration Detail Modal */}
          {calibrationDetailOpen && (() => {
            const isAnswerFilter = detailFilterDimension === "answer";
            const filteredSamples = mockCalibrationSamples.filter((s) => {
              if (detailFilterBand) return s.scoreBand === detailFilterBand;
              if (detailFilterAnswer) return s.answerType === detailFilterAnswer;
              return true;
            });
            const detailGridCols = "50px 80px 60px 70px 80px 80px 70px 1fr";
            return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCalibrationDetailOpen(false)}>
              <div className="bg-white rounded-lg shadow-xl w-[800px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
                  <div className="flex items-center gap-3">
                    <Users size={16} className="text-[#1890ff]" />
                    <span className="text-[15px] text-[#333]" style={{ fontWeight: 500 }}>
                      定标集详情
                      {detailFilterBand && (
                        <span className="text-[13px] text-[#999] ml-2">— {detailFilterBand}分段</span>
                      )}
                      {detailFilterAnswer && (
                        <span className="text-[13px] ml-2" style={{ color: answerTypeColors[detailFilterAnswer] || "#999" }}>
                          — 答案{detailFilterAnswer}
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => setCalibrationDetailOpen(false)}
                    className="text-[#999] hover:text-[#333] transition-colors p-1 rounded hover:bg-[#f5f5f5]"
                  >
                    <X size={18} />
                  </button>
                </div>
                {/* Filter dimension toggle + tabs */}
                <div className="px-6 py-3 border-b border-[#f0f0f0]">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[12px] text-[#999]">筛选维度：</span>
                    <div className="flex items-center bg-[#f5f5f5] rounded p-0.5">
                      <button
                        onClick={() => { setDetailFilterDimension("score"); setDetailFilterBand(null); setDetailFilterAnswer(null); }}
                        className={`px-2.5 py-0.5 rounded text-[11px] transition-colors ${
                          !isAnswerFilter
                            ? "bg-white text-[#1890ff] shadow-sm border border-[#e8e8e8]"
                            : "text-[#666] hover:text-[#333]"
                        }`}
                      >
                        按分数
                      </button>
                      <button
                        onClick={() => { setDetailFilterDimension("answer"); setDetailFilterBand(null); setDetailFilterAnswer(null); }}
                        className={`px-2.5 py-0.5 rounded text-[11px] transition-colors ${
                          isAnswerFilter
                            ? "bg-white text-[#1890ff] shadow-sm border border-[#e8e8e8]"
                            : "text-[#666] hover:text-[#333]"
                        }`}
                      >
                        按答案
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => { setDetailFilterBand(null); setDetailFilterAnswer(null); }}
                      className={`px-2.5 py-1 rounded text-[12px] transition-colors ${
                        detailFilterBand === null && detailFilterAnswer === null
                          ? "bg-[#1890ff] text-white"
                          : "bg-[#f5f5f5] text-[#666] hover:bg-[#e8e8e8]"
                      }`}
                    >
                      全部
                    </button>
                    {!isAnswerFilter ? (
                      scoreBands.map((band) => (
                        <button
                          key={band.range}
                          onClick={() => { setDetailFilterBand(band.range); setDetailFilterAnswer(null); }}
                          className={`px-2.5 py-1 rounded text-[12px] transition-colors ${
                            detailFilterBand === band.range
                              ? "bg-[#1890ff] text-white"
                              : "bg-[#f5f5f5] text-[#666] hover:bg-[#e8e8e8]"
                          }`}
                        >
                          {band.range}分
                        </button>
                      ))
                    ) : (
                      answerBands.map((band) => (
                        <button
                          key={band.type}
                          onClick={() => { setDetailFilterAnswer(band.type); setDetailFilterBand(null); }}
                          className={`px-2.5 py-1 rounded text-[12px] transition-colors flex items-center gap-1 ${
                            detailFilterAnswer === band.type
                              ? "text-white"
                              : "bg-[#f5f5f5] text-[#666] hover:bg-[#e8e8e8]"
                          }`}
                          style={detailFilterAnswer === band.type ? { backgroundColor: answerTypeColors[band.type] || "#1890ff" } : {}}
                        >
                          <div
                            className="w-[6px] h-[6px] rounded-full"
                            style={{ backgroundColor: detailFilterAnswer === band.type ? "#fff" : (answerTypeColors[band.type] || "#999") }}
                          />
                          {band.type}类 ({band.totalCount})
                        </button>
                      ))
                    )}
                  </div>
                </div>
                {/* Table */}
                <div className="flex-1 overflow-auto px-6 py-4">
                  <div className="border border-[#f0f0f0] rounded overflow-hidden">
                    <div
                      className="grid bg-[#fafafa] text-[12px] text-[#666] border-b border-[#f0f0f0] sticky top-0"
                      style={{ gridTemplateColumns: detailGridCols }}
                    >
                      <div className="px-3 py-2 text-center">序号</div>
                      <div className="px-3 py-2">学生编号</div>
                      <div className="px-3 py-2 text-center">答案</div>
                      <div className="px-3 py-2">分数段</div>
                      <div className="px-3 py-2 text-center">教师评分</div>
                      <div className="px-3 py-2 text-center">AI评分</div>
                      <div className="px-3 py-2">状态</div>
                      <div className="px-3 py-2">操作</div>
                    </div>
                    {filteredSamples.length === 0 ? (
                      <div className="px-6 py-8 text-center text-[13px] text-[#999]">暂无匹配的定标样本</div>
                    ) : (
                      filteredSamples.map((sample, idx) => (
                        <div
                          key={sample.id}
                          className="grid text-[12px] border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fafafa]"
                          style={{ gridTemplateColumns: detailGridCols }}
                        >
                          <div className="px-3 py-2.5 text-center text-[#999]">{idx + 1}</div>
                          <div className="px-3 py-2.5 text-[#333]">{sample.studentId}</div>
                          <div className="px-3 py-2.5 flex items-center justify-center gap-1">
                            <div
                              className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                              style={{ backgroundColor: answerTypeColors[sample.answerType] || "#999" }}
                            />
                            <span style={{ color: answerTypeColors[sample.answerType] || "#666", fontWeight: 500 }}>
                              {sample.answerType}
                            </span>
                          </div>
                          <div className="px-3 py-2.5 text-[#666]">{sample.scoreBand}</div>
                          <div className="px-3 py-2.5 text-center text-[#333]">
                            {sample.teacherScore !== null ? sample.teacherScore : "-"}
                          </div>
                          <div className="px-3 py-2.5 text-center text-[#333]">
                            {sample.aiScore !== null ? sample.aiScore : "-"}
                          </div>
                          <div className="px-3 py-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] ${
                                sample.status === "已评阅"
                                  ? "bg-[#e6f7ff] text-[#1890ff]"
                                  : sample.status === "AI已学习"
                                  ? "bg-[#f6ffed] text-[#52c41a]"
                                  : "bg-[#f5f5f5] text-[#999]"
                              }`}
                            >
                              {sample.status}
                            </span>
                          </div>
                          <div className="px-3 py-2.5">
                            {sample.status === "待评阅" ? (
                              <span className="text-[#1890ff] cursor-pointer hover:text-[#40a9ff]">去评阅</span>
                            ) : (
                              <span className="text-[#1890ff] cursor-pointer hover:text-[#40a9ff]">查看</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="px-6 py-3 border-t border-[#f0f0f0] flex items-center justify-between">
                  <span className="text-[12px] text-[#999]">
                    共 {filteredSamples.length} 条记录
                  </span>
                  <button
                    onClick={() => setCalibrationDetailOpen(false)}
                    className="px-5 py-1.5 rounded bg-[#1890ff] text-white text-[13px] hover:bg-[#40a9ff] transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
            );
          })()}

          {/* Distribution Modal */}
          {distributionModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDistributionModalOpen(false)}>
              <div className="bg-white rounded-lg shadow-xl w-[680px] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
                  <div className="flex items-center gap-3">
                    <BarChart3 size={16} className="text-[#1890ff]" />
                    <span className="text-[15px] text-[#333]" style={{ fontWeight: 500 }}>定标集分值分布</span>
                    <span className="text-[12px] text-[#999]">（正态分布）</span>
                  </div>
                  <button
                    onClick={() => setDistributionModalOpen(false)}
                    className="text-[#999] hover:text-[#333] transition-colors p-1 rounded hover:bg-[#f5f5f5]"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="px-6 py-5">
                  {/* Stats summary */}
                  <div className="flex items-center gap-6 mb-4">
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="text-[#666]">总样本数：</span>
                      <span className="text-[#333]" style={{ fontWeight: 500 }}>{mockCalibrationSamples.length}份</span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="text-[#666]">平均分：</span>
                      <span className="text-[#1890ff]" style={{ fontWeight: 500 }}>
                        {(mockCalibrationSamples.filter(s => s.teacherScore !== null).reduce((a, b) => a + (b.teacherScore || 0), 0) / mockCalibrationSamples.filter(s => s.teacherScore !== null).length).toFixed(1)}分
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="text-[#666]">满分：</span>
                      <span className="text-[#333]" style={{ fontWeight: 500 }}>6分</span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="text-[#666]">分值间隔：</span>
                      <span className="text-[#333]" style={{ fontWeight: 500 }}>0.5分</span>
                    </div>
                  </div>
                  {/* Chart */}
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height={300} minWidth={0}>
                      <BarChart data={distributionData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: "#666" }}
                          axisLine={{ stroke: "#e8e8e8" }}
                          tickLine={{ stroke: "#e8e8e8" }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#666" }}
                          axisLine={{ stroke: "#e8e8e8" }}
                          tickLine={{ stroke: "#e8e8e8" }}
                          allowDecimals={false}
                          label={{ value: "份数", position: "insideTopLeft", offset: -5, style: { fontSize: 11, fill: "#999" } }}
                        />
                        <Tooltip
                          contentStyle={{ fontSize: 12, border: "1px solid #e8e8e8", borderRadius: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                          formatter={(value: number) => [`${value}份`, "样本数"]}
                          labelFormatter={(label) => `分值：${label}`}
                        />
                        <ReferenceLine
                          x={`${(mockCalibrationSamples.filter(s => s.teacherScore !== null).reduce((a, b) => a + (b.teacherScore || 0), 0) / mockCalibrationSamples.filter(s => s.teacherScore !== null).length).toFixed(1)}分`}
                          stroke="#fa8c16"
                          strokeDasharray="4 4"
                          label={{ value: "均值", position: "top", style: { fontSize: 11, fill: "#fa8c16" } }}
                        />
                        <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={36}>
                          {distributionData.map((entry, index) => (
                            <Cell key={index} fill={entry.count > 0 ? "#1890ff" : "#f0f0f0"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[11px] text-[#bbb] mt-2 text-center">
                    图表显示已挑选定标集试卷在各分值上的分布情况，橙色虚线为平均分
                  </p>
                </div>
                <div className="px-6 py-3 border-t border-[#f0f0f0] flex justify-end">
                  <button
                    onClick={() => setDistributionModalOpen(false)}
                    className="px-5 py-1.5 rounded bg-[#1890ff] text-white text-[13px] hover:bg-[#40a9ff] transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. AI Learning */}
          <div className="border border-[#e8e8e8] rounded-lg">
            <div
              className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg cursor-pointer"
              onClick={() => toggleSection("aiLearning")}
            >
              <div className="flex items-center gap-2">
                <Brain size={15} className="text-[#722ed1]" />
                <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>AI学习与打分</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-[#722ed1]">学习 {Math.round(aiLearningProgress.completed / aiLearningProgress.total * 100)}%</span>
                <span className="text-[12px] text-[#fa8c16]">打分 {Math.round(aiScoringProgress.completed / aiScoringProgress.total * 100)}%</span>
                <span className="text-[12px] text-[#1890ff]">一致率 {aiConsistencyRate.toFixed(1)}%</span>
                {expandedSections.has("aiLearning") ? (
                  <ChevronDown size={16} className="text-[#999]" />
                ) : (
                  <ChevronRight size={16} className="text-[#999]" />
                )}
              </div>
            </div>
            {expandedSections.has("aiLearning") && (
            <div className="px-5 py-4">
              {!aiLearningStarted ? (
                <div className="text-center py-6 border border-[#e8e8e8] rounded-lg bg-white mb-5">
                  <button
                    onClick={() => setAiLearningStarted(true)}
                    className="inline-flex items-center gap-2 px-8 py-2.5 rounded-lg text-[14px] transition-all bg-[#722ed1] text-white hover:bg-[#9254de] shadow-md hover:shadow-lg"
                  >
                    <Brain size={16} />
                    开始AI学习与打分
                  </button>
                  <p className="text-[12px] text-[#999] mt-2">点击开始让AI学习定标集并对所有试卷进行打分</p>
                </div>
              ) : (
                <>
                  <p className="text-[13px] text-[#666] mb-4">
                    AI将学习教师对定标集试卷的打分规则，并应用到全部试卷的评分中，实现自动批阅。
                  </p>
                  {/* Progress cards — 3 columns */}
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    {/* Learning progress */}
                    <div className="px-4 py-3 bg-[#f9f0ff] border border-[#d3adf7] rounded-lg">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Brain size={14} className="text-[#722ed1]" />
                          <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>学习进度</span>
                        </div>
                        {aiLearningProgress.pending > 0 && (
                          <button
                            onClick={() => setAiLearningPaused(!aiLearningPaused)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[12px] border transition-colors ${
                              !aiLearningPaused
                                ? "text-[#faad14] border-[#ffe58f] bg-[#fffbe6] hover:bg-[#fff1b8]" 
                                : "text-[#52c41a] border-[#b7eb8f] bg-[#f6ffed] hover:bg-[#d9f7be]"
                            }`}
                          >
                            {!aiLearningPaused ? <Pause size={10} /> : <Play size={10} />}
                            {!aiLearningPaused ? "暂停" : "继续"}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-[6px] bg-[#f0f0f0] rounded-full overflow-hidden">
                          <div className="h-full bg-[#722ed1] rounded-full transition-all duration-500" style={{ width: `${Math.round(aiLearningProgress.completed / aiLearningProgress.total * 100)}%` }} />
                        </div>
                        <span className="text-[13px] text-[#722ed1]" style={{ fontWeight: 500 }}>{Math.round(aiLearningProgress.completed / aiLearningProgress.total * 100)}%</span>
                      </div>
                      <p className="text-[12px] text-[#999] mt-1.5">已学习 {aiLearningProgress.completed}/{aiLearningProgress.total} 份定标试卷的打分规则</p>
                    </div>
                    {/* Scoring progress */}
                    <div className="px-4 py-3 bg-[#fff7e6] border border-[#ffd591] rounded-lg">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Zap size={14} className="text-[#fa8c16]" />
                          <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>打分进度</span>
                        </div>
                        {aiScoringStarted && aiScoringProgress.pending > 0 && (
                          <button
                            onClick={() => setAiScoringPaused(!aiScoringPaused)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[12px] border transition-colors ${
                              !aiScoringPaused
                                ? "text-[#faad14] border-[#ffe58f] bg-[#fffbe6] hover:bg-[#fff1b8]" 
                                : "text-[#52c41a] border-[#b7eb8f] bg-[#f6ffed] hover:bg-[#d9f7be]"
                            }`}
                          >
                            {!aiScoringPaused ? <Pause size={10} /> : <Play size={10} />}
                            {!aiScoringPaused ? "暂停" : "继续"}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-[6px] bg-[#f0f0f0] rounded-full overflow-hidden">
                          <div className="h-full bg-[#fa8c16] rounded-full transition-all duration-500" style={{ width: `${Math.round(aiScoringProgress.completed / aiScoringProgress.total * 100)}%` }} />
                        </div>
                        <span className="text-[13px] text-[#fa8c16]" style={{ fontWeight: 500 }}>{Math.round(aiScoringProgress.completed / aiScoringProgress.total * 100)}%</span>
                      </div>
                      <p className="text-[12px] text-[#999] mt-1.5">已完成 {aiScoringProgress.completed}/{aiScoringProgress.total} 份试卷的AI打分</p>
                    </div>
                    {/* Scoring consistency */}
                    <div className="px-4 py-3 bg-[#e6f7ff] border border-[#91d5ff] rounded-lg">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Monitor size={14} className="text-[#1890ff]" />
                        <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>评分一致率</span>
                      </div>
                      <div className="text-[24px] text-[#1890ff]" style={{ fontWeight: 500 }}>{aiConsistencyRate.toFixed(1)}%</div>
                      <p className="text-[12px] text-[#999]">AI评分与教师评分的一致程度</p>
                    </div>
                  </div>

                  {/* AI Score Usage Setting */}
              <div className="border border-[#e8e8e8] rounded-lg">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <Settings size={14} className="text-[#1890ff]" />
                    <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>AI阅卷分数使用设置（按题配置）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#666]">当前配置题目：</span>
                    <select className="text-[12px] border border-[#d9d9d9] rounded px-2 py-1 outline-none focus:border-[#1890ff] bg-white">
                      <option value="all">全部题目</option>
                      {ownedQuestions.map(qId => {
                        const q = allQuestions.find(item => item.id === qId);
                        return <option key={qId} value={qId}>{q?.label || qId}</option>;
                      })}
                    </select>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {/* Option 1: Use machine score */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                      aiScoreMode === "machine"
                        ? "border-[#1890ff] bg-[#e6f7ff]"
                        : "border-[#e8e8e8] hover:border-[#91d5ff] bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="aiScoreMode"
                      checked={aiScoreMode === "machine"}
                      onChange={() => setAiScoreMode("machine")}
                      className="accent-[#1890ff] mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>使用机器分</span>
                        <span className="px-1.5 py-px rounded text-[10px] bg-[#f6ffed] text-[#52c41a] border border-[#b7eb8f]">推荐</span>
                      </div>
                      <p className="text-[12px] text-[#666] leading-[18px]">
                        老师仅需评阅少量定标试卷和疑难试卷，其余试卷都将由机器评阅并使用机器分作为学生得分。
                      </p>
                      <p className="text-[11px] text-[#999] mt-1.5 leading-[16px]">
                        管理员可联系技术支持导出人机对比报告，验证AI打分质量。
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Machine score in dual review */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                      aiScoreMode === "dual"
                        ? "border-[#1890ff] bg-[#e6f7ff]"
                        : "border-[#e8e8e8] hover:border-[#91d5ff] bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="aiScoreMode"
                      checked={aiScoreMode === "dual"}
                      onChange={() => setAiScoreMode("dual")}
                      className="accent-[#1890ff] mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>机器分参与双评出分</span>
                      </div>
                      <p className="text-[12px] text-[#666] leading-[18px]">
                        机器分与教师人工阅卷分值进行双评。老师仅需评阅少量定标试卷、疑难试卷及其余评次的试卷。
                      </p>
                    </div>
                  </label>

                  {/* Option 3: Reference only */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                      aiScoreMode === "reference"
                        ? "border-[#1890ff] bg-[#e6f7ff]"
                        : "border-[#e8e8e8] hover:border-[#91d5ff] bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="aiScoreMode"
                      checked={aiScoreMode === "reference"}
                      onChange={() => setAiScoreMode("reference")}
                      className="accent-[#1890ff] mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>不使用机器分</span>
                      </div>
                      <p className="text-[12px] text-[#666] leading-[18px]">
                        老师需评阅全部试卷，全部使用教师评分作为学生得分。机器分仅作为复核质检参考。
                      </p>
                    </div>
                  </label>
                </div>
              </div>
              </>
              )}
            </div>
            )}
          </div>

          {/* Complete Grading */}
          <div className="flex justify-between">
            <button
              onClick={() => setActivePhase("recognition")}
              className="border border-[#d9d9d9] text-[#666] px-6 py-2 rounded text-[13px] hover:border-[#1890ff] hover:text-[#1890ff] transition-colors"
            >
              上一步
            </button>
            <button
              onClick={() => {
                markPhaseComplete("grading");
                setActivePhase("review");
              }}
              className="bg-[#1890ff] text-white px-6 py-2 rounded text-[13px] hover:bg-[#40a9ff] transition-colors"
            >
              保存设置，下一步
            </button>
          </div>
        </div>
      )}

      {activePhase === "review" && (
        <div className="space-y-5">
          {/* 1. Generate Review Tasks */}
          <div className="border border-[#e8e8e8] rounded-lg">
            <div
              className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg cursor-pointer select-none"
              onClick={() => toggleSection("reviewTask")}
            >
              <div className="flex items-center gap-2">
                <ClipboardCheck size={15} className="text-[#1890ff]" />
                <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>生成复核任务</span>
                {!expandedSections.has("reviewTask") && (
                  <span className="text-[12px] text-[#999]">
                    {reviewMode === "machineOnly"
                      ? `抽检模式 · ${samplingTasks.length} 个任务`
                      : `人机对比 · 阈值 ${scoreDiffThreshold} 分 · ${comparisonTasks.length} 个任务`}
                  </span>
                )}
              </div>
              {expandedSections.has("reviewTask") ? (
                <ChevronDown size={16} className="text-[#999]" />
              ) : (
                <ChevronRight size={16} className="text-[#999]" />
              )}
            </div>
            {expandedSections.has("reviewTask") && (
            <div className="p-5">
              {/* Question selector - single row, synced with upper selected questions */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[13px] text-[#666] flex-shrink-0">复核题目：</span>
                <div className="flex items-center gap-2">
                  {ownedQuestions.map((qId) => {
                    const q = allQuestions.find((item) => item.id === qId);
                    const checked = reviewQuestionIds.has(qId);
                    return (
                      <label
                        key={qId}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[12px] cursor-pointer transition-all select-none ${
                          checked
                            ? "border-[#1890ff] bg-[#e6f7ff] text-[#1890ff]"
                            : "border-[#d9d9d9] bg-white text-[#666] hover:border-[#91d5ff]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setReviewQuestionIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(qId)) next.delete(qId);
                              else next.add(qId);
                              return next;
                            });
                          }}
                          className="accent-[#1890ff]"
                        />
                        {q?.label ?? qId}
                      </label>
                    );
                  })}
                </div>
                <span className="text-[12px] text-[#999] flex-shrink-0">
                  已选 {reviewQuestionIds.size}/{ownedQuestions.length}
                </span>
              </div>

              {/* Review mode selection */}
              <div className="flex gap-3 mb-4">
                <label
                  className={`flex-1 flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                    reviewMode === "machineOnly"
                      ? "border-[#1890ff] bg-[#e6f7ff]"
                      : "border-[#e8e8e8] hover:border-[#91d5ff] bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="reviewMode"
                    checked={reviewMode === "machineOnly"}
                    onChange={() => setReviewMode("machineOnly")}
                    className="accent-[#1890ff] mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>只复核机器分</span>
                    <p className="text-[12px] text-[#666] mt-1 leading-[18px]">
                      按比例抽取AI打分的试卷，由教师抽检复核。
                    </p>
                  </div>
                </label>
                <label
                  className={`flex-1 flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                    reviewMode === "comparison"
                      ? "border-[#1890ff] bg-[#e6f7ff]"
                      : "border-[#e8e8e8] hover:border-[#91d5ff] bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="reviewMode"
                    checked={reviewMode === "comparison"}
                    onChange={() => setReviewMode("comparison")}
                    className="accent-[#1890ff] mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] text-[#333]" style={{ fontWeight: 500 }}>人机分数对比</span>
                    <p className="text-[12px] text-[#666] mt-1 leading-[18px]">
                      筛选人工与AI评分差值较大的试卷，由教师重点复核。
                    </p>
                  </div>
                </label>
              </div>

              {/* Mode-specific settings */}
              <div className="border border-[#f0f0f0] rounded-lg p-4 mb-4 bg-[#fafafa]">
                {reviewMode === "machineOnly" ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-[#666]">抽检比例：</span>
                        <input
                          type="text"
                          value={reviewRatio}
                          onChange={(e) => setReviewRatio(e.target.value)}
                          className="w-[50px] border border-[#d9d9d9] rounded px-2 py-1 text-[13px] text-center outline-none focus:border-[#1890ff] transition-colors bg-white"
                        />
                        <span className="text-[12px] text-[#999]">%</span>
                      </div>
                      <span className="text-[12px] text-[#999]">
                        系统将自动按分数段分层抽样，优先抽取高分段和低分段试卷
                      </span>
                    </div>
                    <button
                      onClick={generateReviewTask}
                      className="flex items-center gap-1 px-3 py-1.5 rounded text-[12px] transition-colors flex-shrink-0 ml-4 bg-[#1890ff] text-white hover:bg-[#40a9ff]"
                    >
                      <Plus size={12} />
                      生成任务
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[#666]">分差阈值：</span>
                          <input
                            type="text"
                            value={scoreDiffThreshold}
                            onChange={(e) => setScoreDiffThreshold(e.target.value)}
                            className="w-[50px] border border-[#d9d9d9] rounded px-2 py-1 text-[13px] text-center outline-none focus:border-[#1890ff] transition-colors bg-white"
                          />
                          <span className="text-[12px] text-[#999]">分</span>
                        </div>
                        <span className="text-[12px] text-[#999]">
                          人工评分与AI评分差值 ≥ {scoreDiffThreshold} 分的试卷将被纳入复核
                        </span>
                      </div>
                      <button
                        onClick={generateReviewTask}
                        className="flex items-center gap-1 px-3 py-1.5 rounded text-[12px] transition-colors flex-shrink-0 ml-4 bg-[#1890ff] text-white hover:bg-[#40a9ff]"
                      >
                        <Plus size={12} />
                        生成任务
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="text-[#666]">总试卷数：</span>
                        <span className="text-[#333]" style={{ fontWeight: 500 }}>400份</span>
                      </div>
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="text-[#666]">超阈值试卷：</span>
                        <span className="text-[#fa8c16]" style={{ fontWeight: 500 }}>
                          {scoreDiffThreshold === "1" ? "52" : scoreDiffThreshold === "2" ? "28" : scoreDiffThreshold === "3" ? "12" : "8"}份
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="text-[#666]">占比：</span>
                        <span className="text-[#333]">
                          {scoreDiffThreshold === "1" ? "13%" : scoreDiffThreshold === "2" ? "7%" : scoreDiffThreshold === "3" ? "3%" : "2%"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Task Table */}
              {reviewMode === "machineOnly" ? (
                <div className="border border-[#f0f0f0] rounded overflow-hidden">
                  <div
                    className="grid bg-[#fafafa] text-[12px] text-[#666] border-b border-[#f0f0f0]"
                    style={{ gridTemplateColumns: "60px 1fr 80px 100px 100px 80px" }}
                  >
                    <div className="px-3 py-2 text-center">序号</div>
                    <div className="px-3 py-2">任务名称</div>
                    <div className="px-3 py-2 text-center">试卷数</div>
                    <div className="px-3 py-2">分配教师</div>
                    <div className="px-3 py-2">状态</div>
                    <div className="px-3 py-2">操作</div>
                  </div>
                  {samplingTasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className="grid text-[12px] border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fafafa]"
                      style={{ gridTemplateColumns: "60px 1fr 80px 100px 100px 80px" }}
                    >
                      <div className="px-3 py-2.5 text-center text-[#999]">{idx + 1}</div>
                      <div className="px-3 py-2.5 text-[#333]">{task.name}</div>
                      <div className="px-3 py-2.5 text-center text-[#333]">{task.count}</div>
                      <div className="px-3 py-2.5">
                        {task.assignee === "未分配" ? (
                          <span className="text-[#fa8c16]">{task.assignee}</span>
                        ) : (
                          <span className="text-[#333]">{task.assignee}</span>
                        )}
                      </div>
                      <div className="px-3 py-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            task.status === "已完成"
                              ? "bg-[#f6ffed] text-[#52c41a]"
                              : task.status === "进行中"
                              ? "bg-[#e6f7ff] text-[#1890ff]"
                              : "bg-[#f5f5f5] text-[#999]"
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                      <div className="px-3 py-2.5">
                        <span className="text-[#1890ff] cursor-pointer hover:text-[#40a9ff]">
                          {task.status === "未开始" ? "分配" : "查看"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-[#f0f0f0] rounded overflow-hidden">
                  <div
                    className="grid bg-[#fafafa] text-[12px] text-[#666] border-b border-[#f0f0f0]"
                    style={{ gridTemplateColumns: "60px 1fr 100px 80px 100px 100px 80px" }}
                  >
                    <div className="px-3 py-2 text-center">序号</div>
                    <div className="px-3 py-2">任务名称</div>
                    <div className="px-3 py-2 text-center">分差范围</div>
                    <div className="px-3 py-2 text-center">试卷数</div>
                    <div className="px-3 py-2">分配教师</div>
                    <div className="px-3 py-2">状态</div>
                    <div className="px-3 py-2">操作</div>
                  </div>
                  {comparisonTasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className="grid text-[12px] border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fafafa]"
                      style={{ gridTemplateColumns: "60px 1fr 100px 80px 100px 100px 80px" }}
                    >
                      <div className="px-3 py-2.5 text-center text-[#999]">{idx + 1}</div>
                      <div className="px-3 py-2.5 text-[#333]">{task.name}</div>
                      <div className="px-3 py-2.5 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-[#fff7e6] text-[#fa8c16] text-[11px]">
                          {task.diffRange}
                        </span>
                      </div>
                      <div className="px-3 py-2.5 text-center text-[#333]">{task.count}</div>
                      <div className="px-3 py-2.5">
                        {task.assignee === "未分配" ? (
                          <span className="text-[#fa8c16]">{task.assignee}</span>
                        ) : (
                          <span className="text-[#333]">{task.assignee}</span>
                        )}
                      </div>
                      <div className="px-3 py-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            task.status === "已完成"
                              ? "bg-[#f6ffed] text-[#52c41a]"
                              : task.status === "进行中"
                              ? "bg-[#e6f7ff] text-[#1890ff]"
                              : "bg-[#f5f5f5] text-[#999]"
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                      <div className="px-3 py-2.5">
                        <span className="text-[#1890ff] cursor-pointer hover:text-[#40a9ff]">
                          {task.status === "未开始" ? "分配" : "查看"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>

          {/* 2. Teacher Review */}
          <div className="border border-[#e8e8e8] rounded-lg">
            <div
              className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] rounded-t-lg cursor-pointer select-none"
              onClick={() => toggleSection("teacherReview")}
            >
              <div className="flex items-center gap-2">
                <UserCheck size={15} className="text-[#52c41a]" />
                <span className="text-[14px] text-[#333]" style={{ fontWeight: 500 }}>教师处理复核任务</span>
                {!expandedSections.has("teacherReview") && (
                  <span className="text-[12px] text-[#999]">待复核 43 · 进行中 15 · 已完成 28</span>
                )}
              </div>
              {expandedSections.has("teacherReview") ? (
                <ChevronDown size={16} className="text-[#999]" />
              ) : (
                <ChevronRight size={16} className="text-[#999]" />
              )}
            </div>
            {expandedSections.has("teacherReview") && (
            <div className="px-5 py-4">
              <p className="text-[13px] text-[#666] mb-4">
                教师复核AI评阅结果，可调整分数或标记异常。
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="px-4 py-3 rounded-lg bg-[#e6f7ff] border border-[#91d5ff] text-center">
                  <div className="text-[20px] text-[#1890ff]" style={{ fontWeight: 500 }}>43</div>
                  <div className="text-[12px] text-[#666] mt-1">待复核试卷</div>
                </div>
                <div className="px-4 py-3 rounded-lg bg-[#fff7e6] border border-[#ffd591] text-center">
                  <div className="text-[20px] text-[#fa8c16]" style={{ fontWeight: 500 }}>15</div>
                  <div className="text-[12px] text-[#666] mt-1">进行中</div>
                </div>
                <div className="px-4 py-3 rounded-lg bg-[#f6ffed] border border-[#b7eb8f] text-center">
                  <div className="text-[20px] text-[#52c41a]" style={{ fontWeight: 500 }}>28</div>
                  <div className="text-[12px] text-[#666] mt-1">已完成</div>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Complete/Save */}
          <div className="flex justify-between">
            <button
              onClick={() => setActivePhase("grading")}
              className="border border-[#d9d9d9] text-[#666] px-6 py-2 rounded text-[13px] hover:border-[#1890ff] hover:text-[#1890ff] transition-colors"
            >
              上一步
            </button>
            <button
              onClick={() => {
                markPhaseComplete("review");
                if (onNextTab) onNextTab();
              }}
              className="bg-[#1890ff] text-white px-6 py-2 rounded text-[13px] hover:bg-[#40a9ff] transition-colors"
            >
              {isLastTab ? "完成设置" : "保存设置，下一步"}
            </button>
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}