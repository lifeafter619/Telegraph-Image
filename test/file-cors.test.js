const assert = require('assert');

describe('file proxy cross-origin headers', function () {
  let originalFetch;

  beforeEach(function () {
    originalFetch = global.fetch;
  });

  afterEach(function () {
    global.fetch = originalFetch;
  });

  async function getOnRequest() {
    return (await import('../functions/file/[id].js')).onRequest;
  }

  it('allows proxied files to be loaded and read cross-origin', async function () {
    const onRequest = await getOnRequest();
    global.fetch = async () => new Response('image-bytes', {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cross-Origin-Resource-Policy': 'same-origin'
      }
    });

    const res = await onRequest({
      request: new Request('https://img.example/file/example.png'),
      env: {},
      params: { id: 'example.png' }
    });

    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.strictEqual(res.headers.get('Cross-Origin-Resource-Policy'), 'cross-origin');
    assert.match(res.headers.get('Access-Control-Expose-Headers'), /Content-Type/);
  });

  it('answers CORS preflight without fetching the upstream file host', async function () {
    const onRequest = await getOnRequest();
    global.fetch = async () => {
      throw new Error('upstream should not be called for OPTIONS');
    };

    const res = await onRequest({
      request: new Request('https://img.example/file/example.png', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://consumer.example',
          'Access-Control-Request-Method': 'GET'
        }
      }),
      env: {},
      params: { id: 'example.png' }
    });

    assert.strictEqual(res.status, 204);
    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.match(res.headers.get('Access-Control-Allow-Methods'), /GET/);
  });
});
