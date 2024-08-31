document.addEventListener("DOMContentLoaded", () => {
  const videoName = document.getElementById("videoName");
  const saveButton = document.getElementById("saveBookmark");
  const bookmarksContainer = document.getElementById("bookmarks");
  const searchInput = document.getElementById("search");

  displayAllBookmarks();
  updateUi();

  // setup event listeners
  searchInput.addEventListener("input", () => filterBookmarks());
  saveButton.addEventListener("click", () => addBookmark());
  chrome.tabs.onActivated.addListener(() => updateUi());
  chrome.tabs.onUpdated.addListener(() => updateUi());

  function displayAllBookmarks() {
    chrome.storage.sync.get(["bookmarks"], (result) => {
      const bookmarks = result.bookmarks || {};
      displayBookmarks(bookmarks);
    });
  }

  function addBookmark() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const videoId = new URL(tabs[0].url).searchParams.get("v");

      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          function: () => document.querySelector("video")?.currentTime,
        },
        (results) => {
          const timestamp = results[0].result;
          saveBookmark(videoId, videoName.value, timestamp);
        }
      );
    });
  }

  function filterBookmarks() {
    chrome.storage.sync.get(["bookmarks"], (result) => {
      const bookmarks = result.bookmarks || {};
      if (!searchInput.value) {
        displayBookmarks(bookmarks);
      } else {
        const filteredBookMarks = Object.keys(bookmarks)
          .map((id) => [id, bookmarks[id]])
          .filter(([_, bookmark]) =>
            bookmark.title
              .toLowerCase()
              .includes(searchInput.value.toLowerCase())
          )
          .reduce((acc, curr) => {
            acc[curr[0]] = curr[1];
            return acc;
          }, {});
        displayBookmarks(filteredBookMarks);
      }
    });
  }

  function updateUi() {
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      const url = new URL(tab.url);
      if (
        url.origin === "https://www.youtube.com" &&
        url.pathname === "/watch"
      ) {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: "getVideoTitle",
        });
        saveButton.disabled = false;
        videoName.disabled = false;
        videoName.value = response.result;
      } else {
        saveButton.disabled = true;
        videoName.disabled = true;
        videoName.value = " ";
      }
    });
  }

  function saveBookmark(videoId, title, timestamp) {
    chrome.storage.sync.get(["bookmarks"], (result) => {
      const bookmarks = result.bookmarks || {};
      bookmarks[videoId] = { title, timestamp };

      chrome.storage.sync.set({ bookmarks }, () => displayBookmarks(bookmarks));
    });
  }

  function formatTimeStamp(timestamp) {
    const hours = Math.floor(timestamp / 3600);
    const minutes = Math.floor((timestamp % 3600) / 60);
    const secs = Math.floor(timestamp % 60);

    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":");
  }

  function displayBookmarks(bookmarks) {
    bookmarksContainer.innerHTML = "";

    for (const [videoId, bookmark] of Object.entries(bookmarks)) {
      const bookmarkElement = document.createElement("li");
      bookmarkElement.className =
        "list-group-item border-0 p-0 mb-3 nav-item d-flex";

      const linkContainer = document.createElement("a");
      linkContainer.href = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(
        bookmark.timestamp
      )}s`;
      linkContainer.target = "_blank";
      linkContainer.className = "d-block mb-1 nav-link p-0 m-0";

      const titleDiv = document.createElement("div");
      titleDiv.textContent = bookmark.title + " - ";
      titleDiv.href = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(
        bookmark.timestamp
      )}s`;
      titleDiv.target = "_blank";

      const timestampDiv = document.createElement("div");
      timestampDiv.className = "badge bg-light text-dark";
      timestampDiv.textContent = formatTimeStamp(bookmark.timestamp);

      const removeContainer = document.createElement("div");
      removeContainer.className = "d-flex flex-row justify-content-center ps-1";

      const removeButton = document.createElement("button");
      removeButton.className =
        "btn btn-sm btn-outline-danger bi bi-x-lg m-auto rounded-pill";
      removeButton.addEventListener("click", () => {
        removeBookmark(videoId);
      });

      linkContainer.appendChild(titleDiv);
      linkContainer.appendChild(timestampDiv);
      removeContainer.appendChild(removeButton);
      bookmarkElement.appendChild(linkContainer);
      bookmarkElement.appendChild(removeContainer);
      bookmarksContainer.appendChild(bookmarkElement);
    }
  }

  function removeBookmark(videoId) {
    chrome.storage.sync.get(["bookmarks"], (result) => {
      const bookmarks = result.bookmarks || {};
      delete bookmarks[videoId];

      chrome.storage.sync.set({ bookmarks }, () => displayBookmarks(bookmarks));
    });
  }
});
