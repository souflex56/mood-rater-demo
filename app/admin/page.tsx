import AdminDashboard from '../components/AdminDashboard';
import project from '@/config/project.json';
import ResearchUnavailable from '../components/ResearchUnavailable';
export default function AdminPage(){return project.researchEnabled ? <AdminDashboard/> : <ResearchUnavailable/>;}
