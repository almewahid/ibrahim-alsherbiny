import Home from './pages/Home';
import CreateBroadcast from './pages/CreateBroadcast';
import ListenBroadcast from './pages/ListenBroadcast';
import MyBroadcasts from './pages/MyBroadcasts';
import AudioSetupGuide from './pages/AudioSetupGuide';
import Recordings from './pages/Recordings';
import PublicBroadcasts from './pages/PublicBroadcasts';
import DirectMessages from './pages/DirectMessages';
import BroadcastCoverEditor from './pages/BroadcastCoverEditor';
import AdminPanel from './pages/AdminPanel';
import MorningAdhkar from './pages/MorningAdhkar';
import WaitingRoom from './pages/WaitingRoom';
import ScheduleBroadcast from './pages/ScheduleBroadcast';
import CoversGallery from './pages/CoversGallery';
import SeriesManager from './pages/SeriesManager';
import SeriesPublic from './pages/SeriesPublic';
import Analytics from './pages/Analytics';
import UserProfile from './pages/UserProfile';
import Quizzes from './pages/Quizzes';
import TakeQuiz from './pages/TakeQuiz';
import QuizManager from './pages/QuizManager';
import RecordingDetail from './pages/RecordingDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "CreateBroadcast": CreateBroadcast,
    "ListenBroadcast": ListenBroadcast,
    "MyBroadcasts": MyBroadcasts,
    "AudioSetupGuide": AudioSetupGuide,
    "Recordings": Recordings,
    "PublicBroadcasts": PublicBroadcasts,
    "DirectMessages": DirectMessages,
    "BroadcastCoverEditor": BroadcastCoverEditor,
    "AdminPanel": AdminPanel,
    "MorningAdhkar": MorningAdhkar,
    "WaitingRoom": WaitingRoom,
    "ScheduleBroadcast": ScheduleBroadcast,
    "CoversGallery": CoversGallery,
    "SeriesManager": SeriesManager,
    "SeriesPublic": SeriesPublic,
    "Analytics": Analytics,
    "UserProfile": UserProfile,
    "Quizzes": Quizzes,
    "TakeQuiz": TakeQuiz,
    "QuizManager": QuizManager,
    "RecordingDetail": RecordingDetail,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};