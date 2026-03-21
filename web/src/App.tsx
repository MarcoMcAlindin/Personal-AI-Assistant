import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Root } from './components/cyan/Root';
import { TaskDashboard } from "./components/cyan/TaskDashboard";
import { SettingsView } from "./components/cyan/SettingsView";
import { AIFunctionsView } from "./components/cyan/AIFunctionsView";
import { AIChatView } from "./components/cyan/AIChatView";
import { AIAnalysisView } from "./components/cyan/AIAnalysisView";
import { AISearchView } from "./components/cyan/AISearchView";
import { AIDocumentView } from "./components/cyan/AIDocumentView";
import { AICodeView } from "./components/cyan/AICodeView";
import { AIImageView } from "./components/cyan/AIImageView";
import { AIVoiceView } from "./components/cyan/AIVoiceView";
import { AIVideoView } from "./components/cyan/AIVideoView";
import { NewsView } from "./components/cyan/NewsView";
import { HealthView } from "./components/cyan/HealthView";
import { MoneyView } from "./components/cyan/MoneyView";
import { EmailView } from "./components/cyan/EmailView";
import { CalendarView } from "./components/cyan/CalendarView";
import { TodoListView } from "./components/cyan/TodoListView";
import { InternetSpeedView } from "./components/cyan/InternetSpeedView";
import { JobsView } from "./components/cyan/JobsView";
import { IntegrationsView } from "./components/cyan/IntegrationsView";

const App = (): JSX.Element => {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Root />}>
            <Route index element={<TaskDashboard />} />
            
            <Route path="settings" element={<SettingsView />} />
            <Route path="ai-functions" element={<AIFunctionsView />} />
            <Route path="ai-chat" element={<AIChatView />} />
            <Route path="chat" element={<Navigate to="/ai-chat" replace />} />
            
            <Route path="ai-analysis" element={<AIAnalysisView />} />
            <Route path="ai-search" element={<AISearchView />} />
            <Route path="ai-document" element={<AIDocumentView />} />
            <Route path="ai-code" element={<AICodeView />} />
            <Route path="ai-image" element={<AIImageView />} />
            <Route path="ai-voice" element={<AIVoiceView />} />
            <Route path="ai-video" element={<AIVideoView />} />
            
            <Route path="news" element={<NewsView />} />
            <Route path="feeds" element={<Navigate to="/news" replace />} />
            
            <Route path="health" element={<HealthView />} />
            <Route path="money" element={<MoneyView />} />
            <Route path="email" element={<EmailView />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="planner" element={<Navigate to="/" replace />} />
            
            <Route path="todolist" element={<TodoListView />} />
            <Route path="internet-speed" element={<InternetSpeedView />} />
            <Route path="jobs" element={<JobsView />} />
            <Route path="integrations" element={<IntegrationsView />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
