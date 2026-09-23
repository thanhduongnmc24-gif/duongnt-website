const RENDER_ORIGIN = "duongnt-website.onrender.com";

export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);
    const originUrl = new URL(request.url);
    originUrl.protocol = "https:";
    originUrl.hostname = RENDER_ORIGIN;
    originUrl.port = "";

    const originRequest = new Request(originUrl, request);
    originRequest.headers.set("x-forwarded-host", incomingUrl.host);
    originRequest.headers.set("x-congdoan-proxy", "1");

    return fetch(originRequest, { redirect: "manual" });
  },
};
