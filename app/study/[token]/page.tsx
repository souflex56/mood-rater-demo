import StudyClient from '../../components/StudyClient';
export default async function StudyPage({params}:{params:Promise<{token:string}>}){const {token}=await params;return <StudyClient token={token}/>;}
