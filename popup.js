document.addEventListener("DOMContentLoaded", () => {
    const mediaList = document.getElementById("media-list");
    const clearButton = document.getElementById("clear-btn");

    function showToast(message) {
        const toast = document.getElementById("toast");
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, 1000); // Hide the toast after 1 second
    }

    // Function to generate a low-resolution thumbnail from a partial video load
    const generateThumbnailFromPartial = (url, callback) => {
        fetch(url, {
            headers: {
                Range: "bytes=0-1000000" // Request the first 1MB of the video
            }
        })
            .then(response => response.blob())
            .then(blob => {
                const video = document.createElement("video");
                video.src = URL.createObjectURL(blob);
                video.muted = true; // Ensure video can autoplay
                video.style.display = "none";
                document.body.appendChild(video);

                video.addEventListener("loadeddata", () => {
                    video.currentTime = 0.5; // Seek to 0.5 seconds for a frame
                });

                video.addEventListener("seeked", () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = 160; // Low resolution width
                    canvas.height = 90; // Low resolution height
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    callback(canvas.toDataURL()); // Return the thumbnail as base64
                    document.body.removeChild(video); // Clean up
                });
            })
            .catch(err => {
                console.error("Failed to load partial video:", err);
                callback("video.svg"); // Fallback to default icon in case of error
            });
    };

    // Function to fetch file size using HEAD request
    const getFileSize = async (url) => {
        try {
            const response = await fetch(url, { method: "HEAD" });
            const contentLength = response.headers.get("Content-Length");
            if (contentLength) {
                return (contentLength / (1024 * 1024)).toFixed(2); // Convert bytes to MB
            }
            return null; // Return null if Content-Length is unavailable
        } catch (error) {
            console.error("Failed to fetch file size:", error);
            return null;
        }
    };

    const loadMediaFiles = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTabId = tabs[0].id;

            chrome.storage.local.get("tabFragmentLinks", (data) => {
                const tabFragmentLinks = data.tabFragmentLinks || {};
                const urls = tabFragmentLinks[activeTabId] || [];

                mediaList.innerHTML = "";

                if (urls.length > 0) {
                    urls.forEach((url, index) => {
                        const listItem = document.createElement("li");
                        listItem.className = "media-item";
                        listItem.setAttribute("data-url", url);

                        const fileName = `screen-${index + 1}.mp4`;

                        // Generate the thumbnail and fetch file size
                        generateThumbnailFromPartial(url, async (thumbnail) => {
                            const fileSize = await getFileSize(url); // Fetch file size

                            let sizeText = fileSize ? `${fileSize} MB` : "Size unavailable";
                            if (fileSize > 1024) {
                                sizeText = `${(fileSize / 1024).toFixed(2)} GB`;
                            }

                            listItem.innerHTML = `
                                <div>
                                    <img class="media-thumb" src="${thumbnail}" alt="Media Thumbnail">
                                </div>
                                <div class="media-details">
                                    <p class="media-name">${fileName}</p>
                                    <p class="media-size">${sizeText}</p>
                                </div>
                                <div class="delete-icon">
                                    <img src="delete.svg" alt="Delete Icon" width="18" height="18">
                                </div>
                            `;

                            listItem.querySelector(".delete-icon img").addEventListener("click", (event) => {
                                event.stopPropagation(); // Prevent triggering the download event
                                const newUrls = urls.filter((item, idx) => idx !== index);
                                tabFragmentLinks[activeTabId] = newUrls;
                                chrome.storage.local.set({ tabFragmentLinks }, () => {
                                    showToast("Media file deleted!");
                                    loadMediaFiles(); // Reload the updated list
                                });
                            });

                            listItem.addEventListener('click', () => {
                                chrome.downloads.download(
                                    { url: url, filename: fileName },
                                    (downloadId) => {
                                        showToast(downloadId ? "Download started!" : "Failed to start download.");
                                    }
                                );
                            });

                            mediaList.appendChild(listItem);
                        });
                    });
                } else {
                    mediaList.innerHTML = "<li class='no-media'>No media files found yet.</li>";
                }
            });
        });
    };

    loadMediaFiles();

    clearButton.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTabId = tabs[0].id;

            chrome.storage.local.get("tabFragmentLinks", (data) => {
                const tabFragmentLinks = data.tabFragmentLinks || {};
                tabFragmentLinks[activeTabId] = [];
                chrome.storage.local.set({ tabFragmentLinks }, () => {
                    mediaList.innerHTML = "<li class='no-media'>No media files found yet.</li>";
                    showToast("All media files cleared!");
                });
            });
        });
    });
});
