document.addEventListener("DOMContentLoaded", () => {
  const videoName = document.getElementById("videoName");
  const saveButton = document.getElementById("saveBookmark");
  const bookmarksContainer = document.getElementById("bookmarks");
  const searchInput = document.getElementById("search");

  updateUi();

  chrome.tabs.onActivated.addListener(() => updateUi());
  chrome.tabs.onUpdated.addListener(() => updateUi());

  // Load bookmarks when popup is opened
  chrome.storage.sync.get(["bookmarks"], (result) => {
    const bookmarks = result.bookmarks || {};
    displayBookmarks(bookmarks);
  });

  // Save the current video and timestamp
  saveButton.addEventListener("click", () => {
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
  });

  searchInput.addEventListener("input", (event) => {
    chrome.storage.sync.get(["bookmarks"], (result) => {
      const bookmarks = result.bookmarks || {};
      if (!searchInput.value) {
        displayBookmarks(bookmarks);
      } else {
        const filteredBookMarks = Object.keys(bookmarks)
          .map((id) => [id, bookmarks[id]])
          .filter(([id, bookmark]) =>
            bookmark.title
              .toLowerCase()
              .includes(searchInput.value.toLowerCase())
          )
          .reduce((acc, curr) => {
            acc[curr[0]] = curr[1];
            return acc;
          }, {});
        console.log(filteredBookMarks);
        displayBookmarks(filteredBookMarks);
      }
    });
  });

  function updateUi() {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      const url = new URL(tab.url);
      if (
        url.origin === "https://www.youtube.com" &&
        url.pathname === "/watch"
      ) {
        saveButton.disabled = false;
        videoName.disabled = false;
        videoName.value = tab.title;
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
      bookmarkElement.className = "list-group-item border-0 p-0 mb-3 nav-item";

      const titlDiv = document.createElement("a");
      titlDiv.className = "d-block mb-1 fw-bold nav-link p-0 m-0";
      titlDiv.textContent =
        bookmark.title + " - " + formatTimeStamp(bookmark.timestamp);
      titlDiv.href = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(
        bookmark.timestamp
      )}s`;
      titlDiv.target = "_blank";

      const removeButton = document.createElement("button");
      removeButton.className = "btn btn-sm btn-danger rounded-pill";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        removeBookmark(videoId);
      });

      bookmarkElement.appendChild(titlDiv);
      bookmarkElement.appendChild(removeButton);
      bookmarksContainer.appendChild(bookmarkElement);
    }
  }

  // Remove a bookmark
  function removeBookmark(videoId) {
    chrome.storage.sync.get(["bookmarks"], (result) => {
      const bookmarks = result.bookmarks || {};
      delete bookmarks[videoId];

      chrome.storage.sync.set({ bookmarks }, () => {
        displayBookmarks(bookmarks);
      });
    });
  }
});
