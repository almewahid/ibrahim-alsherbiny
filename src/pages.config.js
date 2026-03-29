/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminPanel from './pages/AdminPanel';
import Analytics from './pages/Analytics';
import AudioSetupGuide from './pages/AudioSetupGuide';
import BroadcastArchive from './pages/BroadcastArchive';
import BroadcastCoverEditor from './pages/BroadcastCoverEditor';
import ContentManager from './pages/ContentManager';
import CoversGallery from './pages/CoversGallery';
import CreateBroadcast from './pages/CreateBroadcast';
import DigitalLibrary from './pages/DigitalLibrary';
import DirectMessages from './pages/DirectMessages';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import Library from './pages/Library';
import ListenBroadcast from './pages/ListenBroadcast';
import MorningAdhkar from './pages/MorningAdhkar';
import MyBroadcasts from './pages/MyBroadcasts';
import PublicBroadcasts from './pages/PublicBroadcasts';
import QuizManager from './pages/QuizManager';
import RecordingDetails from './pages/RecordingDetails';
import Recordings from './pages/Recordings';
import ScheduleBroadcast from './pages/ScheduleBroadcast';
import SeriesManager from './pages/SeriesManager';
import SeriesPublic from './pages/SeriesPublic';
import UserProfile from './pages/UserProfile';
import WaitingRoom from './pages/WaitingRoom';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminPanel": AdminPanel,
    "Analytics": Analytics,
    "AudioSetupGuide": AudioSetupGuide,
    "BroadcastArchive": BroadcastArchive,
    "BroadcastCoverEditor": BroadcastCoverEditor,
    "ContentManager": ContentManager,
    "CoversGallery": CoversGallery,
    "CreateBroadcast": CreateBroadcast,
    "DigitalLibrary": DigitalLibrary,
    "DirectMessages": DirectMessages,
    "Home": Home,
    "Leaderboard": Leaderboard,
    "Library": Library,
    "ListenBroadcast": ListenBroadcast,
    "MorningAdhkar": MorningAdhkar,
    "MyBroadcasts": MyBroadcasts,
    "PublicBroadcasts": PublicBroadcasts,
    "QuizManager": QuizManager,
    "RecordingDetails": RecordingDetails,
    "Recordings": Recordings,
    "ScheduleBroadcast": ScheduleBroadcast,
    "SeriesManager": SeriesManager,
    "SeriesPublic": SeriesPublic,
    "UserProfile": UserProfile,
    "WaitingRoom": WaitingRoom,
}

export const pagesConfig = {
    mainPage: "CreateBroadcast",
    Pages: PAGES,
    Layout: __Layout,
};