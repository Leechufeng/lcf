import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Save, Plus, Trash2, Edit2, CheckCircle2 } from 'lucide-react';

interface AIGradingProps {
  onBack: () => void;
}

export function AIGrading({ onBack }: AIGradingProps) {
  const [activeQuestion, setActiveQuestion] = useState(4);
  const [standardAnswer, setStandardAnswer] = useState("这是标准答案的示例文本。");
  const [points, setPoints] = useState([
    { id: 1, text: "提到了核心概念A", score: 2, keywords: "概念A, 核心" },
    { id: 2, text: "解释了原因B", score: 3, keywords: "原因B, 因为, 所以" }
  ]);

  return (
    <div className="p-6 flex gap-4 h-[calc(100vh-140px)]">
      {/* Left Sidebar - Question List */}
      <div className="w-64 bg-white rounded-lg shadow-sm border border-[#e8e8e8] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#e8e8e8] bg-[#fafafa]">
          <h3 className="font-medium text-[#333]">题目列表</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {[
            { id: 4, name: "简答题31", score: 10, status: "已设置" },
            { id: 5, name: "论述题32", score: 15, status: "未设置" },
            { id: 6, name: "作文题34", score: 25, status: "未设置" },
          ].map(q => (
            <div 
              key={q.id}
              onClick={() => setActiveQuestion(q.id)}
              className={`p-3 mb-2 rounded cursor-pointer border transition-colors ${
                activeQuestion === q.id 
                  ? "bg-[#e6f7ff] border-[#1890ff]" 
                  : "bg-white border-transparent hover:bg-[#f5f5f5]"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`font-medium ${activeQuestion === q.id ? "text-[#1890ff]" : "text-[#333]"}`}>
                  {q.name}
                </span>
                <span className="text-[12px] text-[#999]">{q.score}分</span>
              </div>
              <div className="flex items-center gap-1 text-[12px]">
                {q.status === "已设置" ? (
                  <><CheckCircle2 size={12} className="text-[#52c41a]" /><span className="text-[#52c41a]">{q.status}</span></>
                ) : (
                  <span className="text-[#999]">{q.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-[#e8e8e8] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-[60px] px-6 border-b border-[#e8e8e8] flex items-center justify-between bg-[#fafafa]">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="flex items-center gap-1 text-[#666] hover:text-[#1890ff] transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="text-[14px]">返回</span>
            </button>
            <div className="h-4 w-[1px] bg-[#d9d9d9]"></div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#1890ff]" />
              <h2 className="text-[16px] font-medium text-[#333]">简答题31 - AI 智能阅卷设置</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="px-4 py-1.5 border border-[#d9d9d9] rounded text-[14px] text-[#333] hover:text-[#1890ff] hover:border-[#1890ff] transition-colors">
              AI 试评
            </button>
            <button className="flex items-center gap-1.5 bg-[#1890ff] text-white px-4 py-1.5 rounded text-[14px] hover:bg-[#40a9ff] transition-colors">
              <Save size={14} />
              <span>保存设置</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Standard Answer */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-medium text-[#333] flex items-center gap-2">
                  <div className="w-1 h-4 bg-[#1890ff] rounded-full"></div>
                  标准答案
                </h3>
              </div>
              <textarea 
                value={standardAnswer}
                onChange={(e) => setStandardAnswer(e.target.value)}
                className="w-full h-32 p-3 border border-[#d9d9d9] rounded-lg focus:outline-none focus:border-[#1890ff] focus:ring-2 focus:ring-[#1890ff]/20 resize-none text-[14px] text-[#333]"
                placeholder="请输入标准答案..."
              />
            </div>

            {/* Grading Points */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-medium text-[#333] flex items-center gap-2">
                  <div className="w-1 h-4 bg-[#1890ff] rounded-full"></div>
                  给分点设置
                </h3>
                <button 
                  onClick={() => setPoints([...points, { id: Date.now(), text: "", score: 0, keywords: "" }])}
                  className="flex items-center gap-1 text-[#1890ff] text-[13px] hover:text-[#40a9ff]"
                >
                  <Plus size={14} />
                  <span>添加给分点</span>
                </button>
              </div>
              
              <div className="border border-[#e8e8e8] rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 bg-[#fafafa] border-b border-[#e8e8e8] text-[13px] text-[#666] py-2 px-4">
                  <div className="col-span-1">序号</div>
                  <div className="col-span-5">给分点描述</div>
                  <div className="col-span-3">核心关键词</div>
                  <div className="col-span-2">分值</div>
                  <div className="col-span-1 text-right">操作</div>
                </div>
                
                {points.map((point, index) => (
                  <div key={point.id} className="grid grid-cols-12 items-center border-b border-[#e8e8e8] last:border-0 text-[13px] text-[#333] py-3 px-4 hover:bg-[#fafafa]">
                    <div className="col-span-1">{index + 1}</div>
                    <div className="col-span-5 pr-4">
                      <input 
                        type="text" 
                        value={point.text}
                        placeholder="例如：提到了xxx"
                        className="w-full border border-[#d9d9d9] rounded px-2 py-1.5 focus:border-[#1890ff] outline-none transition-colors"
                        onChange={(e) => {
                          const newPoints = [...points];
                          newPoints[index].text = e.target.value;
                          setPoints(newPoints);
                        }}
                      />
                    </div>
                    <div className="col-span-3 pr-4">
                      <input 
                        type="text" 
                        value={point.keywords}
                        placeholder="关键词1, 关键词2"
                        className="w-full border border-[#d9d9d9] rounded px-2 py-1.5 focus:border-[#1890ff] outline-none transition-colors"
                        onChange={(e) => {
                          const newPoints = [...points];
                          newPoints[index].keywords = e.target.value;
                          setPoints(newPoints);
                        }}
                      />
                    </div>
                    <div className="col-span-2 pr-4">
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          value={point.score}
                          className="w-16 border border-[#d9d9d9] rounded px-2 py-1.5 focus:border-[#1890ff] outline-none transition-colors"
                          onChange={(e) => {
                            const newPoints = [...points];
                            newPoints[index].score = Number(e.target.value);
                            setPoints(newPoints);
                          }}
                        />
                        <span className="text-[#666]">分</span>
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end gap-2 text-[#999]">
                      <button 
                        onClick={() => setPoints(points.filter(p => p.id !== point.id))}
                        className="hover:text-[#ff4d4f] transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {points.length === 0 && (
                  <div className="py-8 text-center text-[#999] text-[13px]">
                    暂无给分点，请点击右上角添加
                  </div>
                )}
              </div>
            </div>

            {/* AI Prompt / Requirements */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-medium text-[#333] flex items-center gap-2">
                  <div className="w-1 h-4 bg-[#1890ff] rounded-full"></div>
                  AI 阅卷要求 (Prompt)
                </h3>
              </div>
              <textarea 
                className="w-full h-24 p-3 border border-[#d9d9d9] rounded-lg focus:outline-none focus:border-[#1890ff] focus:ring-2 focus:ring-[#1890ff]/20 resize-none text-[14px] text-[#333]"
                placeholder="例如：请严格按照给分点进行评分，如果学生提到了同义词也可以给分..."
                defaultValue="请严格按照给分点进行评分，如果学生提到了同义词也可以给分。注意错别字不扣分。"
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
