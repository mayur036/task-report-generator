/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Plus, 
  X, 
  Copy, 
  Check, 
  Calendar as CalendarIcon, 
  Clock, 
  Briefcase, 
  Building2, 
  Home,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ReportData, Task, WorkMode } from './types';
import { refineTasks } from './services/geminiService';

const INITIAL_TASKS: Task[] = [
  { id: crypto.randomUUID(), description: '', time: '' },
  { id: crypto.randomUUID(), description: '', time: '' },
  { id: crypto.randomUUID(), description: '', time: '' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'in' | 'out'>('in');
  const [reportData, setReportData] = useState<ReportData>({
    date: new Date(),
    workMode: 'In Office',
    inTime: '09:00',
    outTime: '18:00',
    projectName: '',
    tasks: [...INITIAL_TASKS],
  });
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset generated report when data changes significantly
  useEffect(() => {
    setGeneratedReport(null);
  }, [activeTab]);

  const handleAddTask = () => {
    setReportData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { id: crypto.randomUUID(), description: '', time: '' }]
    }));
  };

  const handleRemoveTask = (id: string) => {
    if (reportData.tasks.length <= 1) {
      toast.error('At least one task is required');
      return;
    }
    setReportData(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id)
    }));
  };

  const handleTaskChange = (id: string, field: keyof Task, value: string) => {
    setReportData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!reportData.projectName.trim()) newErrors.projectName = 'Project name is required';
    if (!reportData.inTime) newErrors.inTime = 'In time is required';
    if (activeTab === 'out' && !reportData.outTime) newErrors.outTime = 'Out time is required';
    
    const emptyTasks = reportData.tasks.some(t => !t.description.trim() || !t.time.trim());
    if (emptyTasks) newErrors.tasks = 'All task descriptions and times are required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatTime12h = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours);
    const m = minutes;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    return `${h}:${m} ${ampm}`;
  };

  const generateReport = async () => {
    if (!validate()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('Refining task descriptions...');

    try {
      // Refine tasks using Gemini
      const taskDescriptions = reportData.tasks.map(t => t.description);
      const refinedDescriptions = await refineTasks(taskDescriptions, activeTab === 'out');
      
      // Update tasks in state with refined descriptions
      const updatedTasks = reportData.tasks.map((t, i) => ({
        ...t,
        description: refinedDescriptions[i] || t.description
      }));

      setReportData(prev => ({ ...prev, tasks: updatedTasks }));

      const dateStr = format(reportData.date, 'dd/MM/yyyy');
      const inTimeStr = formatTime12h(reportData.inTime);
      const outTimeStr = formatTime12h(reportData.outTime);

      let report = `Today's Task (${dateStr}) :- ${reportData.workMode}\n`;
      report += `In Time :- ${inTimeStr}\n`;
      
      if (activeTab === 'out') {
        report += `Out Time :- ${outTimeStr}\n`;
      }
      
      report += `Project Name: ${reportData.projectName}\n\n`;
      report += activeTab === 'in' ? 'Task List:\n' : 'Tasks Completed:\n';

      updatedTasks.forEach((task, index) => {
        const timeLabel = activeTab === 'in' ? 'ETA' : 'ETA';
        report += `* Task ${index + 1} :- ${task.description} (${timeLabel} :- ${task.time})\n`;
      });

      setGeneratedReport(report);
      toast.success('Report generated and tasks refined!', { id: toastId });
      
      // Scroll to output on mobile
      setTimeout(() => {
        document.getElementById('output-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error("Generation error:", error);
      toast.error('Failed to generate report', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedReport) return;
    navigator.clipboard.writeText(generatedReport);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-center" theme="dark" richColors />
      
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-2">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
              Task Report Generator
            </h1>
            <p className="text-muted-foreground text-lg">
              Generate your daily task format instantly
            </p>
          </motion.div>
        </header>

        {/* Main Card */}
        <Card className="border-border bg-secondary/50 backdrop-blur-sm shadow-2xl glow-focus transition-all duration-300">
          <CardHeader className="pb-4">
            <Tabs 
              value={activeTab} 
              onValueChange={(v) => setActiveTab(v as 'in' | 'out')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-background/50 p-1">
                <TabsTrigger 
                  value="in" 
                  disabled={isGenerating}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  In Time Report
                </TabsTrigger>
                <TabsTrigger 
                  value="out" 
                  disabled={isGenerating}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Out Time Report
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isGenerating}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background border-input hover:bg-muted/50",
                        !reportData.date && "text-muted-foreground"
                      )}
                    >
                      {reportData.date ? format(reportData.date, "dd/MM/yyyy") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border-border" align="start">
                    <Calendar
                      mode="single"
                      selected={reportData.date}
                      onSelect={(date) => date && setReportData(prev => ({ ...prev, date }))}
                      initialFocus
                      className="bg-background"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Work Mode */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  {reportData.workMode === 'In Office' ? <Building2 className="w-4 h-4 text-primary" /> : <Home className="w-4 h-4 text-primary" />}
                  Work Mode
                </Label>
                <Select 
                  value={reportData.workMode} 
                  disabled={isGenerating}
                  onValueChange={(v: WorkMode) => setReportData(prev => ({ ...prev, workMode: v }))}
                >
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="In Office">In Office</SelectItem>
                    <SelectItem value="WFH">WFH</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* In Time */}
              <div className="space-y-2">
                <Label className={cn("text-sm font-medium flex items-center gap-2", errors.inTime && "text-destructive")}>
                  <Clock className="w-4 h-4 text-primary" />
                  In Time
                </Label>
                <Input
                  type="time"
                  disabled={isGenerating}
                  value={reportData.inTime}
                  onChange={(e) => setReportData(prev => ({ ...prev, inTime: e.target.value }))}
                  className={cn("bg-background border-input", errors.inTime && "border-destructive")}
                />
              </div>

              {/* Out Time (Only for Out Time Report) */}
              <AnimatePresence mode="wait">
                {activeTab === 'out' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Label className={cn("text-sm font-medium flex items-center gap-2", errors.outTime && "text-destructive")}>
                      <Clock className="w-4 h-4 text-primary" />
                      Out Time
                    </Label>
                    <Input
                      type="time"
                      disabled={isGenerating}
                      value={reportData.outTime}
                      onChange={(e) => setReportData(prev => ({ ...prev, outTime: e.target.value }))}
                      className={cn("bg-background border-input", errors.outTime && "border-destructive")}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Project Name */}
              <div className="md:col-span-2 space-y-2">
                <Label className={cn("text-sm font-medium flex items-center gap-2", errors.projectName && "text-destructive")}>
                  <Briefcase className="w-4 h-4 text-primary" />
                  Project Name
                </Label>
                <Input
                  placeholder="e.g. Personal Trainer (WorkDo)"
                  disabled={isGenerating}
                  value={reportData.projectName}
                  onChange={(e) => setReportData(prev => ({ ...prev, projectName: e.target.value }))}
                  className={cn("bg-background border-input", errors.projectName && "border-destructive")}
                />
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Task List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className={cn("text-sm font-semibold uppercase tracking-wider text-muted-foreground", errors.tasks && "text-destructive")}>
                  Task List
                </Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={isGenerating}
                  onClick={handleAddTask}
                  className="text-primary hover:text-primary hover:bg-primary/10 gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Task
                </Button>
              </div>

              <div className="space-y-3">
                {reportData.tasks.map((task, index) => (
                  <motion.div 
                    key={task.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-3 items-start"
                  >
                    <div className="flex-grow space-y-1">
                      <Input
                        placeholder={activeTab === 'in' ? "Task description" : "Completed task description"}
                        disabled={isGenerating}
                        value={task.description}
                        onChange={(e) => handleTaskChange(task.id, 'description', e.target.value)}
                        className="bg-background border-input"
                      />
                    </div>
                    <div className="w-32 space-y-1">
                      <Input
                        placeholder={activeTab === 'in' ? "ETA (e.g. 01:00)" : "Time (e.g. 01:30)"}
                        disabled={isGenerating}
                        value={task.time}
                        onChange={(e) => handleTaskChange(task.id, 'time', e.target.value)}
                        className="bg-background border-input text-center"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isGenerating}
                      onClick={() => handleRemoveTask(task.id)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
              {errors.tasks && <p className="text-xs text-destructive">{errors.tasks}</p>}
            </div>

            {/* Generate Button */}
            <div className="pt-4">
              <Button 
                onClick={generateReport}
                disabled={isGenerating}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-6 text-lg shadow-lg shadow-primary/20"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Clock className="w-5 h-5" />
                    </motion.div>
                    Refining & Generating...
                  </span>
                ) : (
                  <>
                    <FileText className="mr-2 w-5 h-5" />
                    Generate {activeTab === 'in' ? 'In Time' : 'Out Time'} Report
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Output Section */}
        <AnimatePresence>
          {generatedReport && (
            <motion.div
              id="output-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-4"
            >
              <Card className="border-success/30 bg-success/5 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-success/10 py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-success text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Generated Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="bg-background/80 rounded-lg p-4 border border-border/50 shadow-inner overflow-x-auto">
                    <pre className="report-output text-sm leading-relaxed text-foreground/90 font-mono">
                      {generatedReport}
                    </pre>
                  </div>
                  
                  <div className="mt-6">
                    <Button 
                      onClick={copyToClipboard}
                      className="w-full bg-success text-success-foreground hover:bg-success/90 font-bold py-6"
                    >
                      <Copy className="mr-2 w-5 h-5" />
                      Copy to Clipboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="text-center text-muted-foreground text-xs pb-8">
          <p>© {new Date().getFullYear()} Task Report Generator • Built for Developers</p>
        </footer>
      </div>

      {/* Sticky Generate Button for Mobile */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
        {!generatedReport && (
          <Button 
            onClick={generateReport}
            disabled={isGenerating}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-6 text-lg shadow-2xl shadow-primary/40"
          >
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>
        )}
      </div>
    </div>
  );
}
