import { useState } from "react";
import {
  Navigation,
  Compass,
  FileText,
  BarChart3,
  BookOpen,
  TrendingUp,
  Database,
  GraduationCap,
  Users,
  Settings,
  X,
  Download,
  Upload,
  Save,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { AIGrading } from "./components/ai-grading";

const navItems = [
  { icon: Compass, label: "驾驶舱", active: false },
  { icon: FileText, label: "阅卷", active: true },
  { icon: BarChart3, label: "分析", active: false },
  { icon: BookOpen, label: "学情", active: false },
  { icon: TrendingUp, label: "增值", active: false },
  { icon: Database, label: "题库", active: false },
  { icon: GraduationCap, label: "教学", active: false },
  { icon: Users, label: "组织", active: false },
];

const tableData = [
  { id: 1, questionNo: 1, questionName: "填空题1-10", score: 4, review: "单评", error: 4, points: "3个" },
  { id: 2, questionNo: 2, questionName: "填空题11-20", score: 4, review: "比例双评（40% | 60%）", error: 4, points: "未设置" },
  { id: 3, questionNo: 3, questionName: "填空题21-30", score: 4, review: "单评", error: 4, points: "3个" },
  { id: 4, questionNo: 4, questionName: "简答题31", score: 10, review: "比例双评（40% | 60%）", error: 4, points: "未设置" },
  { id: 5, questionNo: 5, questionName: "论述题32", score: 15, review: "比例双评（40% | 60%）", error: 4, points: "未设置" },
  { id: 6, questionNo: 6, questionName: "作文题34", score: 25, review: "单评", error: 4, points: "3个" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("主观题设置");
  const [showAIGrading, setShowAIGrading] = useState(false);
  const [rows, setRows] = useState(tableData);

  const updateQuestionName = (id: number, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, questionName: value } : r));
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]" style={{ fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif" }}>
      {/* Top Navigation */}
      <header className="bg-white h-[48px] flex items-center px-4 shadow-sm relative z-10">
        <div className="flex items-center gap-2 mr-8">
          <div className="w-[28px] h-[28px] bg-[#1890ff] rounded flex items-center justify-center">
            <FileText size={16} className="text-white" />
          </div>
          <span className="text-[14px] text-[#333] whitespace-nowrap" style={{ fontWeight: 500 }}>智能评卷系统</span>
        </div>

        <nav className="flex items-center gap-1 flex-1">
          {navItems.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded cursor-pointer text-[14px] ${
                item.active
                  ? "bg-[#1890ff] text-white"
                  : "text-[#666] hover:bg-[#f5f5f5]"
              }`}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-4 text-[13px] text-[#666]">
          <span>深圳市教育局 地区管理员</span>
          <div className="flex items-center gap-2">
            <div className="w-[28px] h-[28px] rounded-full bg-[#1890ff] flex items-center justify-center text-white text-[12px]">
              徐
            </div>
            <span className="text-[#333]">徐小川</span>
          </div>
          <div className="flex items-center gap-1 cursor-pointer">
            <Settings size={14} />
            <span>设置</span>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#e8e8e8] h-[36px] flex items-center px-6 text-[13px]">
        <span className="text-[#1890ff] cursor-pointer">首页</span>
        <span className="mx-3 text-[#d9d9d9]">|</span>
        <span className="text-[#666] cursor-pointer">二级菜单</span>
        <div className="flex items-center gap-1.5 ml-6 bg-[#f5f5f5] px-3 py-0.5 rounded text-[#666]">
          <span>阅卷</span>
          <X size={12} className="cursor-pointer text-[#999]" />
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="bg-white border-b border-[#e8e8e8] px-6">
        <div className="flex gap-6 text-[14px]">
          {["客观题标答", "主观题设置", "评卷教师设置"].map((tab) => (
            <div
              key={tab}
              className={`py-3 cursor-pointer relative ${
                tab === activeTab
                  ? "text-[#333]"
                  : "text-[#666]"
              }`}
              style={{ fontWeight: tab === activeTab ? 500 : 400 }}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === activeTab && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1890ff]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {showAIGrading ? (
        <AIGrading onBack={() => setShowAIGrading(false)} />
      ) : (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Exam Info */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="w-[56px] h-[56px] bg-[#e6f4ff] rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText size={28} className="text-[#1890ff]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[15px] text-[#333]" style={{ fontWeight: 500 }}>初二</span>
                  <span className="text-[#d9d9d9]">|</span>
                  <span className="text-[15px] text-[#333]" style={{ fontWeight: 500 }}>2024-2025学年第二学期八年级期中质量监测</span>
                  <span className="bg-[#1890ff] text-white text-[12px] px-2.5 py-0.5 rounded">语文</span>
                </div>
                <div className="text-[13px] text-[#666]">
                  该科试卷共有 <span className="text-[#1890ff]">17</span> 道题目：客观题 <span className="text-[#1890ff]">7</span> 题，共 <span className="text-[#1890ff]">30</span> 分，主观题 <span className="text-[#1890ff]">10</span> 题，共 <span className="text-[#1890ff]">70</span> 分；总分值 <span className="text-[#1890ff]">100</span> 分。
                </div>
              </div>
            </div>
            <button
              className="flex items-center gap-1.5 bg-[#1890ff] text-white px-5 py-2 rounded text-[13px] hover:bg-[#40a9ff] transition-colors"
              onClick={() => setShowAIGrading(true)}
            >
              <Sparkles size={14} />
              <span>AI 智能阅卷设置</span>
            </button>
          </div>

          {/* Table Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[15px] text-[#333]" style={{ fontWeight: 500 }}>主观题评卷设置</span>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1.5 border border-[#1890ff] text-[#1890ff] px-3 py-1.5 rounded text-[13px] hover:bg-[#e6f7ff] transition-colors bg-white">
                  <PlusCircle size={14} />
                  <span>批量设置分数</span>
                </button>
                <button className="flex items-center gap-1.5 border border-[#1890ff] text-[#1890ff] px-3 py-1.5 rounded text-[13px] hover:bg-[#e6f7ff] transition-colors bg-white">
                  <FileText size={14} />
                  <span>批量设标答</span>
                </button>
                <button className="flex items-center gap-1.5 border border-[#1890ff] text-[#1890ff] px-3 py-1.5 rounded text-[13px] hover:bg-[#e6f7ff] transition-colors bg-white">
                  <Upload size={14} />
                  <span>导入导出</span>
                </button>
                <button className="flex items-center gap-1.5 bg-[#1890ff] text-white px-4 py-1.5 rounded text-[13px] hover:bg-[#40a9ff] transition-colors">
                  <Save size={14} />
                  <span>保存</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="border border-[#e8e8e8] rounded overflow-hidden">
              {/* Table Header */}
              <div className="grid bg-[#fafafa] text-[13px] text-[#666] border-b border-[#e8e8e8]" style={{ gridTemplateColumns: "0.6fr 1.2fr 0.7fr 1fr 2fr 0.8fr 1fr 1.2fr" }}>
                <div className="px-4 py-3 text-left">题号</div>
                <div className="px-4 py-3 text-left">题目</div>
                <div className="px-4 py-3 text-left">满分</div>
                <div className="px-4 py-3 text-left">画块</div>
                <div className="px-4 py-3 text-left">单双评</div>
                <div className="px-4 py-3 text-left">仲裁误差</div>
                <div className="px-4 py-3 text-left">给点分设置</div>
                <div className="px-4 py-3 text-left">操作</div>
              </div>

              {/* Table Rows */}
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="grid text-[13px] text-[#333] border-b border-[#e8e8e8] last:border-b-0 hover:bg-[#fafafa]"
                  style={{ gridTemplateColumns: "0.6fr 1.2fr 0.7fr 1fr 2fr 0.8fr 1fr 1.2fr" }}
                >
                  <div className="px-4 py-3 flex items-center">
                    <div className="border border-[#d9d9d9] rounded px-4 py-1 text-center min-w-[40px] bg-white">{row.questionNo}</div>
                  </div>
                  <div className="px-4 py-3 flex items-center text-[#333]">
                    <input
                      type="text"
                      value={row.questionName}
                      onChange={(e) => updateQuestionName(row.id, e.target.value)}
                      className="border border-[#d9d9d9] rounded px-3 py-1 bg-white w-full outline-none focus:border-[#1890ff] transition-colors"
                    />
                  </div>
                  <div className="px-4 py-3 flex items-center">
                    <div className="border border-[#d9d9d9] rounded px-3 py-1 text-center min-w-[40px] bg-white">{row.score}</div>
                  </div>
                  <div className="px-4 py-3 flex items-center gap-2">
                    <div className="w-[50px] h-[30px] border border-[#d9d9d9] rounded bg-[#fafafa]"></div>
                    <span className="text-[#1890ff] cursor-pointer">编辑</span>
                  </div>
                  <div className="px-4 py-3 flex items-center gap-3">
                    <span className="text-[#1890ff] cursor-pointer flex-shrink-0">设置</span>
                    <span className="text-[#333] whitespace-nowrap">{row.review}</span>
                  </div>
                  <div className="px-4 py-3 flex items-center">
                    <div className="border border-[#d9d9d9] rounded px-3 py-1 text-center min-w-[40px] bg-white">{row.error}</div>
                  </div>
                  <div className="px-4 py-3 flex items-center text-[#666]">
                    {row.points}
                  </div>
                  <div className="px-4 py-3 flex items-center gap-1">
                    <span className="text-[#1890ff] cursor-pointer whitespace-nowrap">高级设置</span>
                    <span className="text-[#d9d9d9]">|</span>
                    <span className="text-[#ff4d4f] cursor-pointer">删除</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}