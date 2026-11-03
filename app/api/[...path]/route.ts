import project from '@/config/project.json';
import { disabledResearchResponse } from '@/lib/server/demo-api';
import { handleResearchRequest } from '../../../lib/server/research-adapter';

export const dynamic = 'force-dynamic';

async function handle(request: Request): Promise<Response> {
  return project.researchEnabled ? handleResearchRequest(request) : disabledResearchResponse(request);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as HEAD };
