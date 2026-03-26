import { useState, useRef, useCallback } from "react";
import {
  LayoutGrid,
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
  Pencil,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
export interface SubRegion {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type?: "识别" | "排除";
}

export interface QuestionRegion {
  questionId: string;
  subRegions: SubRegion[];
}

export interface RegionQuestion {
  id: string;
  label: string;
  color: string;
}

export interface RegionEditorProps {
  /** Available questions for this editor */
  questions: RegionQuestion[];
  /** Auto-generated regions per question (used when clicking 自动划题) */
  autoRegions: Record<string, SubRegion[]>;
  /** Callback when regions change — parent can optionally track */
  onRegionsChange?: (regions: QuestionRegion[]) => void;
  /** Controlled mode: selected question IDs from parent */
  selectedQuestions?: string[];
  /** Controlled mode: question regions from parent */
  questionRegions?: QuestionRegion[];
  /** Controlled mode: callback when selected questions change */
  onSelectedQuestionsChange?: (ids: string[]) => void;
  /** Controlled mode: callback when question regions change */
  onQuestionRegionsChange?: (regions: QuestionRegion[]) => void;
  /** Hide the question chip selector (parent manages selection) */
  hideQuestionSelector?: boolean;
}

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
        const maxW = bounds.width - 16;
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
            onUpdate(region.id, { x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) });
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

  const isExclude = region.type === "排除";

  return (
    <div
      className="absolute select-none"
      style={{
        left: `${region.x}px`,
        top: `${region.y}px`,
        width: `${region.w}px`,
        height: `${region.h}px`,
        backgroundColor: region.color + "15",
        border: `1.5px ${isExclude ? "dashed" : "solid"} ${region.color}`,
        borderRadius: "3px",
        boxShadow: `0 0 0 1px ${region.color}40`,
        zIndex: isExclude ? 11 : 10,
        cursor: "move",
      }}
      onMouseDown={(e) => handleMouseDown(e, "move")}
    >
      {isExclude && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`stripes-${region.id}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke={region.color} strokeWidth="2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#stripes-${region.id})`} />
        </svg>
      )}
      <div
        className="absolute -top-[16px] left-0 text-[10px] px-1 rounded-t whitespace-nowrap pointer-events-none"
        style={{ backgroundColor: region.color, color: "#fff" }}
      >
        {region.label}
      </div>
      <div
        className="absolute -left-[4px] -top-[4px] w-[8px] h-[8px] rounded-full cursor-nw-resize"
        style={{ backgroundColor: region.color }}
        onMouseDown={(e) => handleMouseDown(e, "resize-nw")}
      />
      <div
        className="absolute -right-[4px] -bottom-[4px] w-[8px] h-[8px] rounded-full cursor-se-resize"
        style={{ backgroundColor: region.color }}
        onMouseDown={(e) => handleMouseDown(e, "resize-se")}
      />
    </div>
  );
}

