import StudyClient from '../../components/StudyClient';
import project from '@/config/project.json';
import ResearchUnavailable from '../../components/ResearchUnavailable';
export default async function StudyPage({params}:{params:Promise<{token:string}>}){if(!project.researchEnabled)return <ResearchUnavailable/>;const {token}=await params;return <StudyClient token={token}/>;}
