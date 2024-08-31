chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getVideoTitle") {
    const result = document.querySelector("#title h1")?.innerText?.trim();
    sendResponse({ result: result });
  }
});