// ─── Main RegionEditor Component ─────────────────────────────────────
export function RegionEditor({ questions, autoRegions, onRegionsChange, selectedQuestions: extSelectedQuestions, questionRegions: extQuestionRegions, onSelectedQuestionsChange, onQuestionRegionsChange, hideQuestionSelector }: RegionEditorProps) {
  // Internal state (uncontrolled fallback)
  const [intSelectedQuestions, setIntSelectedQuestions] = useState<string[]>([]);
  const [intQuestionRegions, setIntQuestionRegions] = useState<QuestionRegion[]>([]);
  const [activeRegionQuestion, setActiveRegionQuestion] = useState<string | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Determine if controlled
  const isControlled = extSelectedQuestions !== undefined && extQuestionRegions !== undefined;
  const selectedQuestions = isControlled ? extSelectedQuestions : intSelectedQuestions;
  const questionRegions = isControlled
    ? extQuestionRegions.filter((qr) => questions.some((q) => q.id === qr.questionId))
    : intQuestionRegions;

  const getColor = (id: string) => questions.find((q) => q.id === id)?.color ?? "#1890ff";
  const getLabel = (id: string) => questions.find((q) => q.id === id)?.label ?? id;

  // Update helpers — delegate to parent if controlled, else internal
  const updateSelected = (next: string[]) => {
    if (isControlled) {
      onSelectedQuestionsChange?.(next);
    } else {
      setIntSelectedQuestions(next);
    }
  };
  const updateRegions = (next: QuestionRegion[]) => {
    if (isControlled) {
      onQuestionRegionsChange?.(next);
    } else {
      setIntQuestionRegions(next);
    }
    onRegionsChange?.(next);
  };

  const toggleQuestion = (id: string) => {
    if (selectedQuestions.includes(id)) {
      const nextRegions = questionRegions.filter((r) => r.questionId !== id);
      updateRegions(nextRegions);
      if (activeRegionQuestion === id) setActiveRegionQuestion(null);
      updateSelected(selectedQuestions.filter((q) => q !== id));
    } else {
      const nextRegions = [...questionRegions, { questionId: id, subRegions: [] }];
      updateRegions(nextRegions);
      updateSelected([...selectedQuestions, id]);
    }
  };

  const computeTemplate = () => {
    const allIds = questions.map((q) => q.id);
    updateSelected(allIds);
    const newRegions = allIds.map((id) => {
      // Preserve existing regions for this question if already set
      const existing = questionRegions.find((qr) => qr.questionId === id);
      return existing || { questionId: id, subRegions: autoRegions[id] || [] };
    });
    updateRegions(newRegions);
    setActiveRegionQuestion(allIds[0]);
  };

  const addSubRegion = (questionId: string) => {
    const next = questionRegions.map((qr) => {
      if (qr.questionId !== questionId) return qr;
      const recRegions = qr.subRegions.filter((sr) => sr.type !== "排除");
      const idx = recRegions.length + 1;
      const baseX = 32 + ((idx - 1) % 5) * 108;
      const baseY = 20 + Math.floor((idx - 1) / 5) * 40;
      return {
        ...qr,
        subRegions: [
          ...qr.subRegions,
          { id: `${questionId}-m-${Date.now()}`, label: `区域${idx}`, x: baseX, y: baseY, w: 96, h: 26, type: "识别" as const },
        ],
      };
    });
    updateRegions(next);
  };

  const addExcludeRegion = (questionId: string) => {
    const next = questionRegions.map((qr) => {
      if (qr.questionId !== questionId) return qr;
      const exRegions = qr.subRegions.filter((sr) => sr.type === "排除");
      const idx = exRegions.length + 1;
      return {
        ...qr,
        subRegions: [
          ...qr.subRegions,
          { id: `${questionId}-ex-${Date.now()}`, label: `排除${idx}`, x: 32, y: 100 + (idx - 1) * 40, w: 120, h: 30, type: "排除" as const },
        ],
      };
    });
    updateRegions(next);
  };

  const removeSubRegion = (questionId: string, regionId: string) => {
    const next = questionRegions.map((qr) => {
      if (qr.questionId !== questionId) return qr;
      return { ...qr, subRegions: qr.subRegions.filter((sr) => sr.id !== regionId) };
    });
    updateRegions(next);
  };

  const renameSubRegion = (questionId: string, regionId: string, newLabel: string) => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    const next = questionRegions.map((qr) => {
      if (qr.questionId !== questionId) return qr;
      return {
        ...qr,
        subRegions: qr.subRegions.map((sr) => (sr.id === regionId ? { ...sr, label: trimmed } : sr)),
      };
    });
    updateRegions(next);
  };

  const startEditing = (regionId: string, currentLabel: string) => {
    setEditingRegionId(regionId);
    setEditingLabelValue(currentLabel);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const commitEdit = (questionId: string) => {
    if (editingRegionId) {
      renameSubRegion(questionId, editingRegionId, editingLabelValue);
      setEditingRegionId(null);
    }
  };

  const handleRegionUpdate = useCallback(
    (regionId: string, patch: Partial<SubRegion>) => {
      if (!activeRegionQuestion) return;
      const next = questionRegions.map((qr) => {
        if (qr.questionId !== activeRegionQuestion) return qr;
        return {
          ...qr,
          subRegions: qr.subRegions.map((sr) => (sr.id === regionId ? { ...sr, ...patch } : sr)),
        };
      });
      updateRegions(next);
    },
    [activeRegionQuestion, questionRegions, isControlled]
  );

  const activeQR = questionRegions.find((qr) => qr.questionId === activeRegionQuestion);
  const previewRegions = activeQR
    ? activeQR.subRegions.map((sr) => ({
        ...sr,
        color: sr.type === "排除" ? "#fa8c16" : getColor(activeQR.questionId),
      }))
    : [];

  const totalSubCount = questionRegions
    .filter((qr) => selectedQuestions.includes(qr.questionId))
    .reduce((sum, qr) => sum + qr.subRegions.length, 0);

  return (
    <div>
      {/* Question selector + auto button */}
      <div className="flex items-center gap-3 mb-4 text-[14px]">
        <button
          onClick={computeTemplate}
          className="bg-[#1890ff] text-white px-4 py-1 rounded text-[13px] hover:bg-[#40a9ff] transition-colors flex items-center gap-1.5"
        >
          <Zap size={13} />
          自动划题
        </button>
        <span className="text-[#999] text-[13px]">
          点击「自动划题」自动识别，或手动勾选题目后添加识别区域
        </span>
      </div>

      {/* Question chips */}
      {questions.length > 1 && !hideQuestionSelector && (
        <div className="flex gap-2 flex-wrap mb-4">
          {questions.map((q) => {
            const sel = selectedQuestions.includes(q.id);
            return (
              <button
                key={q.id}
                className={`relative h-[30px] rounded text-[12px] border transition-all px-2.5 flex items-center ${
                  sel ? "text-white" : "bg-white text-[#666] border-[#d9d9d9] hover:border-[#1890ff]"
                }`}
                style={{
                  backgroundColor: sel ? q.color : undefined,
                  borderColor: sel ? q.color : undefined,
                }}
                onClick={() => toggleQuestion(q.id)}
              >
                {q.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Two-panel layout */}
      <div className="flex gap-4">
        {/* Left: Region list */}
        <div className="w-[360px] flex-shrink-0 border border-[#e8e8e8] rounded-lg overflow-hidden">
          <div className="bg-[#fafafa] px-4 py-2.5 text-[13px] text-[#666] border-b border-[#e8e8e8] flex items-center justify-between">
            <span>题目 / 识别区域</span>
            <span>共 {totalSubCount} 个区域</span>
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {selectedQuestions.length === 0 ? (
              <div className="px-4 py-8 text-center text-[13px] text-[#999]">
                {questions.length > 1 ? "请先在上方勾选需要设置的题目" : "请点击「自动划题」生成识别区域"}
              </div>
            ) : (
              questionRegions
                .filter((qr) => selectedQuestions.includes(qr.questionId))
                .sort(
                  (a, b) =>
                    questions.findIndex((q) => q.id === a.questionId) -
                    questions.findIndex((q) => q.id === b.questionId)
                )
                .map((qr) => {
                  const color = getColor(qr.questionId);
                  const isActive = activeRegionQuestion === qr.questionId;
                  const qInfo = questions.find((q) => q.id === qr.questionId);
                  if (!qInfo) return null;
                  return (
                    <div key={qr.questionId}>
                      <div
                        className={`flex items-center justify-between px-4 py-2.5 cursor-pointer border-b border-[#f0f0f0] transition-colors ${
                          isActive ? "bg-[#e6f7ff]" : "hover:bg-[#fafafa]"
                        }`}
                        onClick={() => setActiveRegionQuestion(isActive ? null : qr.questionId)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: color }} />
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
                            onClick={(e) => { e.stopPropagation(); addSubRegion(qr.questionId); }}
                            className="text-[#1890ff] hover:text-[#40a9ff] transition-colors flex items-center gap-0.5 text-[12px]"
                          >
                            <Plus size={12} />
                            识别
                          </button>
                          <span className="text-[#e8e8e8] text-[12px]">|</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); addExcludeRegion(qr.questionId); }}
                            className="text-[#fa8c16] hover:text-[#ffa940] transition-colors flex items-center gap-0.5 text-[12px]"
                          >
                            <Ban size={11} />
                            排除
                          </button>
                        </div>
                      </div>

                      {isActive &&
                        qr.subRegions.map((sr) => {
                          const isEx = sr.type === "排除";
                          const itemColor = isEx ? "#fa8c16" : color;
                          return (
                            <div
                              key={sr.id}
                              className={`flex items-center justify-between px-4 py-2 pl-8 border-b border-[#f0f0f0] group ${
                                isEx ? "bg-[#fff7e6]/50" : "bg-[#fafbfc]"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <GripVertical size={12} className="text-[#ccc]" />
                                <div
                                  className="w-[10px] h-[10px] rounded-sm border"
                                  style={{
                                    borderColor: itemColor,
                                    backgroundColor: itemColor + "20",
                                    ...(isEx ? { borderStyle: "dashed" } : {}),
                                  }}
                                />
                                {editingRegionId === sr.id ? (
                                  <input
                                    ref={editInputRef}
                                    value={editingLabelValue}
                                    onChange={(e) => setEditingLabelValue(e.target.value)}
                                    onBlur={() => commitEdit(qr.questionId)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") commitEdit(qr.questionId);
                                      if (e.key === "Escape") setEditingRegionId(null);
                                    }}
                                    className="text-[12px] text-[#333] border border-[#1890ff] rounded px-1 py-px outline-none bg-white w-[80px]"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <span
                                    className="text-[12px] text-[#555] cursor-pointer hover:text-[#1890ff] transition-colors inline-flex items-center gap-1 group/label"
                                    onClick={(e) => { e.stopPropagation(); startEditing(sr.id, sr.label); }}
                                    title="点击重命名"
                                  >
                                    {sr.label}
                                    <Pencil size={10} className="text-[#ccc] opacity-0 group-hover/label:opacity-100 transition-opacity" />
                                  </span>
                                )}
                                {isEx && (
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

        {/* Right: Visual preview with drag/resize */}
        <div className="flex-1 border border-[#e8e8e8] rounded-lg overflow-hidden">
          <div className="bg-[#fafafa] px-4 py-2.5 text-[13px] text-[#666] border-b border-[#e8e8e8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Move size={13} className="text-[#999]" />
              <span>识别区域预览</span>
              {activeRegionQuestion && (
                <span
                  className="text-[11px] px-1.5 py-px rounded text-white ml-1"
                  style={{ backgroundColor: getColor(activeRegionQuestion) }}
                >
                  {getLabel(activeRegionQuestion)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPreviewRotation((r) => r - 90)}
                className="p-1 rounded hover:bg-[#e8e8e8] transition-colors text-[#666] hover:text-[#333]"
                title="向左旋转90°"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setPreviewRotation((r) => r + 90)}
                className="p-1 rounded hover:bg-[#e8e8e8] transition-colors text-[#666] hover:text-[#333]"
                title="向右旋转90°"
              >
                <RotateCw size={14} />
              </button>
              <div className="w-px h-[14px] bg-[#d9d9d9] mx-1" />
              <button
                onClick={() => setPreviewZoom((z) => Math.max(0.25, z - 0.25))}
                className="p-1 rounded hover:bg-[#e8e8e8] transition-colors text-[#666] hover:text-[#333]"
                title="缩小"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[12px] text-[#666] w-[40px] text-center tabular-nums">
                {Math.round(previewZoom * 100)}%
              </span>
              <button
                onClick={() => setPreviewZoom((z) => Math.min(3, z + 0.25))}
                className="p-1 rounded hover:bg-[#e8e8e8] transition-colors text-[#666] hover:text-[#333]"
                title="放大"
              >
                <ZoomIn size={14} />
              </button>
              <div className="w-px h-[14px] bg-[#d9d9d9] mx-1" />
              <button
                onClick={() => { setPreviewZoom(1); setPreviewRotation(0); }}
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
                transform: `scale(${previewZoom}) rotate(${previewRotation}deg)`,
              }}
            >
              {/* Background grid */}
              <div className="absolute inset-0 p-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={`hl-${i}`}
                    className="absolute left-2 right-2 border-b border-dashed"
                    style={{ top: `${20 + i * 36}px`, borderColor: i % 3 === 0 ? "#ddd" : "#eee" }}
                  />
                ))}
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={`vl-${i}`}
                    className="absolute top-2 bottom-2 border-l border-dashed"
                    style={{ left: `${i * 100}px`, borderColor: "#eee" }}
                  />
                ))}
              </div>

              {/* Draggable overlays */}
              <div className="absolute inset-0">
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
                      ? "点击「自动划题」或勾选题目后查看识别区域"
                      : "点击左侧题目查看对应识别区域"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}