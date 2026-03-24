import { Page, Request, Response } from 'playwright';
import { NetworkCall } from '../../reporters/types';

export function setupNetworkInterceptor(page: Page): NetworkCall[] {
  const calls: NetworkCall[] = [];

  page.on('request', (request: Request) => {
    if (['xhr', 'fetch'].includes(request.resourceType())) {
      let requestBody: unknown;
      try {
        const postData = request.postData();
        requestBody = postData ? JSON.parse(postData) : undefined;
      } catch {
        requestBody = request.postData();
      }
      calls.push({ method: request.method(), url: request.url(), requestBody });
    }
  });

  page.on('response', async (response: Response) => {
    const call = calls.find(c => c.url === response.url());
    if (call) {
      call.status = response.status();
      try { call.responseBody = await response.json(); } catch { /* not JSON */ }
    }
  });

  return calls;
}
