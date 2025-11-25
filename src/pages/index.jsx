import Layout from "./Layout.jsx";

import Home from "./Home";

import CreateBroadcast from "./CreateBroadcast";

import ListenBroadcast from "./ListenBroadcast";

import MyBroadcasts from "./MyBroadcasts";

import AudioSetupGuide from "./AudioSetupGuide";

import Recordings from "./Recordings";

import PublicBroadcasts from "./PublicBroadcasts";

import DirectMessages from "./DirectMessages";

import BroadcastCoverEditor from "./BroadcastCoverEditor";

import AdminPanel from "./AdminPanel";

import MorningAdhkar from "./MorningAdhkar";

import WaitingRoom from "./WaitingRoom";

import ScheduleBroadcast from "./ScheduleBroadcast";

import CoversGallery from "./CoversGallery";

import SeriesManager from "./SeriesManager";

import SeriesPublic from "./SeriesPublic";

import Analytics from "./Analytics";

import UserProfile from "./UserProfile";

import QuizManager from "./QuizManager";

import TakeQuiz from "./TakeQuiz";

import Leaderboard from "./Leaderboard";

import Quizzes from "./Quizzes";

import QuizResults from "./QuizResults";

import RecordingDetails from "./RecordingDetails";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    CreateBroadcast: CreateBroadcast,
    
    ListenBroadcast: ListenBroadcast,
    
    MyBroadcasts: MyBroadcasts,
    
    AudioSetupGuide: AudioSetupGuide,
    
    Recordings: Recordings,
    
    PublicBroadcasts: PublicBroadcasts,
    
    DirectMessages: DirectMessages,
    
    BroadcastCoverEditor: BroadcastCoverEditor,
    
    AdminPanel: AdminPanel,
    
    MorningAdhkar: MorningAdhkar,
    
    WaitingRoom: WaitingRoom,
    
    ScheduleBroadcast: ScheduleBroadcast,
    
    CoversGallery: CoversGallery,
    
    SeriesManager: SeriesManager,
    
    SeriesPublic: SeriesPublic,
    
    Analytics: Analytics,
    
    UserProfile: UserProfile,
    
    QuizManager: QuizManager,
    
    TakeQuiz: TakeQuiz,
    
    Leaderboard: Leaderboard,
    
    Quizzes: Quizzes,
    
    QuizResults: QuizResults,
    
    RecordingDetails: RecordingDetails,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Home />} />
                
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/CreateBroadcast" element={<CreateBroadcast />} />
                
                <Route path="/ListenBroadcast" element={<ListenBroadcast />} />
                
                <Route path="/MyBroadcasts" element={<MyBroadcasts />} />
                
                <Route path="/AudioSetupGuide" element={<AudioSetupGuide />} />
                
                <Route path="/Recordings" element={<Recordings />} />
                
                <Route path="/PublicBroadcasts" element={<PublicBroadcasts />} />
                
                <Route path="/DirectMessages" element={<DirectMessages />} />
                
                <Route path="/BroadcastCoverEditor" element={<BroadcastCoverEditor />} />
                
                <Route path="/AdminPanel" element={<AdminPanel />} />
                
                <Route path="/MorningAdhkar" element={<MorningAdhkar />} />
                
                <Route path="/WaitingRoom" element={<WaitingRoom />} />
                
                <Route path="/ScheduleBroadcast" element={<ScheduleBroadcast />} />
                
                <Route path="/CoversGallery" element={<CoversGallery />} />
                
                <Route path="/SeriesManager" element={<SeriesManager />} />
                
                <Route path="/SeriesPublic" element={<SeriesPublic />} />
                
                <Route path="/Analytics" element={<Analytics />} />
                
                <Route path="/UserProfile" element={<UserProfile />} />
                
                <Route path="/QuizManager" element={<QuizManager />} />
                
                <Route path="/TakeQuiz" element={<TakeQuiz />} />
                
                <Route path="/Leaderboard" element={<Leaderboard />} />
                
                <Route path="/Quizzes" element={<Quizzes />} />
                
                <Route path="/QuizResults" element={<QuizResults />} />
                
                <Route path="/RecordingDetails" element={<RecordingDetails />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}